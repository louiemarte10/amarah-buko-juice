import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { unauthorized, forbidden, badRequest } from "@/lib/api";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  staffRoleId: true,
  staffRole: { select: { id: true, name: true, isAdmin: true } },
} as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  let body: {
    name?: string;
    email?: string;
    password?: string;
    staffRoleId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!name || !email || !password) {
    return badRequest("Name, email and password are required");
  }
  if (password.length < 6) {
    return badRequest("Password must be at least 6 characters");
  }

  // Resolve the chosen role (or fall back to a cashier-level role).
  let staffRole = body.staffRoleId
    ? await prisma.staffRole.findUnique({ where: { id: body.staffRoleId } })
    : null;
  if (!staffRole) {
    staffRole =
      (await prisma.staffRole.findFirst({ where: { isAdmin: false } })) ??
      (await prisma.staffRole.findFirst());
  }
  if (!staffRole) return badRequest("No roles exist yet. Create a role first.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return badRequest("A user with that email already exists");

  const created = await prisma.user.create({
    data: {
      name,
      email,
      role: staffRole.isAdmin ? "ADMIN" : "CASHIER",
      staffRoleId: staffRole.id,
      passwordHash: await hashPassword(password),
    },
    select: userSelect,
  });
  return NextResponse.json({ user: created }, { status: 201 });
}
