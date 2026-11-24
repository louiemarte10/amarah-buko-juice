import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, notFound, serverError } from "@/lib/api";

// Delete (void) a sale. Admin only. Returns the sold items to stock — own-stock
// products are incremented, and raw-linked products return quantity × rawUsage
// to their raw material — so inventory stays accurate after a correction.
export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/sales/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { id } = await ctx.params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!sale) return notFound("Sale not found");

  try {
    await prisma.$transaction(async (tx) => {
      // Look up the products still on file to know how to return their stock.
      const productIds = [...new Set(sale.items.map((i) => i.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, rawMaterialId: true, rawUsage: true },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      const rawReturn = new Map<string, number>(); // rawMaterialId -> units

      for (const item of sale.items) {
        const product = byId.get(item.productId);
        if (!product) continue; // product deleted — nothing to restore
        if (product.rawMaterialId) {
          const usage = product.rawUsage > 0 ? product.rawUsage : 1;
          rawReturn.set(
            product.rawMaterialId,
            (rawReturn.get(product.rawMaterialId) ?? 0) + usage * item.quantity,
          );
        } else {
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      for (const [rawId, units] of rawReturn) {
        const amount = Math.round(units * 1e6) / 1e6;
        await tx.rawMaterial.update({
          where: { id: rawId },
          data: { stock: { increment: amount } },
        });
      }

      await tx.saleItem.deleteMany({ where: { saleId: id } });
      await tx.sale.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return serverError("Could not delete the sale");
  }
}
