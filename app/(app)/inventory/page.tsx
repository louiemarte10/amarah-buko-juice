"use client";

import { useEffect, useState } from "react";
import {
  api,
  type Category,
  type Product,
  type Supplier,
} from "@/lib/client";
import { centsToPesos, formatPeso } from "@/lib/money";
import ConfirmModal, { type ConfirmState } from "@/components/ConfirmModal";

type FormState = {
  id?: string;
  name: string;
  sku: string;
  price: string;
  cost: string;
  stock: string;
  lowStockThreshold: string;
  unit: string;
  categoryId: string;
  supplierId: string;
  active: boolean;
};

const EMPTY: FormState = {
  name: "",
  sku: "",
  price: "",
  cost: "",
  stock: "0",
  lowStockThreshold: "10",
  unit: "pc",
  categoryId: "",
  supplierId: "",
  active: true,
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        api.get<{ products: Product[] }>("/api/products?status=active"),
        api.get<{ categories: Category[] }>("/api/categories"),
        api.get<{ suppliers: Supplier[] }>("/api/suppliers"),
      ]);
      setProducts(p.products);
      setCategories(c.categories);
      setSuppliers(s.suppliers);
      setSelected(new Set());
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

  function openEdit(p: Product) {
    setError("");
    setForm({
      id: p.id,
      name: p.name,
      sku: p.sku ?? "",
      price: String(centsToPesos(p.priceCents)),
      cost: String(centsToPesos(p.costCents)),
      stock: String(p.stock),
      lowStockThreshold: String(p.lowStockThreshold),
      unit: p.unit,
      categoryId: p.categoryId ?? "",
      supplierId: p.supplierId ?? "",
      active: p.active,
    });
  }

  async function doSave() {
    if (!form) return;
    setSaving(true);
    setConfirmLoading(true);
    setError("");
    const payload = {
      name: form.name,
      sku: form.sku || null,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      stock: parseInt(form.stock) || 0,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 0,
      unit: form.unit,
      categoryId: form.categoryId || null,
      supplierId: form.supplierId || null,
      active: form.active,
    };
    try {
      if (form.id) {
        await api.patch(`/api/products/${form.id}`, payload);
      } else {
        await api.post("/api/products", payload);
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

  // Updating an existing product asks for confirmation; new products save directly.
  function requestSave() {
    if (!form) return;
    if (!form.name.trim()) {
      setError("Product name is required");
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

  async function bulkAction(action: "archive", ids: string[]) {
    setConfirmLoading(true);
    try {
      await api.post("/api/products/bulk", { action, ids });
      setConfirm(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
      setConfirm(null);
    } finally {
      setConfirmLoading(false);
    }
  }

  function requestArchive(p: Product) {
    setConfirm({
      title: "Archive product",
      message: `Archive "${p.name}"? It will move to the Archived page and stop appearing in the POS. You can restore it anytime.`,
      confirmLabel: "Archive",
      danger: true,
      onConfirm: () => bulkAction("archive", [p.id]),
    });
  }

  function requestArchiveSelected() {
    const ids = [...selected];
    setConfirm({
      title: "Archive selected",
      message: `Archive ${ids.length} product${ids.length === 1 ? "" : "s"}? They'll move to the Archived page and can be restored later.`,
      confirmLabel: `Archive ${ids.length}`,
      danger: true,
      onConfirm: () => bulkAction("archive", ids),
    });
  }

  const visible = products.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase()),
  );
  const allSelected = visible.length > 0 && visible.every((p) => selected.has(p.id));

  function toggleAll() {
    setSelected((prev) => {
      if (visible.every((p) => prev.has(p.id))) {
        const next = new Set(prev);
        visible.forEach((p) => next.delete(p.id));
        return next;
      }
      return new Set([...prev, ...visible.map((p) => p.id)]);
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-stone-800">Inventory</h1>
        <button
          onClick={openNew}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Add Product
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search…"
        className="mb-4 w-full max-w-sm rounded-lg border border-stone-300 bg-surface px-4 py-2 outline-none focus:border-brand"
      />

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-brand-light px-4 py-2.5">
          <span className="text-sm font-medium text-brand-dark">
            {selected.size} selected
          </span>
          <button
            onClick={requestArchiveSelected}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Archive selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm font-medium text-stone-600 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-surface shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  Loading…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  No products yet.
                </td>
              </tr>
            ) : (
              visible.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-stone-100 last:border-0 hover:bg-cream ${
                    selected.has(p.id) ? "bg-brand-light/40" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      className="h-4 w-4 accent-[var(--color-brand)]"
                      aria-label={`Select ${p.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-800">{p.name}</p>
                    {p.sku && <p className="text-xs text-stone-400">{p.sku}</p>}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {p.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-stone-700">
                    {formatPeso(p.priceCents)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        p.stock <= p.lowStockThreshold
                          ? "font-semibold text-amber-600"
                          : "text-stone-700"
                      }
                    >
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(p)}
                      className="mr-3 text-sm font-medium text-brand hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => requestArchive(p)}
                      className="text-sm font-medium text-red-500 hover:underline"
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-stone-800">
              {form.id ? "Edit Product" : "New Product"}
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
                  className={inputCls}
                />
              </Field>
              <Field label="SKU (optional)">
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Unit">
                <input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Price (₱)">
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Cost (₱)">
                <input
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Stock">
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Low-stock alert at">
                <input
                  type="number"
                  value={form.lowStockThreshold}
                  onChange={(e) =>
                    setForm({ ...form, lowStockThreshold: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Category">
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  className={inputCls}
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Supplier">
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
                Active (available in POS)
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setForm(null)}
                className="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={requestSave}
                disabled={saving || !form.name}
                className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
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
