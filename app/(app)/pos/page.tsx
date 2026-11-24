"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Category, type Product, type Sale } from "@/lib/client";
import { formatPeso } from "@/lib/money";
import Receipt from "@/components/Receipt";
import { SkeletonCards } from "@/components/Skeleton";

function todayStr(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

type Line = { product: Product; quantity: number };

export default function PosPage() {
  const today = todayStr();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [saleDate, setSaleDate] = useState(today);

  const [cart, setCart] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [payment, setPayment] = useState<"CASH" | "GCASH" | "CARD">("CASH");
  const [cash, setCash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  async function loadProducts(date = saleDate) {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        api.get<{ products: Product[] }>(
          `/api/products?active=true&date=${date}`,
        ),
        api.get<{ categories: Category[] }>("/api/categories"),
      ]);
      setProducts(p.products);
      setCategories(c.categories);
    } finally {
      setLoading(false);
    }
  }

  // Load on mount and whenever the sale date changes (availability is per-day
  // for production-fed products).
  useEffect(() => {
    loadProducts(saleDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleDate]);

  function changeDate(d: string) {
    setCart([]); // clear the order — availability differs per day
    setError("");
    setSaleDate(d);
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCat === "all" || p.categoryId === activeCat;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeCat, search]);

  function addToCart(product: Product) {
    setError("");
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      const inCart = existing?.quantity ?? 0;
      if (inCart + 1 > product.stock) {
        setError(`Only ${product.stock} ${product.unit} of ${product.name} left`);
        return prev;
      }
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.product.id !== id) return l;
          const clamped = Math.min(Math.max(0, qty), l.product.stock);
          return { ...l, quantity: clamped };
        })
        .filter((l) => l.quantity > 0),
    );
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== id));
  }

  function clearCart() {
    setCart([]);
    setDiscount("");
    setCash("");
    setPayment("CASH");
    setError("");
  }

  const subtotalCents = cart.reduce(
    (s, l) => s + l.product.priceCents * l.quantity,
    0,
  );
  const discountCents = Math.min(
    Math.max(0, Math.round((parseFloat(discount) || 0) * 100)),
    subtotalCents,
  );
  const totalCents = subtotalCents - discountCents;
  const cashCents = Math.round((parseFloat(cash) || 0) * 100);
  const changeCents = payment === "CASH" ? Math.max(0, cashCents - totalCents) : 0;
  const insufficientCash = payment === "CASH" && cashCents < totalCents;

  async function completeSale() {
    if (cart.length === 0) return;
    setError("");
    setSubmitting(true);
    try {
      const { sale } = await api.post<{ sale: Sale }>("/api/sales", {
        items: cart.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
        })),
        paymentMethod: payment,
        cash: payment === "CASH" ? parseFloat(cash) || 0 : 0,
        discount: parseFloat(discount) || 0,
        date: saleDate,
      });
      setLastSale(sale);
      clearCart();
      loadProducts(saleDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sale failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      {/* Product catalog */}
      <section className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-stone-800">Point of Sale</h1>
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-surface px-3 py-1.5">
            <span className="text-xs font-medium text-stone-500">Sale date</span>
            <input
              type="date"
              value={saleDate}
              max={today}
              onChange={(e) => changeDate(e.target.value)}
              className="rounded-lg border border-stone-300 bg-surface px-2 py-1 text-sm outline-none focus:border-brand"
            />
            {saleDate !== today && (
              <button
                onClick={() => changeDate(today)}
                className="rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-dark"
              >
                Today
              </button>
            )}
          </div>
        </div>
        {saleDate !== today && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            Backdating this sale to{" "}
            {new Date(saleDate + "T00:00:00").toLocaleDateString("en-PH", {
              dateStyle: "full",
            })}
            . Pack stock shown is what was produced that day.
          </p>
        )}

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products or SKU…"
          className="mb-3 w-full rounded-xl border border-stone-300 bg-surface px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />

        <div className="mb-4 flex flex-wrap gap-2">
          <CatChip
            label="All"
            active={activeCat === "all"}
            onClick={() => setActiveCat("all")}
          />
          {categories.map((c) => (
            <CatChip
              key={c.id}
              label={c.name}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
            />
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            <SkeletonCards count={8} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-stone-400">No products found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => {
              const out = p.stock <= 0;
              return (
                <button
                  key={p.id}
                  disabled={out}
                  onClick={() => addToCart(p)}
                  className="group flex flex-col rounded-xl border border-stone-200 bg-surface p-3 text-left shadow-sm transition hover:border-brand hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="mb-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-stone-800">
                    {p.name}
                  </span>
                  <span className="text-base font-bold text-brand">
                    {formatPeso(p.priceCents)}
                  </span>
                  <span
                    className={`mt-1 text-xs ${
                      p.stock <= p.lowStockThreshold
                        ? "text-amber-600"
                        : "text-stone-400"
                    }`}
                  >
                    {out
                      ? p.productionFed
                        ? "None produced this day"
                        : "Out of stock"
                      : `${p.stock} ${p.unit}${p.productionFed ? " this day" : " left"}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Cart */}
      <section className="lg:sticky lg:top-6 lg:h-fit">
        <div className="rounded-2xl border border-stone-200 bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <h2 className="font-bold text-stone-800">Current Order</h2>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-medium text-red-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="max-h-[40vh] overflow-y-auto px-4 py-2 lg:max-h-[45vh]">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-400">
                Tap a product to add it
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {cart.map((l) => (
                  <li key={l.product.id} className="flex items-center gap-2 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-800">
                        {l.product.name}
                      </p>
                      <p className="text-xs text-stone-400">
                        {formatPeso(l.product.priceCents)} ×
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <QtyBtn onClick={() => setQty(l.product.id, l.quantity - 1)}>
                        −
                      </QtyBtn>
                      <span className="w-7 text-center text-sm font-semibold">
                        {l.quantity}
                      </span>
                      <QtyBtn onClick={() => setQty(l.product.id, l.quantity + 1)}>
                        +
                      </QtyBtn>
                    </div>
                    <span className="w-20 text-right text-sm font-semibold text-stone-800">
                      {formatPeso(l.product.priceCents * l.quantity)}
                    </span>
                    <button
                      onClick={() => removeLine(l.product.id)}
                      className="text-stone-300 hover:text-red-500"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 border-t border-stone-100 px-4 py-3">
            <Row label="Subtotal" value={formatPeso(subtotalCents)} />
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-stone-500">Discount (₱)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-24 rounded-lg border border-stone-300 px-2 py-1 text-right text-sm outline-none focus:border-brand"
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center justify-between border-t border-stone-100 pt-2">
              <span className="font-bold text-stone-800">Total</span>
              <span className="text-xl font-extrabold text-brand">
                {formatPeso(totalCents)}
              </span>
            </div>

            <div className="flex gap-2">
              {(["CASH", "GCASH", "CARD"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayment(m)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition ${
                    payment === m
                      ? "border-brand bg-brand text-white"
                      : "border-stone-200 text-stone-600 hover:border-brand"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {payment === "CASH" && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-stone-500">Cash received</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    className="w-28 rounded-lg border border-stone-300 px-2 py-1 text-right text-sm outline-none focus:border-brand"
                    placeholder="0.00"
                  />
                </div>
                <Row
                  label="Change"
                  value={formatPeso(changeCents)}
                  strong
                />
              </>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={completeSale}
              disabled={cart.length === 0 || submitting || insufficientCash}
              className="w-full rounded-xl bg-brand py-3 text-base font-bold text-white shadow transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Processing…"
                : insufficientCash
                  ? "Insufficient cash"
                  : `Charge ${formatPeso(totalCents)}`}
            </button>
          </div>
        </div>
      </section>

      {lastSale && (
        <Receipt sale={lastSale} onClose={() => setLastSale(null)} />
      )}
    </div>
  );
}

function CatChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-brand text-white"
          : "bg-surface text-stone-600 ring-1 ring-stone-200 hover:ring-brand"
      }`}
    >
      {label}
    </button>
  );
}

function QtyBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-100 text-base font-bold text-stone-600 hover:bg-brand-light"
    >
      {children}
    </button>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone-500">{label}</span>
      <span
        className={
          strong ? "font-bold text-stone-800" : "text-sm font-medium text-stone-700"
        }
      >
        {value}
      </span>
    </div>
  );
}
