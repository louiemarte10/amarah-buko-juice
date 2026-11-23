import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { unauthorized, badRequest } from "@/lib/api";
import { pesosToCents } from "@/lib/money";

type CartItem = { productId: string; quantity: number };

function makeReference(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ABJ-${date}-${rand}`;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  const sales = await prisma.sale.findMany({
    include: {
      items: true,
      cashier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ sales });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  let body: {
    items?: CartItem[];
    paymentMethod?: "CASH" | "GCASH" | "CARD";
    cash?: number;
    discount?: number;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const items = body.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return badRequest("Cart is empty");
  }

  // Collapse duplicate product lines and validate quantities.
  const qtyByProduct = new Map<string, number>();
  for (const item of items) {
    const qty = Math.trunc(Number(item.quantity));
    if (!item.productId || !Number.isFinite(qty) || qty <= 0) {
      return badRequest("Each cart item needs a product and a quantity of 1 or more");
    }
    qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + qty);
  }

  const paymentMethod = body.paymentMethod ?? "CASH";
  const discountCents = Math.max(0, pesosToCents(Number(body.discount ?? 0)));

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const ids = [...qtyByProduct.keys()];
      const products = await tx.product.findMany({ where: { id: { in: ids } } });
      const byId = new Map(products.map((p) => [p.id, p]));

      let subtotalCents = 0;
      const saleItemsData: {
        productId: string;
        productName: string;
        unitCents: number;
        quantity: number;
        lineCents: number;
      }[] = [];

      for (const [productId, quantity] of qtyByProduct) {
        const product = byId.get(productId);
        if (!product || !product.active) {
          throw new Error(`A product in the cart is no longer available`);
        }
        if (product.stock < quantity) {
          throw new Error(
            `Not enough stock for ${product.name} (have ${product.stock}, need ${quantity})`,
          );
        }
        const lineCents = product.priceCents * quantity;
        subtotalCents += lineCents;
        saleItemsData.push({
          productId: product.id,
          productName: product.name,
          unitCents: product.priceCents,
          quantity,
          lineCents,
        });
      }

      const totalCents = Math.max(0, subtotalCents - discountCents);
      const cashCents =
        paymentMethod === "CASH" ? pesosToCents(Number(body.cash ?? 0)) : totalCents;
      if (paymentMethod === "CASH" && cashCents < totalCents) {
        throw new Error("Cash received is less than the total");
      }
      const changeCents = Math.max(0, cashCents - totalCents);

      // Decrement stock for every product.
      for (const data of saleItemsData) {
        await tx.product.update({
          where: { id: data.productId },
          data: { stock: { decrement: data.quantity } },
        });
      }

      return tx.sale.create({
        data: {
          reference: makeReference(),
          subtotalCents,
          discountCents,
          totalCents,
          paymentMethod,
          cashCents,
          changeCents,
          cashierId: user.sub,
          items: { create: saleItemsData },
        },
        include: {
          items: true,
          cashier: { select: { id: true, name: true } },
        },
      });
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not complete the sale";
    return badRequest(message);
  }
}
