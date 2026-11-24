import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest, notFound } from "@/lib/api";
import { pesosToCents } from "@/lib/money";

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/products/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return notFound("Product not found");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return badRequest("Product name cannot be empty");
    data.name = name;
  }
  if (body.sku !== undefined) {
    const sku = body.sku ? String(body.sku).trim() : null;
    if (sku && sku !== existing.sku) {
      const dupe = await prisma.product.findUnique({ where: { sku } });
      if (dupe) return badRequest("A product with that SKU already exists");
    }
    data.sku = sku;
  }
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0)
      return badRequest("A valid price is required");
    data.priceCents = pesosToCents(price);
  }
  if (body.cost !== undefined) data.costCents = pesosToCents(Number(body.cost));
  if (body.lowStockThreshold !== undefined)
    data.lowStockThreshold = Math.max(0, Math.trunc(Number(body.lowStockThreshold)));
  if (body.unit !== undefined) data.unit = String(body.unit).trim() || "pc";
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.categoryId !== undefined)
    data.categoryId = body.categoryId ? String(body.categoryId) : null;
  if (body.supplierId !== undefined)
    data.supplierId = body.supplierId ? String(body.supplierId) : null;

  // Raw-material link. When clearing it, fall back to own-stock tracking.
  let rawLinked = existing.rawMaterialId != null;
  if (body.rawMaterialId !== undefined) {
    const rawMaterialId = body.rawMaterialId ? String(body.rawMaterialId) : null;
    data.rawMaterialId = rawMaterialId;
    rawLinked = rawMaterialId != null;
    if (!rawMaterialId) data.rawUsage = 1;
  }
  if (body.rawUsage !== undefined && rawLinked) {
    data.rawUsage = Math.max(0.0001, Number(body.rawUsage) || 1);
  }

  // `stock` only applies to own-stock products; a raw-linked product derives
  // its availability from the raw item, so ignore any stock sent for it.
  if (body.stock !== undefined && !rawLinked)
    data.stock = Math.max(0, Math.trunc(Number(body.stock)));
  if (rawLinked) data.stock = 0;

  try {
    const product = await prisma.product.update({ where: { id }, data });
    return NextResponse.json({ product });
  } catch {
    return badRequest("Could not update product");
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/products/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { saleItems: true } } },
  });
  if (!existing) return notFound("Product not found");

  // If the product has sales history, soft-delete (deactivate) to preserve
  // records; otherwise remove it entirely.
  if (existing._count.saleItems > 0) {
    await prisma.product.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true, softDeleted: true });
  }
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true, softDeleted: false });
}
