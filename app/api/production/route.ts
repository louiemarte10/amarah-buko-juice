import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest } from "@/lib/api";
import { manilaDayStartUTC, manilaRangeUTC } from "@/lib/date";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const dateFilter =
    from && to ? { date: manilaRangeUTC(from, to) } : {};

  const logs = await prisma.productionLog.findMany({
    where: dateFilter,
    include: {
      rawMaterial: { select: { id: true, name: true, unit: true } },
      product: { select: { id: true, name: true, unit: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 300,
  });

  return NextResponse.json({ logs });
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

  const bukosBroken = Math.max(0, Math.trunc(Number(body.bukosBroken ?? 0)));
  const damaged = Math.max(0, Math.trunc(Number(body.damaged ?? 0)));
  const packsProduced = Math.max(0, Math.trunc(Number(body.packsProduced ?? 0)));
  if (bukosBroken === 0 && packsProduced === 0) {
    return badRequest("Enter the bukos broken and/or packs produced");
  }
  if (damaged > bukosBroken) {
    return badRequest("Damaged bukos can't exceed bukos broken");
  }

  const dateStr = body.date ? String(body.date) : null;
  const date = dateStr ? manilaDayStartUTC(dateStr) : new Date();
  const rawMaterialId = body.rawMaterialId ? String(body.rawMaterialId) : null;
  const productId = body.productId ? String(body.productId) : null;

  // Guard against packs vanishing: if you produced packs, they must go to a
  // product's stock.
  if (packsProduced > 0 && !productId) {
    return badRequest("Choose which product the packs go to");
  }
  const note = body.note ? String(body.note).trim() : null;

  try {
    const log = await prisma.$transaction(async (tx) => {
      // Add produced packs to the finished product's stock.
      if (productId && packsProduced > 0) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: packsProduced } },
        });
      }
      // Remove the broken bukos from the raw material (clamped at 0).
      if (rawMaterialId && bukosBroken > 0) {
        const raw = await tx.rawMaterial.findUnique({
          where: { id: rawMaterialId },
        });
        if (raw) {
          const next = Math.max(0, raw.stock - bukosBroken);
          await tx.rawMaterial.update({
            where: { id: rawMaterialId },
            data: { stock: next },
          });
        }
      }
      return tx.productionLog.create({
        data: {
          date,
          bukosBroken,
          damaged,
          packsProduced,
          note,
          rawMaterialId,
          productId,
          createdById: user.sub,
        },
        include: {
          rawMaterial: { select: { id: true, name: true, unit: true } },
          product: { select: { id: true, name: true, unit: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch {
    return badRequest("Could not save the production entry");
  }
}
