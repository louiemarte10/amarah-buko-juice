import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, notFound, serverError } from "@/lib/api";

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
