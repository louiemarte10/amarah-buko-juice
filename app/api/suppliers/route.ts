import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest } from "@/lib/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ suppliers });
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
  if (!name) return badRequest("Supplier name is required");

  const existing = await prisma.supplier.findUnique({ where: { name } });
  if (existing) return badRequest("That supplier already exists");

  const supplier = await prisma.supplier.create({
    data: {
      name,
      contact: body.contact ? String(body.contact).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      email: body.email ? String(body.email).trim() : null,
    },
  });
  return NextResponse.json({ supplier }, { status: 201 });
}
