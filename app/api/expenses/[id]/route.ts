import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, notFound, serverError } from "@/lib/api";

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/expenses/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) return notFound("Expense not found");

  try {
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return serverError("Could not delete the expense");
  }
}
