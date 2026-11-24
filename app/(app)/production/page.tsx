"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  type ProductionLog,
  type Product,
  type RawMaterial,
} from "@/lib/client";
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

type FormState = {
  date: string;
  rawMaterialId: string;
  bukosBroken: string;
  damaged: string;
  productId: string;
  packsProduced: string;
  note: string;
};

export default function ProductionPage() {
  const today = todayStr();
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // History date filter
  const [from, setFrom] = useState(addDays(today, -6));
  const [to, setTo] = useState(today);
  const [allDates, setAllDates] = useState(true);

  const [form, setForm] = useState<FormState>({
    date: today,
    rawMaterialId: "",
    bukosBroken: "",
    damaged: "0",
    productId: "",
    packsProduced: "",
    note: "",
  });

  async function loadRefs() {
    const [r, p] = await Promise.all([
      api.get<{ rawMaterials: RawMaterial[] }>("/api/raw-materials"),
      api.get<{ products: Product[] }>("/api/products?status=active"),
    ]);
    setRawMaterials(r.rawMaterials);
    setProducts(p.products);
    // Sensible defaults: raw = first (e.g. Whole Buko); product = a "pack".
    setForm((f) => ({
      ...f,
      rawMaterialId: f.rawMaterialId || r.rawMaterials[0]?.id || "",
      productId:
        f.productId ||
        p.products.find((x) => /pack/i.test(x.name) || x.unit === "pack")?.id ||
        p.products[0]?.id ||
        "",
    }));
  }

  async function loadLogs() {
    const qs = allDates ? "" : `?from=${from}&to=${to}`;
    const { logs } = await api.get<{ logs: ProductionLog[] }>(
      `/api/production${qs}`,
    );
    setLogs(logs);
  }

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadRefs(), loadLogs()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, allDates]);

  const goodBukos = Math.max(
    0,
    (parseInt(form.bukosBroken) || 0) - (parseInt(form.damaged) || 0),
  );

  async function save() {
    setError("");
    const broken = parseInt(form.bukosBroken) || 0;
    const packs = parseInt(form.packsProduced) || 0;
    if (broken === 0 && packs === 0) {
      setError("Enter the bukos broken and/or packs produced.");
      return;
    }
    if ((parseInt(form.damaged) || 0) > broken) {
      setError("Damaged bukos can't exceed bukos broken.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/production", {
        date: form.date,
        rawMaterialId: form.rawMaterialId || null,
        bukosBroken: broken,
        damaged: parseInt(form.damaged) || 0,
        productId: form.productId || null,
        packsProduced: packs,
        note: form.note || null,
      });
      setForm((f) => ({
        ...f,
        bukosBroken: "",
        damaged: "0",
        packsProduced: "",
        note: "",
      }));
      await Promise.all([loadRefs(), loadLogs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(l: ProductionLog) {
    setConfirm({
      title: "Delete production entry",
      message:
        `Delete the entry for ${new Date(l.date).toLocaleDateString("en-PH", { dateStyle: "medium" })}? ` +
        `This removes ${l.packsProduced} pack(s) from stock and returns ${l.bukosBroken} buko(s). This can't be undone.`,
      confirmLabel: "Delete entry",
      danger: true,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.del(`/api/production/${l.id}`);
          setConfirm(null);
          await Promise.all([loadRefs(), loadLogs()]);
        } catch (err) {
          alert(err instanceof Error ? err.message : "Delete failed");
          setConfirm(null);
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }

  const totals = useMemo(
    () =>
      logs.reduce(
        (a, l) => ({
          broken: a.broken + l.bukosBroken,
          damaged: a.damaged + l.damaged,
          packs: a.packs + l.packsProduced,
        }),
        { broken: 0, damaged: 0, packs: 0 },
      ),
    [logs],
  );

  function setQuick(kind: "today" | "yesterday" | "week" | "all") {
    if (kind === "all") {
      setAllDates(true);
      return;
    }
    setAllDates(false);
    if (kind === "today") {
      setFrom(today);
      setTo(today);
    } else if (kind === "yesterday") {
      setFrom(addDays(today, -1));
      setTo(addDays(today, -1));
    } else if (kind === "week") {
      setFrom(addDays(today, -6));
      setTo(today);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-800">Production (Buko Breakage)</h1>
        <p className="mt-1 max-w-[75ch] text-sm text-stone-500">
          Each day, encode how many bukos you broke and how many packs you
          actually got. Saving <strong>adds the packs to that product&apos;s
          stock</strong> and <strong>subtracts the broken bukos</strong> from your
          raw buko stock. Damaged bukos (no water) are counted separately.
        </p>
      </div>

      {/* Encode form */}
      <div className="rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-stone-800">Encode a day</h2>
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Date">
            <input
              type="date"
              max={today}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Raw material">
            <select
              value={form.rawMaterialId}
              onChange={(e) =>
                setForm({ ...form, rawMaterialId: e.target.value })
              }
              className={inputCls}
            >
              <option value="">— None —</option>
              {rawMaterials.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Bukos broken">
            <input
              type="number"
              min="0"
              value={form.bukosBroken}
              onChange={(e) =>
                setForm({ ...form, bukosBroken: e.target.value })
              }
              placeholder="9"
              className={inputCls}
            />
          </Field>
          <Field label="Damaged (no water)">
            <input
              type="number"
              min="0"
              value={form.damaged}
              onChange={(e) => setForm({ ...form, damaged: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Packs produced">
            <input
              type="number"
              min="0"
              value={form.packsProduced}
              onChange={(e) =>
                setForm({ ...form, packsProduced: e.target.value })
              }
              placeholder="e.g. 32"
              className={inputCls}
            />
          </Field>
          <Field label="Goes to product">
            <select
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              className={inputCls}
            >
              <option value="">— None —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note (optional)" className="col-span-2 sm:col-span-3 lg:col-span-5">
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Anything to remember about this batch…"
              className={inputCls}
            />
          </Field>
          <div className="flex items-end">
            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save entry"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-stone-400">
          Good bukos today: <strong>{goodBukos}</strong>
          {goodBukos > 0 && (parseInt(form.packsProduced) || 0) > 0 && (
            <>
              {" "}· {((parseInt(form.packsProduced) || 0) / goodBukos).toFixed(1)}{" "}
              packs per good buko
            </>
          )}
        </p>
      </div>

      {/* History */}
      <div className="rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-stone-800">History</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Quick label="Today" on={!allDates && from === today && to === today} onClick={() => setQuick("today")} />
            <Quick
              label="Yesterday"
              on={!allDates && from === addDays(today, -1) && to === addDays(today, -1)}
              onClick={() => setQuick("yesterday")}
            />
            <Quick label="7 days" on={!allDates && from === addDays(today, -6) && to === today} onClick={() => setQuick("week")} />
            <Quick label="All" on={allDates} onClick={() => setQuick("all")} />
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => {
                  setAllDates(false);
                  setFrom(e.target.value);
                }}
                className="rounded-lg border border-stone-300 px-2 py-1 text-xs outline-none focus:border-brand"
              />
              <span className="text-xs text-stone-400">–</span>
              <input
                type="date"
                value={to}
                min={from}
                max={today}
                onChange={(e) => {
                  setAllDates(false);
                  setTo(e.target.value);
                }}
                className="rounded-lg border border-stone-300 px-2 py-1 text-xs outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5 text-right">Bukos broken</th>
                <th className="px-3 py-2.5 text-right">Damaged</th>
                <th className="px-3 py-2.5 text-right">Packs produced</th>
                <th className="px-3 py-2.5">Product</th>
                <th className="px-3 py-2.5">By</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows rows={5} cols={7} />
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-stone-400">
                    No production encoded for this range yet.
                  </td>
                </tr>
              ) : (
                <>
                  {logs.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-stone-100 last:border-0 hover:bg-cream"
                    >
                      <td className="px-3 py-2.5 font-medium text-stone-700">
                        {new Date(l.date).toLocaleDateString("en-PH", {
                          dateStyle: "medium",
                        })}
                        {l.note && (
                          <span className="block text-xs font-normal text-stone-400">
                            {l.note}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-stone-700">
                        {l.bukosBroken}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={l.damaged > 0 ? "text-amber-600" : "text-stone-400"}>
                          {l.damaged}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-stone-800">
                        {l.packsProduced}
                      </td>
                      <td className="px-3 py-2.5 text-stone-500">
                        {l.product?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-stone-500">
                        {l.createdBy?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => requestDelete(l)}
                          className="text-xs font-semibold text-red-500 transition hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-cream font-semibold text-stone-700">
                    <td className="px-3 py-2.5">Total</td>
                    <td className="px-3 py-2.5 text-right">{totals.broken}</td>
                    <td className="px-3 py-2.5 text-right text-amber-600">
                      {totals.damaged}
                    </td>
                    <td className="px-3 py-2.5 text-right">{totals.packs}</td>
                    <td className="px-3 py-2.5"></td>
                    <td className="px-3 py-2.5"></td>
                    <td className="px-3 py-2.5"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        state={confirm}
        loading={confirmLoading}
        onClose={() => setConfirm(null)}
      />
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
      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
        on
          ? "border-brand bg-brand text-white"
          : "border-stone-300 bg-surface text-stone-600 hover:border-brand hover:text-brand-dark"
      }`}
    >
      {label}
    </button>
  );
}
