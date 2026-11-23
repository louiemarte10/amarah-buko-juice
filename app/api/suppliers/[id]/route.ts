import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest, notFound } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/suppliers/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return badRequest("Supplier name cannot be empty");
    data.name = name;
  }
  if (body.contact !== undefined)
    data.contact = body.contact ? String(body.contact).trim() : null;
  if (body.phone !== undefined)
    data.phone = body.phone ? String(body.phone).trim() : null;
  if (body.email !== undefined)
    data.email = body.email ? String(body.email).trim() : null;

  try {
    const supplier = await prisma.supplier.update({ where: { id }, data });
    return NextResponse.json({ supplier });
  } catch {
    return badRequest("Could not update supplier (name may be taken)");
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/suppliers/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) return notFound("Supplier not found");

  await prisma.supplier.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
