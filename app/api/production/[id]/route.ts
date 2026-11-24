import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  unauthorized,
  forbidden,
  badRequest,
  notFound,
  serverError,
} from "@/lib/api";
import { manilaDayStartUTC } from "@/lib/date";

// Edit a production entry: reverse the old entry's stock effects, then apply the
// new ones, and update the record. Admin only.
export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/production/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  const existing = await prisma.productionLog.findUnique({ where: { id } });
  if (!existing) return notFound("Production entry not found");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const num = (v: unknown, fallback: number) =>
    v === undefined ? fallback : Math.max(0, Math.trunc(Number(v)));
  const bukosBroken = num(body.bukosBroken, existing.bukosBroken);
  const damaged = num(body.damaged, existing.damaged);
  const packsProduced = num(body.packsProduced, existing.packsProduced);
  if (bukosBroken === 0 && packsProduced === 0) {
    return badRequest("Enter the bukos broken and/or packs produced");
  }
  if (damaged > bukosBroken) {
    return badRequest("Damaged bukos can't exceed bukos broken");
  }

  const rawMaterialId =
    body.rawMaterialId !== undefined
      ? body.rawMaterialId
        ? String(body.rawMaterialId)
        : null
      : existing.rawMaterialId;
  const productId =
    body.productId !== undefined
      ? body.productId
        ? String(body.productId)
        : null
      : existing.productId;
  if (packsProduced > 0 && !productId) {
    return badRequest("Choose which product the packs go to");
  }
  const note =
    body.note !== undefined
      ? body.note
        ? String(body.note).trim()
        : null
      : existing.note;
  const date =
    body.date && /^\d{4}-\d{2}-\d{2}$/.test(String(body.date))
      ? manilaDayStartUTC(String(body.date))
      : existing.date;

  try {
    const log = await prisma.$transaction(async (tx) => {
      // 1) Reverse the OLD effects.
      if (existing.productId && existing.packsProduced > 0) {
        const prod = await tx.product.findUnique({
          where: { id: existing.productId },
        });
        if (prod) {
          await tx.product.update({
            where: { id: existing.productId },
            data: { stock: Math.max(0, prod.stock - existing.packsProduced) },
          });
        }
      }
      if (existing.rawMaterialId && existing.bukosBroken > 0) {
        await tx.rawMaterial.update({
          where: { id: existing.rawMaterialId },
          data: { stock: { increment: existing.bukosBroken } },
        });
      }

      // 2) Apply the NEW effects.
      if (productId && packsProduced > 0) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: packsProduced } },
        });
      }
      if (rawMaterialId && bukosBroken > 0) {
        const raw = await tx.rawMaterial.findUnique({
          where: { id: rawMaterialId },
        });
        if (raw) {
          await tx.rawMaterial.update({
            where: { id: rawMaterialId },
            data: { stock: Math.max(0, raw.stock - bukosBroken) },
          });
        }
      }

      return tx.productionLog.update({
        where: { id },
        data: {
          date,
          bukosBroken,
          damaged,
          packsProduced,
          note,
          rawMaterialId,
          productId,
        },
        include: {
          rawMaterial: { select: { id: true, name: true, unit: true } },
          product: { select: { id: true, name: true, unit: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
    });
    return NextResponse.json({ log });
  } catch {
    return badRequest("Could not update the production entry");
  }
}

// Delete a production entry and reverse its stock effects: remove the produced
// packs from the product's stock, and return the broken bukos to the raw stock.
export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/production/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  const log = await prisma.productionLog.findUnique({ where: { id } });
  if (!log) return notFound("Production entry not found");

  try {
    await prisma.$transaction(async (tx) => {
      if (log.productId && log.packsProduced > 0) {
        const product = await tx.product.findUnique({
          where: { id: log.productId },
        });
        if (product) {
          const next = Math.max(0, product.stock - log.packsProduced);
          await tx.product.update({
            where: { id: log.productId },
            data: { stock: next },
          });
        }
      }
      if (log.rawMaterialId && log.bukosBroken > 0) {
        await tx.rawMaterial.update({
          where: { id: log.rawMaterialId },
          data: { stock: { increment: log.bukosBroken } },
        });
      }
      await tx.productionLog.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch {
    return serverError("Could not delete the production entry");
  }
}
