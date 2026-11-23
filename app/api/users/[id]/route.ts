import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { unauthorized, forbidden, badRequest, notFound } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/users/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return notFound("User not found");

  let body: {
    name?: string;
    staffRoleId?: string;
    active?: boolean;
    password?: string;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return badRequest("Name cannot be empty");
    data.name = name;
  }
  if (body.staffRoleId !== undefined) {
    const role = await prisma.staffRole.findUnique({
      where: { id: body.staffRoleId },
    });
    if (!role) return badRequest("That role no longer exists");
    data.staffRoleId = role.id;
    data.role = role.isAdmin ? "ADMIN" : "CASHIER"; // keep legacy tier in sync
  }
  if (body.active !== undefined) {
    if (target.id === user.sub && body.active === false) {
      return badRequest("You cannot deactivate your own account");
    }
    data.active = Boolean(body.active);
  }
  if (body.password !== undefined) {
    if (body.password.length < 6)
      return badRequest("Password must be at least 6 characters");
    data.passwordHash = await hashPassword(body.password);
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      staffRoleId: true,
      staffRole: { select: { id: true, name: true, isAdmin: true } },
    },
  });
  return NextResponse.json({ user: updated });
}
