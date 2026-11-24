"use client";

import { useEffect, useState } from "react";
import { api, type RawMaterial, type Supplier } from "@/lib/client";
import { centsToPesos, formatPeso } from "@/lib/money";
import ConfirmModal, { type ConfirmState } from "@/components/ConfirmModal";
import { SkeletonRows } from "@/components/Skeleton";

type FormState = {
  id?: string;
  name: string;
  unit: string;
  stock: string;
  lowStockThreshold: string;
  cost: string;
  supplierId: string;
  active: boolean;
};

const EMPTY: FormState = {
  name: "",
  unit: "buko",
  stock: "0",
  lowStockThreshold: "0",
  cost: "",
  supplierId: "",
  active: true,
};

export default function RawMaterialsPage() {
  const [items, setItems] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [restock, setRestock] = useState<{ item: RawMaterial; amount: string } | null>(
    null,
  );

  async function load() {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        api.get<{ rawMaterials: RawMaterial[] }>("/api/raw-materials?status=all"),
        api.get<{ suppliers: Supplier[] }>("/api/suppliers"),
      ]);
      setItems(r.rawMaterials);
      setSuppliers(s.suppliers);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setError("");
    setForm({ ...EMPTY });
  }

  function openEdit(r: RawMaterial) {
    setError("");
    setForm({
      id: r.id,
      name: r.name,
      unit: r.unit,
      stock: String(r.stock),
      lowStockThreshold: String(r.lowStockThreshold),
      cost: String(centsToPesos(r.costCents)),
      supplierId: r.supplierId ?? "",
      active: r.active,
    });
  }

  async function doSave() {
    if (!form) return;
    setSaving(true);
    setConfirmLoading(true);
    setError("");
    const payload = {
      name: form.name,
      unit: form.unit,
      stock: parseFloat(form.stock) || 0,
      lowStockThreshold: parseFloat(form.lowStockThreshold) || 0,
      cost: parseFloat(form.cost) || 0,
      supplierId: form.supplierId || null,
      active: form.active,
    };
    try {
      if (form.id) {
        await api.patch(`/api/raw-materials/${form.id}`, payload);
      } else {
        await api.post("/api/raw-materials", payload);
      }
      setForm(null);
      setConfirm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setConfirm(null);
    } finally {
      setSaving(false);
      setConfirmLoading(false);
    }
  }

  function requestSave() {
    if (!form) return;
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (form.id) {
      setConfirm({
        title: "Save changes",
        message: `Apply your changes to "${form.name}"?`,
        confirmLabel: "Save changes",
        onConfirm: doSave,
      });
    } else {
      doSave();
    }
  }

  async function doRestock() {
    if (!restock) return;
    const add = parseFloat(restock.amount) || 0;
    if (add === 0) {
      setRestock(null);
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/api/raw-materials/${restock.item.id}`, { addStock: add });
      setRestock(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not restock");
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(r: RawMaterial) {
    setConfirm({
      title: "Delete raw material",
      message:
        r._count && r._count.products > 0
          ? `"${r.name}" is used by ${r._count.products} product(s). Unlink them first.`
          : `Delete "${r.name}" permanently? This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.del(`/api/raw-materials/${r.id}`);
          setConfirm(null);
          load();
        } catch (err) {
          alert(err instanceof Error ? err.message : "Delete failed");
          setConfirm(null);
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-stone-800">Raw Materials</h1>
        <button
          onClick={openNew}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          + Add Raw Material
        </button>
      </div>
      <p className="mb-4 max-w-[70ch] text-sm text-stone-500">
        Track base stock like <strong>whole buko</strong>. Link a product to a
        raw material (in Inventory) and set how much it uses per sale — e.g. a
        water pack uses <strong>0.25</strong> buko, so one buko makes 4 packs.
        Selling draws from this shared stock automatically.
      </p>

      {/* Capital summary (money tied up in raw stock on hand). */}
      <div className="mb-4 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-brand/30 bg-brand-light px-4 py-2.5">
        <span className="text-sm font-medium text-brand-dark">
          Total capital on hand (puhunan)
        </span>
        <span className="text-xl font-extrabold text-brand-dark">
          {formatPeso(
            items.reduce((s, r) => s + Math.round(r.costCents * r.stock), 0),
          )}
        </span>
        <span className="text-xs text-stone-500">= cost/unit × on hand</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-surface shadow-sm">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="px-4 py-3">Raw material</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3 text-right">Cost / unit</th>
              <th className="px-4 py-3 text-right">On hand</th>
              <th className="px-4 py-3 text-right">Capital</th>
              <th className="px-4 py-3 text-center">Used by</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows rows={5} cols={7} />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                  No raw materials yet. Add one (e.g. &quot;Whole Buko&quot;).
                </td>
              </tr>
            ) : (
              items.map((r) => {
                const low =
                  r.lowStockThreshold > 0 && r.stock <= r.lowStockThreshold;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-stone-100 last:border-0 hover:bg-cream"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-800">
                        {r.name}
                        {!r.active && (
                          <span className="ml-2 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-500">
                            Inactive
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-400">per {r.unit}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {r.supplier?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {r.costCents > 0 ? formatPeso(r.costCents) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          low
                            ? "font-semibold text-amber-600"
                            : "font-medium text-stone-700"
                        }
                      >
                        {+r.stock.toFixed(2)} {r.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-700">
                      {r.costCents > 0
                        ? formatPeso(Math.round(r.costCents * r.stock))
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-stone-500">
                      {r._count?.products ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setRestock({ item: r, amount: "" })}
                        className="mr-3 text-sm font-medium text-emerald-600 transition hover:underline"
                      >
                        Restock
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        className="mr-3 text-sm font-medium text-brand transition hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => requestDelete(r)}
                        className="text-sm font-medium text-red-500 transition hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / edit modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-stone-800">
              {form.id ? "Edit Raw Material" : "New Raw Material"}
            </h2>
            {error && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" className="col-span-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Whole Buko"
                  className={inputCls}
                />
              </Field>
              <Field label="Unit">
                <input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="buko"
                  className={inputCls}
                />
              </Field>
              <Field label="Cost / unit (₱)">
                <input
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Stock on hand">
                <input
                  type="number"
                  step="0.01"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Low-stock alert at">
                <input
                  type="number"
                  step="0.01"
                  value={form.lowStockThreshold}
                  onChange={(e) =>
                    setForm({ ...form, lowStockThreshold: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Supplier" className="col-span-2">
                <select
                  value={form.supplierId}
                  onChange={(e) =>
                    setForm({ ...form, supplierId: e.target.value })
                  }
                  className={inputCls}
                >
                  <option value="">— None —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="col-span-2 flex items-center gap-2 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                Active
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setForm(null)}
                className="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={requestSave}
                disabled={saving || !form.name}
                className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock modal */}
      {restock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold text-stone-800">
              Restock {restock.item.name}
            </h2>
            <p className="mb-4 text-sm text-stone-500">
              Currently {+restock.item.stock.toFixed(2)} {restock.item.unit} on
              hand. Add how many {restock.item.unit}?
            </p>
            <input
              type="number"
              step="0.01"
              autoFocus
              value={restock.amount}
              onChange={(e) =>
                setRestock({ ...restock, amount: e.target.value })
              }
              placeholder="e.g. 100"
              className={inputCls}
            />
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setRestock(null)}
                className="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={doRestock}
                disabled={saving}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Adding…" : "Add stock"}
              </button>
            </div>
          </div>
        </div>
      )}

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
