import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest } from "@/lib/api";
import { pesosToCents } from "@/lib/money";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  // `active=true` (legacy, used by POS) or `status=active|archived|all`
  const status = searchParams.get("status");
  const activeOnly = searchParams.get("active") === "true";
  const activeFilter =
    activeOnly || status === "active"
      ? { active: true }
      : status === "archived"
        ? { active: false }
        : {};

  const products = await prisma.product.findMany({
    where: {
      ...activeFilter,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      category: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ products });
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
  if (!name) return badRequest("Product name is required");

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) {
    return badRequest("A valid price is required");
  }

  const sku = body.sku ? String(body.sku).trim() : null;
  if (sku) {
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) return badRequest("A product with that SKU already exists");
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        priceCents: pesosToCents(price),
        costCents: pesosToCents(Number(body.cost ?? 0)),
        stock: Math.max(0, Math.trunc(Number(body.stock ?? 0))),
        lowStockThreshold: Math.max(
          0,
          Math.trunc(Number(body.lowStockThreshold ?? 10)),
        ),
        unit: body.unit ? String(body.unit).trim() : "pc",
        active: body.active === undefined ? true : Boolean(body.active),
        categoryId: body.categoryId ? String(body.categoryId) : null,
        supplierId: body.supplierId ? String(body.supplierId) : null,
      },
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return badRequest("Could not create product. Check the category/supplier.");
  }
}
