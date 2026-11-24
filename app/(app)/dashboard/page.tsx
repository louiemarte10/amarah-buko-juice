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
    series: {
      date: string;
      revenueCents: number;
      expenseCents: number;
      count: number;
    }[];
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
    capitalCents: number;
    lowStockCount: number;
  };
};

export default function DashboardPage() {
  const today = todayStr();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

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
          label="Capital (puhunan)"
          value={formatPeso(data.inventory.capitalCents)}
          sub="what you encoded"
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

      {/* Summary chart: revenue vs expenses per day, with capital reference */}
      <div className="rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-stone-800">
            Revenue · Expenses · Capital
          </h2>
          <div className="flex rounded-lg border border-stone-200 p-0.5">
            {(["bar", "line"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                  chartType === t
                    ? "bg-brand text-white"
                    : "text-stone-500 hover:text-brand-dark"
                }`}
              >
                {t} chart
              </button>
            ))}
          </div>
        </div>

        {/* Legend + totals */}
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          <LegendDot color="var(--color-brand)" label="Revenue" value={formatPeso(data.range.revenueCents)} />
          <LegendDot color="#f59e0b" label="Expenses" value={formatPeso(data.range.expenseCents)} />
          <span className="flex items-center gap-1.5">
            <span className="font-medium text-stone-500">Net</span>
            <span className={`font-bold ${data.range.netCents < 0 ? "text-red-600" : "text-stone-800"}`}>
              {formatPeso(data.range.netCents)}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-medium text-stone-500">Capital</span>
            <span className="font-bold text-stone-800">
              {formatPeso(data.inventory.capitalCents)}
            </span>
          </span>
        </div>

        <TrendChart series={data.range.series} mode={chartType} days={data.range.days} />
        <p className="mt-2 text-[11px] text-stone-400">
          Bars/lines show daily revenue (gold) vs expenses (amber) for {rangeLabel}. Capital is your current total puhunan.
        </p>
      </div>

      {/* Summary / formula */}
      {(() => {
        const rev = data.range.revenueCents;
        const exp = data.range.expenseCents;
        const net = data.range.netCents;
        const cap = data.inventory.capitalCents;
        const afterCap = net - cap;
        return (
          <div className="rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-stone-800">
              Summary &amp; formula (selected range)
            </h2>
            <div className="mx-auto max-w-md space-y-1.5">
              <FRow label="Revenue (sales)" value={formatPeso(rev)} />
              <FRow label="Expenses" value={`− ${formatPeso(exp)}`} />
              <div className="my-1 border-t border-dashed border-stone-300" />
              <FRow
                label="Net  =  Revenue − Expenses"
                value={formatPeso(net)}
                strong
                tone={net < 0 ? "bad" : "good"}
              />
              <FRow label="Capital (puhunan)" value={`− ${formatPeso(cap)}`} />
              <div className="my-1 border-t border-dashed border-stone-300" />
              <FRow
                label="After capital  =  Net − Capital"
                value={formatPeso(afterCap)}
                strong
                tone={afterCap < 0 ? "bad" : "good"}
              />
              <p
                className={`pt-1 text-center text-xs font-medium ${
                  afterCap >= 0 ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {afterCap >= 0
                  ? "🎉 Sales have covered your capital and expenses."
                  : `Still recovering puhunan — ${formatPeso(-afterCap)} to go.`}
              </p>
            </div>
          </div>
        );
      })()}

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

function FRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "good" | "bad";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={`text-sm ${strong ? "font-semibold text-stone-700" : "text-stone-500"}`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-sm tabular-nums ${
          strong
            ? tone === "bad"
              ? "font-extrabold text-red-600"
              : tone === "good"
                ? "font-extrabold text-emerald-600"
                : "font-extrabold text-stone-800"
            : "text-stone-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function LegendDot({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      <span className="font-medium text-stone-500">{label}</span>
      <span className="font-bold text-stone-800">{value}</span>
    </span>
  );
}

function TrendChart({
  series,
  mode,
  days,
}: {
  series: { date: string; revenueCents: number; expenseCents: number }[];
  mode: "bar" | "line";
  days: number;
}) {
  const manyDays = days > 14;
  const maxVal = Math.max(
    1,
    ...series.map((s) => Math.max(s.revenueCents, s.expenseCents)),
  );
  const dayLabel = (date: string) => {
    const d = new Date(date + "T00:00:00");
    return manyDays
      ? d.toLocaleDateString("en-PH", { day: "numeric" })
      : d.toLocaleDateString("en-PH", { weekday: "short" });
  };

  if (mode === "line") {
    const W = 100;
    const H = 40;
    const n = series.length;
    const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
    const y = (c: number) => H - (c / maxVal) * (H - 2) - 1;
    const line = (key: "revenueCents" | "expenseCents") =>
      series.map((s, i) => `${x(i).toFixed(2)},${y(s[key]).toFixed(2)}`).join(" ");
    return (
      <div style={{ height: 180 }} className="flex flex-col">
        <div className="relative flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            <polyline
              points={line("revenueCents")}
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="0.9"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={line("expenseCents")}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="0.9"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {/* Invisible hover columns — native tooltip shows the date + values */}
          <div className="absolute inset-0 flex">
            {series.map((s) => (
              <div
                key={s.date}
                className="flex-1 cursor-help border-l border-transparent hover:border-stone-300 hover:bg-stone-400/10"
                title={`${new Date(s.date + "T00:00:00").toLocaleDateString("en-PH", { dateStyle: "medium" })}\nRevenue: ${formatPeso(s.revenueCents)}\nExpenses: ${formatPeso(s.expenseCents)}`}
              />
            ))}
          </div>
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-stone-400">
          <span>{series[0] ? dayLabel(series[0].date) : ""}</span>
          <span>{series[n - 1] ? dayLabel(series[n - 1].date) : ""}</span>
        </div>
      </div>
    );
  }

  // Bar mode — grouped revenue/expense bars per day.
  return (
    <div className={`flex items-end ${manyDays ? "gap-0.5" : "gap-2"}`} style={{ height: 180 }}>
      {series.map((s) => (
        <div key={s.date} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="flex w-full items-end justify-center gap-0.5"
            style={{ height: 150 }}
          >
            <div
              className="w-1/2 rounded-t bg-brand transition-all"
              style={{ height: Math.max(2, (s.revenueCents / maxVal) * 150) }}
              title={`${s.date} · Revenue ${formatPeso(s.revenueCents)}`}
            />
            <div
              className="w-1/2 rounded-t bg-amber-500 transition-all"
              style={{ height: Math.max(2, (s.expenseCents / maxVal) * 150) }}
              title={`${s.date} · Expenses ${formatPeso(s.expenseCents)}`}
            />
          </div>
          <span className="text-[10px] font-medium text-stone-500 sm:text-xs">
            {dayLabel(s.date)}
          </span>
        </div>
      ))}
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
