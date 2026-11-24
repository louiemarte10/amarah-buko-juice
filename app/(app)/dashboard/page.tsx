"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatPeso } from "@/lib/money";
import { Skeleton } from "@/components/Skeleton";

function todayStr(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + "T00:00:00");
  d.setDate(d.getDate() + n);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

type Dashboard = {
  range: {
    from: string;
    to: string;
    days: number;
    revenueCents: number;
    count: number;
    expenseCents: number;
    netCents: number;
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
    kind?: "product" | "raw";
  }[];
  inventory: {
    totalProducts: number;
    activeProducts: number;
    retailValueCents: number;
    costValueCents: number;
    lowStockCount: number;
  };
};

export default function DashboardPage() {
  const today = todayStr();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  // Default range: last 7 days.
  const [from, setFrom] = useState(addDays(today, -6));
  const [to, setTo] = useState(today);

  async function load() {
    setLoading(true);
    try {
      setData(
        await api.get<Dashboard>(`/api/dashboard?from=${from}&to=${to}`),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  function setQuick(kind: "today" | "week" | "month") {
    if (kind === "today") {
      setFrom(today);
      setTo(today);
    } else if (kind === "week") {
      setFrom(addDays(today, -6));
      setTo(today);
    } else {
      setFrom(addDays(today, -29));
      setTo(today);
    }
  }

  const isToday = from === today && to === today;
  const isWeek = from === addDays(today, -6) && to === today;
  const isMonth = from === addDays(today, -29) && to === today;

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2">
      <Quick label="Today" on={isToday} onClick={() => setQuick("today")} />
      <Quick label="Last 7 days" on={isWeek} onClick={() => setQuick("week")} />
      <Quick label="Last 30 days" on={isMonth} onClick={() => setQuick("month")} />
      <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-surface px-2 py-1">
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded px-1 py-0.5 text-xs outline-none focus:text-brand-dark"
        />
        <span className="text-xs text-stone-400">to</span>
        <input
          type="date"
          value={to}
          min={from}
          max={today}
          onChange={(e) => setTo(e.target.value)}
          className="rounded px-1 py-0.5 text-xs outline-none focus:text-brand-dark"
        />
      </div>
    </div>
  );

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-stone-800">Dashboard</h1>
          {filterBar}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-52 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  const maxBar = Math.max(1, ...data.range.series.map((s) => s.revenueCents));
  const manyDays = data.range.days > 14;
  const rangeLabel =
    data.range.from === data.range.to
      ? new Date(data.range.from + "T00:00:00").toLocaleDateString("en-PH", {
          dateStyle: "full",
        })
      : `${new Date(data.range.from + "T00:00:00").toLocaleDateString("en-PH", { dateStyle: "medium" })} – ${new Date(data.range.to + "T00:00:00").toLocaleDateString("en-PH", { dateStyle: "medium" })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-stone-800">Dashboard</h1>
        {filterBar}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat
          label="Revenue (range)"
          value={formatPeso(data.range.revenueCents)}
          sub={rangeLabel}
          accent
        />
        <Stat
          label="Expenses (range)"
          value={formatPeso(data.range.expenseCents)}
          sub="transportation, food, etc."
        />
        <Stat
          label="Net (range)"
          value={formatPeso(data.range.netCents)}
          sub="revenue − expenses"
          danger={data.range.netCents < 0}
        />
        <Stat
          label="Capital on hand"
          value={formatPeso(data.inventory.costValueCents)}
          sub="cost of stock (puhunan)"
        />
        <Stat
          label="Transactions"
          value={String(data.range.count)}
          sub={`over ${data.range.days} day${data.range.days === 1 ? "" : "s"}`}
        />
        <Stat
          label="Low Stock"
          value={String(data.inventory.lowStockCount)}
          sub="items need restock"
          warn={data.inventory.lowStockCount > 0}
        />
      </div>

      {/* Revenue chart */}
      <div className="rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-stone-800">Revenue — {rangeLabel}</h2>
        <div
          className={`flex items-end ${manyDays ? "gap-0.5" : "gap-2"}`}
          style={{ height: 180 }}
        >
          {data.range.series.map((s) => {
            const h = Math.round((s.revenueCents / maxBar) * 150);
            const d = new Date(s.date + "T00:00:00");
            const label = manyDays
              ? d.toLocaleDateString("en-PH", { day: "numeric" })
              : d.toLocaleDateString("en-PH", { weekday: "short" });
            return (
              <div key={s.date} className="flex flex-1 flex-col items-center gap-1">
                {!manyDays && (
                  <span className="text-[10px] text-stone-400">
                    {s.revenueCents > 0 ? formatPeso(s.revenueCents) : ""}
                  </span>
                )}
                <div
                  className="w-full rounded-t-md bg-brand transition-all"
                  style={{ height: Math.max(4, h) }}
                  title={`${s.date}: ${formatPeso(s.revenueCents)} (${s.count} sale${s.count === 1 ? "" : "s"})`}
                />
                <span className="text-[10px] font-medium text-stone-500 sm:text-xs">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Best sellers */}
        <div className="rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-stone-800">
            Best Sellers (selected range)
          </h2>
          {data.bestSellers.length === 0 ? (
            <p className="text-sm text-stone-400">No sales in this range.</p>
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
        <div className="rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm">
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
                  <span className="flex items-center gap-2 text-sm font-medium text-stone-700">
                    {p.name}
                    {p.kind === "raw" && (
                      <span className="rounded bg-brand-light px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-dark">
                        Raw
                      </span>
                    )}
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

function Quick({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        on
          ? "border-brand bg-brand text-white"
          : "border-stone-300 bg-surface text-stone-600 hover:border-brand hover:text-brand-dark"
      }`}
    >
      {label}
    </button>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
  warn,
  danger,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  warn?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        accent
          ? "border-brand bg-brand text-white"
          : danger
            ? "border-red-200 bg-red-50"
            : warn
              ? "border-amber-200 bg-amber-50"
              : "border-stone-200 bg-surface"
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
          danger
            ? "text-red-600"
            : warn
              ? "text-amber-700"
              : accent
                ? "text-white"
                : "text-stone-800"
        }`}
      >
        {value}
      </p>
      <p className={`truncate text-xs ${accent ? "text-white/70" : "text-stone-400"}`}>
        {sub}
      </p>
    </div>
  );
}
