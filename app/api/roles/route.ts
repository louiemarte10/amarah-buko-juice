import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest } from "@/lib/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const roles = await prisma.staffRole.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: [{ isAdmin: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ roles });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  let body: { name?: string; isAdmin?: boolean };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const name = body.name?.trim();
  if (!name) return badRequest("Role name is required");

  const existing = await prisma.staffRole.findUnique({ where: { name } });
  if (existing) return badRequest("That role already exists");

  const role = await prisma.staffRole.create({
    data: { name, isAdmin: Boolean(body.isAdmin) },
  });
  return NextResponse.json({ role }, { status: 201 });
}
