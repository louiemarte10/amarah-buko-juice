import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest } from "@/lib/api";
import { pesosToCents } from "@/lib/money";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const activeFilter =
    status === "archived"
      ? { active: false }
      : status === "all"
        ? {}
        : { active: true };

  const rawMaterials = await prisma.rawMaterial.findMany({
    where: activeFilter,
    include: {
      supplier: { select: { id: true, name: true } },
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ rawMaterials });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const name = String(body.name ?? "").trim();
  if (!name) return badRequest("Raw material name is required");

  const existing = await prisma.rawMaterial.findUnique({ where: { name } });
  if (existing) return badRequest("A raw material with that name already exists");

  try {
    const rawMaterial = await prisma.rawMaterial.create({
      data: {
        name,
        unit: body.unit ? String(body.unit).trim() : "pc",
        stock: Math.max(0, Number(body.stock ?? 0)),
        lowStockThreshold: Math.max(0, Number(body.lowStockThreshold ?? 0)),
        costCents: pesosToCents(Number(body.cost ?? 0)),
        capitalCents: pesosToCents(Math.max(0, Number(body.capital ?? 0))),
        active: body.active === undefined ? true : Boolean(body.active),
        supplierId: body.supplierId ? String(body.supplierId) : null,
      },
    });
    return NextResponse.json({ rawMaterial }, { status: 201 });
  } catch {
    return badRequest("Could not create raw material. Check the supplier.");
  }
}
