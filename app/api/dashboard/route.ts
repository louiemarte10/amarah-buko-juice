import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized } from "@/lib/api";

// The shop runs on Philippine time (UTC+8, no DST).
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Start of the Manila calendar day (as a UTC Date) for a given instant. */
function manilaDayStart(instant: Date): Date {
  const shifted = new Date(instant.getTime() + MANILA_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d) - MANILA_OFFSET_MS);
}

function manilaDayKey(instant: Date): string {
  const shifted = new Date(instant.getTime() + MANILA_OFFSET_MS);
  return shifted.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const now = new Date();
  const todayStart = manilaDayStart(now);
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [weekSales, products, topGroups, totalProducts, rawMaterials] =
    await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte: weekStart } },
        select: { createdAt: true, totalCents: true },
      }),
      prisma.product.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          stock: true,
          lowStockThreshold: true,
          priceCents: true,
          costCents: true,
          unit: true,
          rawMaterialId: true,
        },
      }),
      prisma.saleItem.groupBy({
        by: ["productId", "productName"],
        where: { sale: { createdAt: { gte: monthAgo } } },
        _sum: { quantity: true, lineCents: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.product.count(),
      prisma.rawMaterial.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          stock: true,
          lowStockThreshold: true,
          costCents: true,
          unit: true,
        },
      }),
    ]);

  // Today's totals
  let todayRevenueCents = 0;
  let todayCount = 0;

  // 7-day buckets (oldest -> newest)
  const buckets: { date: string; revenueCents: number; count: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
    buckets.push({ date: manilaDayKey(day), revenueCents: 0, count: 0 });
  }
  const bucketByKey = new Map(buckets.map((b) => [b.date, b]));

  for (const sale of weekSales) {
    const key = manilaDayKey(sale.createdAt);
    const bucket = bucketByKey.get(key);
    if (bucket) {
      bucket.revenueCents += sale.totalCents;
      bucket.count += 1;
    }
    if (sale.createdAt >= todayStart) {
      todayRevenueCents += sale.totalCents;
      todayCount += 1;
    }
  }

  // Own-stock products that are low. Raw-linked products carry no own stock, so
  // they're excluded here and represented by their raw material below.
  const lowStockProducts = products
    .filter((p) => p.rawMaterialId == null && p.stock <= p.lowStockThreshold)
    .map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      unit: p.unit,
      kind: "product" as const,
    }));

  // Raw materials at or below their alert level (0 threshold = no alert).
  const lowStockRaw = rawMaterials
    .filter((r) => r.lowStockThreshold > 0 && r.stock <= r.lowStockThreshold)
    .map((r) => ({
      id: r.id,
      name: r.name,
      stock: Math.round(r.stock * 100) / 100,
      lowStockThreshold: r.lowStockThreshold,
      unit: r.unit,
      kind: "raw" as const,
    }));

  const lowStock = [...lowStockProducts, ...lowStockRaw]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 20);

  const inventoryRetailCents = products.reduce(
    (sum, p) => sum + p.priceCents * p.stock,
    0,
  );
  // Cost on hand = own-stock products' cost + raw materials' cost value.
  const inventoryCostCents =
    products.reduce((sum, p) => sum + p.costCents * p.stock, 0) +
    rawMaterials.reduce((sum, r) => sum + Math.round(r.costCents * r.stock), 0);

  const weekRevenueCents = buckets.reduce((s, b) => s + b.revenueCents, 0);

  return NextResponse.json({
    today: { revenueCents: todayRevenueCents, count: todayCount },
    week: { revenueCents: weekRevenueCents, series: buckets },
    bestSellers: topGroups.map((g) => ({
      productId: g.productId,
      name: g.productName,
      quantity: g._sum.quantity ?? 0,
      revenueCents: g._sum.lineCents ?? 0,
    })),
    lowStock,
    inventory: {
      totalProducts,
      activeProducts: products.length,
      retailValueCents: inventoryRetailCents,
      costValueCents: inventoryCostCents,
      lowStockCount: lowStock.length,
    },
  });
}
