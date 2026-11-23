import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { badRequest } from "@/lib/api";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return badRequest("Email and password are required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { staffRole: true },
  });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const isAdmin = user.staffRole ? user.staffRole.isAdmin : user.role === "ADMIN";
  const roleName =
    user.staffRole?.name ?? (user.role === "ADMIN" ? "Administrator" : "Cashier");

  await setSessionCookie({
    sub: user.id,
    name: user.name,
    role: isAdmin ? "ADMIN" : "CASHIER",
    roleName,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: isAdmin ? "ADMIN" : "CASHIER",
      roleName,
    },
  });
}
