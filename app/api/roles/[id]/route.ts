import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest, notFound } from "@/lib/api";

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/roles/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  const role = await prisma.staffRole.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!role) return notFound("Role not found");
  if (role._count.users > 0) {
    return badRequest(
      "This role is assigned to staff. Reassign them before deleting it.",
    );
  }

  await prisma.staffRole.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
