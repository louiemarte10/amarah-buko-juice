"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Expense } from "@/lib/client";
import { formatPeso } from "@/lib/money";
import ConfirmModal, { type ConfirmState } from "@/components/ConfirmModal";
import { SkeletonRows } from "@/components/Skeleton";

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
function toYmd(iso: string): string {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

const CATEGORIES = [
  "Transportation",
  "Food",
  "Water",
  "Ice",
  "Gas / Load",
  "Supplies",
  "Rent",
  "Other",
];

export default function ExpensesPage() {
  const today = todayStr();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [from, setFrom] = useState(addDays(today, -6));
  const [to, setTo] = useState(today);

  const [form, setForm] = useState({
    date: today,
    category: "Transportation",
    amount: "",
    note: "",
  });

  async function load() {
    setLoading(true);
    try {
      const { expenses } = await api.get<{ expenses: Expense[] }>(
        `/api/expenses?from=${from}&to=${to}`,
      );
      setExpenses(expenses);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  async function save() {
    setError("");
    const amount = parseFloat(form.amount) || 0;
    if (amount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/expenses", {
        date: form.date,
        category: form.category || "Other",
        amount,
        note: form.note || null,
      });
      setForm((f) => ({ ...f, amount: "", note: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(e: Expense) {
    setConfirm({
      title: "Delete expense",
      message: `Delete the ${e.category} expense of ${formatPeso(e.amountCents)}? This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.del(`/api/expenses/${e.id}`);
          setConfirm(null);
          await load();
        } catch (err) {
          alert(err instanceof Error ? err.message : "Delete failed");
          setConfirm(null);
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }

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

  const total = useMemo(
    () => expenses.reduce((s, e) => s + e.amountCents, 0),
    [expenses],
  );

  // Daily buckets across the range for the charts.
  const series = useMemo(() => {
    const byDay = new Map<string, number>();
    for (let d = from; d <= to; d = addDays(d, 1)) byDay.set(d, 0);
    for (const e of expenses) {
      const k = toYmd(e.date);
      if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + e.amountCents);
    }
    let cum = 0;
    return [...byDay.entries()].map(([date, cents]) => {
      cum += cents;
      return { date, cents, cum };
    });
  }, [expenses, from, to]);

  const maxBar = Math.max(1, ...series.map((s) => s.cents));
  const maxCum = Math.max(1, ...series.map((s) => s.cum));
  const manyDays = series.length > 14;

  const isToday = from === today && to === today;
  const isWeek = from === addDays(today, -6) && to === today;
  const isMonth = from === addDays(today, -29) && to === today;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-800">Daily Expenses</h1>
        <p className="mt-1 max-w-[75ch] text-sm text-stone-500">
          Encode the money you spend each day — transportation, food, water and
          anything else you buy. These are subtracted from your sales on the
          Dashboard (<strong>Net = Revenue − Expenses</strong>).
        </p>
      </div>

      {/* Encode form */}
      <div className="rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-stone-800">Add an expense</h2>
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <Field label="Date">
            <input
              type="date"
              max={today}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Category">
            <input
              list="expense-cats"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputCls}
            />
            <datalist id="expense-cats">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Amount (₱)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 50"
              className={inputCls}
            />
          </Field>
          <Field label="Note (optional)" className="col-span-2 sm:col-span-1 lg:col-span-1">
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="what for…"
              className={inputCls}
            />
          </Field>
          <div className="flex items-end">
            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add expense"}
            </button>
          </div>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <div className="rounded-xl border border-brand/30 bg-brand-light px-4 py-2">
          <span className="text-sm font-medium text-brand-dark">Total: </span>
          <span className="text-lg font-extrabold text-brand-dark">
            {formatPeso(total)}
          </span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar chart — expenses per day */}
        <div className="rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-stone-800">Expenses per day</h2>
          {loading ? (
            <div className="h-[180px] animate-pulse rounded-lg bg-stone-100" />
          ) : (
            <div
              className={`flex items-end ${manyDays ? "gap-0.5" : "gap-2"}`}
              style={{ height: 180 }}
            >
              {series.map((s) => {
                const h = Math.round((s.cents / maxBar) * 150);
                const d = new Date(s.date + "T00:00:00");
                const label = manyDays
                  ? d.toLocaleDateString("en-PH", { day: "numeric" })
                  : d.toLocaleDateString("en-PH", { weekday: "short" });
                return (
                  <div
                    key={s.date}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    {!manyDays && (
                      <span className="text-[10px] text-stone-400">
                        {s.cents > 0 ? formatPeso(s.cents) : ""}
                      </span>
                    )}
                    <div
                      className="w-full rounded-t-md bg-amber-500 transition-all"
                      style={{ height: Math.max(4, h) }}
                      title={`${s.date}: ${formatPeso(s.cents)}`}
                    />
                    <span className="text-[10px] font-medium text-stone-500 sm:text-xs">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Line chart — cumulative spend */}
        <div className="rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-stone-800">
            Cumulative spend (trend)
          </h2>
          {loading ? (
            <div className="h-[180px] animate-pulse rounded-lg bg-stone-100" />
          ) : (
            <LineChart series={series} maxCum={maxCum} />
          )}
        </div>
      </div>

      {/* History table */}
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-surface shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows rows={5} cols={6} />
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  No expenses in this range.
                </td>
              </tr>
            ) : (
              <>
                {expenses.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-stone-100 last:border-0 hover:bg-cream"
                  >
                    <td className="px-4 py-3 font-medium text-stone-700">
                      {new Date(e.date).toLocaleDateString("en-PH", {
                        dateStyle: "medium",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500">{e.note ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-800">
                      {formatPeso(e.amountCents)}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {e.createdBy?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => requestDelete(e)}
                        className="text-xs font-semibold text-red-500 transition hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-cream font-semibold text-stone-700">
                  <td className="px-4 py-3" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right">{formatPeso(total)}</td>
                  <td className="px-4 py-3" colSpan={2}></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        state={confirm}
        loading={confirmLoading}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function LineChart({
  series,
  maxCum,
}: {
  series: { date: string; cum: number }[];
  maxCum: number;
}) {
  const W = 100;
  const H = 40;
  const n = series.length;
  if (n === 0) return <div style={{ height: 180 }} />;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (c: number) => H - (c / maxCum) * (H - 2) - 1;
  const pts = series.map((s, i) => `${x(i).toFixed(2)},${y(s.cum).toFixed(2)}`);
  const area = `0,${H} ${pts.join(" ")} ${W},${H}`;

  return (
    <div style={{ height: 180 }} className="flex flex-col">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full flex-1"
      >
        <polygon points={area} fill="var(--color-brand)" opacity="0.12" />
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="0.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-stone-400">
        <span>
          {new Date(series[0].date + "T00:00:00").toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span>
          {new Date(
            series[n - 1].date + "T00:00:00",
          ).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-stone-500">
        {label}
      </label>
      {children}
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
