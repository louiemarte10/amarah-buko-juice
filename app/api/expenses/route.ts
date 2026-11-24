import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest } from "@/lib/api";
import { pesosToCents } from "@/lib/money";
import { manilaDayStartUTC, manilaRangeUTC } from "@/lib/date";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const where = from && to ? { date: manilaRangeUTC(from, to) } : {};

  const expenses = await prisma.expense.findMany({
    where,
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return badRequest("Enter an amount greater than 0");
  }
  const category = body.category ? String(body.category).trim() : "Other";
  const note = body.note ? String(body.note).trim() : null;
  const dateStr = body.date ? String(body.date) : null;
  const date =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? manilaDayStartUTC(dateStr)
      : new Date();

  try {
    const expense = await prisma.expense.create({
      data: {
        date,
        category: category || "Other",
        amountCents: pesosToCents(amount),
        note,
        createdById: user.sub,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch {
    return badRequest("Could not save the expense");
  }
}
