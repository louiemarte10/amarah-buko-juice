import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest } from "@/lib/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }
  const name = body.name?.trim();
  if (!name) return badRequest("Category name is required");

  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) return badRequest("That category already exists");

  const category = await prisma.category.create({ data: { name } });
  return NextResponse.json({ category }, { status: 201 });
}
