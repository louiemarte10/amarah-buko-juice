import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest, notFound } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/categories/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }
  const name = body.name?.trim();
  if (!name) return badRequest("Category name is required");

  try {
    const category = await prisma.category.update({ where: { id }, data: { name } });
    return NextResponse.json({ category });
  } catch {
    return badRequest("Could not rename category (name may be taken)");
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/categories/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return notFound("Category not found");

  // Products keep existing; their categoryId is set to null (onDelete: SetNull).
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
