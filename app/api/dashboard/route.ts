import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized } from "@/lib/api";
import { manilaDayKey, manilaDayStartUTC, manilaRangeUTC } from "@/lib/date";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 92; // cap the series length

function validYmd(s: string | null): string | null {
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
function addDaysKey(ymd: string, n: number): string {
  return manilaDayKey(new Date(manilaDayStartUTC(ymd).getTime() + n * DAY_MS));
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const todayKey = manilaDayKey(now);

  // Default range: last 7 days (today and the 6 days before).
  let to = validYmd(searchParams.get("to")) ?? todayKey;
  let from = validYmd(searchParams.get("from")) ?? addDaysKey(to, -6);
  if (from > to) [from, to] = [to, from];
  // Clamp overly long ranges.
  const span =
    Math.round(
      (manilaDayStartUTC(to).getTime() - manilaDayStartUTC(from).getTime()) /
        DAY_MS,
    ) + 1;
  if (span > MAX_DAYS) from = addDaysKey(to, -(MAX_DAYS - 1));

  const { gte, lt } = manilaRangeUTC(from, to);

  const [rangeSales, products, topGroups, totalProducts, rawMaterials] =
    await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte, lt } },
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
        where: { sale: { createdAt: { gte, lt } } },
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

  // Daily buckets across the whole range (oldest → newest).
  const buckets: { date: string; revenueCents: number; count: number }[] = [];
  for (let d = from; d <= to; d = addDaysKey(d, 1)) {
    buckets.push({ date: d, revenueCents: 0, count: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.date, b]));

  let rangeRevenueCents = 0;
  let rangeCount = 0;
  for (const sale of rangeSales) {
    const key = manilaDayKey(sale.createdAt);
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.revenueCents += sale.totalCents;
      bucket.count += 1;
    }
    rangeRevenueCents += sale.totalCents;
    rangeCount += 1;
  }

  // Low stock (current snapshot). Raw-linked products carry no own stock, so
  // they're represented by their raw material below.
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
  const inventoryCostCents =
    products.reduce((sum, p) => sum + p.costCents * p.stock, 0) +
    rawMaterials.reduce((sum, r) => sum + Math.round(r.costCents * r.stock), 0);

  return NextResponse.json({
    range: {
      from,
      to,
      days: buckets.length,
      revenueCents: rangeRevenueCents,
      count: rangeCount,
      series: buckets,
    },
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
