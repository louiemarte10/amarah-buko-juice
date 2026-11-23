"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatPeso } from "@/lib/money";

type Dashboard = {
  today: { revenueCents: number; count: number };
  week: {
    revenueCents: number;
    series: { date: string; revenueCents: number; count: number }[];
  };
  bestSellers: {
    productId: string;
    name: string;
    quantity: number;
    revenueCents: number;
  }[];
  lowStock: {
    id: string;
    name: string;
    stock: number;
    lowStockThreshold: number;
    unit: string;
  }[];
  inventory: {
    totalProducts: number;
    activeProducts: number;
    retailValueCents: number;
    lowStockCount: number;
  };
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await api.get<Dashboard>("/api/dashboard"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !data) {
    return <p className="text-stone-400">Loading dashboard…</p>;
  }

  const maxBar = Math.max(1, ...data.week.series.map((s) => s.revenueCents));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-stone-800">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Today's Sales"
          value={formatPeso(data.today.revenueCents)}
          sub={`${data.today.count} transactions`}
          accent
        />
        <Stat
          label="Last 7 Days"
          value={formatPeso(data.week.revenueCents)}
          sub="revenue"
        />
        <Stat
          label="Inventory Value"
          value={formatPeso(data.inventory.retailValueCents)}
          sub={`${data.inventory.activeProducts} active items`}
        />
        <Stat
          label="Low Stock"
          value={String(data.inventory.lowStockCount)}
          sub="items need restock"
          warn={data.inventory.lowStockCount > 0}
        />
      </div>

      {/* 7-day chart */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-stone-800">Revenue — last 7 days</h2>
        <div className="flex items-end gap-2" style={{ height: 180 }}>
          {data.week.series.map((s) => {
            const h = Math.round((s.revenueCents / maxBar) * 150);
            const day = new Date(s.date + "T00:00:00").toLocaleDateString("en-PH", {
              weekday: "short",
            });
            return (
              <div key={s.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-stone-400">
                  {s.revenueCents > 0 ? formatPeso(s.revenueCents) : ""}
                </span>
                <div
                  className="w-full rounded-t-md bg-brand transition-all"
                  style={{ height: Math.max(4, h) }}
                  title={formatPeso(s.revenueCents)}
                />
                <span className="text-xs font-medium text-stone-500">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Best sellers */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-stone-800">
            Best Sellers (30 days)
          </h2>
          {data.bestSellers.length === 0 ? (
            <p className="text-sm text-stone-400">No sales yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.bestSellers.map((b, i) => (
                <li key={b.productId} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand-dark">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-stone-700">
                    {b.name}
                  </span>
                  <span className="text-sm text-stone-500">{b.quantity} sold</span>
                  <span className="w-20 text-right text-sm font-semibold text-stone-800">
                    {formatPeso(b.revenueCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Low stock */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-stone-800">Low Stock Alerts</h2>
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-stone-400">Everything well stocked 🎉</p>
          ) : (
            <ul className="space-y-2">
              {data.lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2"
                >
                  <span className="text-sm font-medium text-stone-700">
                    {p.name}
                  </span>
                  <span className="text-sm font-semibold text-amber-700">
                    {p.stock} {p.unit} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
  warn,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        accent
          ? "border-brand bg-brand text-white"
          : warn
            ? "border-amber-200 bg-amber-50"
            : "border-stone-200 bg-white"
      }`}
    >
      <p
        className={`text-xs font-medium ${
          accent ? "text-white/80" : "text-stone-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-extrabold ${
          warn ? "text-amber-700" : accent ? "text-white" : "text-stone-800"
        }`}
      >
        {value}
      </p>
      <p
        className={`text-xs ${accent ? "text-white/70" : "text-stone-400"}`}
      >
        {sub}
      </p>
    </div>
  );
}
