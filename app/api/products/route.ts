import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, forbidden, badRequest } from "@/lib/api";
import { pesosToCents } from "@/lib/money";
import { manilaRangeUTC } from "@/lib/date";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  // `active=true` (legacy, used by POS) or `status=active|archived|all`
  const status = searchParams.get("status");
  const activeOnly = searchParams.get("active") === "true";
  const activeFilter =
    activeOnly || status === "active"
      ? { active: true }
      : status === "archived"
        ? { active: false }
        : {};

  const products = await prisma.product.findMany({
    where: {
      ...activeFilter,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      category: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      rawMaterial: {
        select: {
          id: true,
          name: true,
          unit: true,
          stock: true,
          lowStockThreshold: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // For raw-linked products, report the DERIVED number of sellable units
  // available (how many whole raw units will divide into) so the POS and
  // inventory show real availability from the shared raw stock.
  const shaped: Array<
    (typeof products)[number] & { productionFed?: boolean }
  > = products.map((p) => {
    if (p.rawMaterialId && p.rawMaterial) {
      const usage = p.rawUsage > 0 ? p.rawUsage : 1;
      const available = Math.floor((p.rawMaterial.stock + 1e-9) / usage);
      return { ...p, stock: Math.max(0, available) };
    }
    return p;
  });

  // Date mode (POS): for products fed by the daily Production encode, report
  // availability for THAT day = packs produced that day − packs sold that day.
  const date = searchParams.get("date");
  if (date) {
    const range = manilaRangeUTC(date, date);
    const [producedRows, soldRows, fedRows] = await Promise.all([
      prisma.productionLog.groupBy({
        by: ["productId"],
        where: { date: range, productId: { not: null } },
        _sum: { packsProduced: true },
      }),
      prisma.saleItem.groupBy({
        by: ["productId"],
        where: { sale: { createdAt: range } },
        _sum: { quantity: true },
      }),
      prisma.productionLog.findMany({
        where: { productId: { not: null } },
        distinct: ["productId"],
        select: { productId: true },
      }),
    ]);
    const producedBy = new Map(
      producedRows.map((r) => [r.productId, r._sum.packsProduced ?? 0]),
    );
    const soldBy = new Map(
      soldRows.map((r) => [r.productId, r._sum.quantity ?? 0]),
    );
    const fed = new Set(fedRows.map((r) => r.productId));
    const dated = shaped.map((p) =>
      fed.has(p.id)
        ? {
            ...p,
            stock: Math.max(
              0,
              (producedBy.get(p.id) ?? 0) - (soldBy.get(p.id) ?? 0),
            ),
            productionFed: true,
          }
        : p,
    );
    return NextResponse.json({ products: dated });
  }

  return NextResponse.json({ products: shaped });
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

  const name = String(body.name ?? "").trim();
  if (!name) return badRequest("Product name is required");

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) {
    return badRequest("A valid price is required");
  }

  const sku = body.sku ? String(body.sku).trim() : null;
  if (sku) {
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) return badRequest("A product with that SKU already exists");
  }

  const rawMaterialId = body.rawMaterialId ? String(body.rawMaterialId) : null;
  const rawUsage = rawMaterialId
    ? Math.max(0.0001, Number(body.rawUsage ?? 1) || 1)
    : 1;

  try {
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        priceCents: pesosToCents(price),
        costCents: pesosToCents(Number(body.cost ?? 0)),
        // Raw-linked products don't track their own stock.
        stock: rawMaterialId
          ? 0
          : Math.max(0, Math.trunc(Number(body.stock ?? 0))),
        lowStockThreshold: Math.max(
          0,
          Math.trunc(Number(body.lowStockThreshold ?? 10)),
        ),
        unit: body.unit ? String(body.unit).trim() : "pc",
        active: body.active === undefined ? true : Boolean(body.active),
        categoryId: body.categoryId ? String(body.categoryId) : null,
        supplierId: body.supplierId ? String(body.supplierId) : null,
        rawMaterialId,
        rawUsage,
      },
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return badRequest("Could not create product. Check the category/supplier.");
  }
}
