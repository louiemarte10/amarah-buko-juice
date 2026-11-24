import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest, notFound } from "@/lib/api";
import { pesosToCents } from "@/lib/money";

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/raw-materials/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  const existing = await prisma.rawMaterial.findUnique({ where: { id } });
  if (!existing) return notFound("Raw material not found");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return badRequest("Name cannot be empty");
    if (name !== existing.name) {
      const dupe = await prisma.rawMaterial.findUnique({ where: { name } });
      if (dupe) return badRequest("A raw material with that name already exists");
    }
    data.name = name;
  }
  if (body.unit !== undefined) data.unit = String(body.unit).trim() || "pc";
  // `stock` sets an absolute value; `addStock` adds to the current stock (restock).
  if (body.stock !== undefined) data.stock = Math.max(0, Number(body.stock));
  if (body.addStock !== undefined) {
    const add = Number(body.addStock);
    if (Number.isFinite(add)) data.stock = Math.max(0, existing.stock + add);
  }
  if (body.lowStockThreshold !== undefined)
    data.lowStockThreshold = Math.max(0, Number(body.lowStockThreshold));
  if (body.cost !== undefined) data.costCents = pesosToCents(Number(body.cost));
  if (body.capital !== undefined)
    data.capitalCents = pesosToCents(Math.max(0, Number(body.capital)));
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.supplierId !== undefined)
    data.supplierId = body.supplierId ? String(body.supplierId) : null;

  try {
    const rawMaterial = await prisma.rawMaterial.update({ where: { id }, data });
    return NextResponse.json({ rawMaterial });
  } catch {
    return badRequest("Could not update raw material");
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/raw-materials/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  const existing = await prisma.rawMaterial.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) return notFound("Raw material not found");

  // If products are linked, archive instead of deleting so those products keep
  // working (their link is set null only on a real delete).
  if (existing._count.products > 0) {
    return badRequest(
      `${existing._count.products} product(s) still use this raw material. Unlink them first or archive it instead.`,
    );
  }
  await prisma.rawMaterial.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
