"use client";

import { useEffect, useState } from "react";
import {
  api,
  type Category,
  type Product,
  type RawMaterial,
  type Supplier,
} from "@/lib/client";
import { formatPeso } from "@/lib/money";
import ConfirmModal, { type ConfirmState } from "@/components/ConfirmModal";
import { SkeletonRows } from "@/components/Skeleton";

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
  // Stock source: "" = own stock, otherwise the raw material id it's made from.
  rawMaterialId: string;
  rawUsage: string;
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
  rawMaterialId: "",
  rawUsage: "1",
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
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
      const [p, c, s, r] = await Promise.all([
        api.get<{ products: Product[] }>("/api/products?status=active"),
        api.get<{ categories: Category[] }>("/api/categories"),
        api.get<{ suppliers: Supplier[] }>("/api/suppliers"),
        api.get<{ rawMaterials: RawMaterial[] }>("/api/raw-materials"),
      ]);
      setProducts(p.products);
      setCategories(c.categories);
      setSuppliers(s.suppliers);
      setRawMaterials(r.rawMaterials);
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

  async function doSave() {
    if (!form) return;
    setSaving(true);
    setConfirmLoading(true);
    setError("");
    const fromRaw = !!form.rawMaterialId;
    const payload = {
      name: form.name,
      sku: form.sku || null,
      price: parseFloat(form.price) || 0,
      cost: parseFloat(form.cost) || 0,
      // Own-stock products send their stock; raw-linked ones derive it.
      stock: fromRaw ? 0 : parseInt(form.stock) || 0,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 0,
      unit: form.unit,
      categoryId: form.categoryId || null,
      supplierId: form.supplierId || null,
      active: form.active,
      rawMaterialId: form.rawMaterialId || null,
      rawUsage: fromRaw ? parseFloat(form.rawUsage) || 1 : 1,
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
              <SkeletonRows rows={6} cols={6} />
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
                    {p.rawMaterial ? (
                      <p className="text-xs text-brand-dark">
                        from {p.rawMaterial.name} · {p.rawUsage} per sale
                      </p>
                    ) : (
                      p.sku && <p className="text-xs text-stone-400">{p.sku}</p>
                    )}
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
              <div className="col-span-2 rounded-xl border border-stone-200 bg-cream/50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Stock source
                </p>
                <div className="mb-3 flex gap-2">
                  <SourceBtn
                    active={!form.rawMaterialId}
                    onClick={() =>
                      setForm({ ...form, rawMaterialId: "", rawUsage: "1" })
                    }
                  >
                    Own stock
                  </SourceBtn>
                  <SourceBtn
                    active={!!form.rawMaterialId}
                    disabled={rawMaterials.length === 0}
                    onClick={() =>
                      setForm({
                        ...form,
                        rawMaterialId: rawMaterials[0]?.id ?? "",
                        rawUsage: form.rawUsage || "1",
                      })
                    }
                  >
                    Made from raw material
                  </SourceBtn>
                </div>

                {!form.rawMaterialId ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Stock">
                      <input
                        type="number"
                        value={form.stock}
                        onChange={(e) =>
                          setForm({ ...form, stock: e.target.value })
                        }
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
                  </div>
                ) : rawMaterials.length === 0 ? (
                  <p className="text-sm text-stone-500">
                    No raw materials yet — add one on the Raw Materials page first.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Raw material">
                        <select
                          value={form.rawMaterialId}
                          onChange={(e) =>
                            setForm({ ...form, rawMaterialId: e.target.value })
                          }
                          className={inputCls}
                        >
                          {rawMaterials.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({+r.stock.toFixed(2)} {r.unit} left)
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Uses per sale">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.rawUsage}
                          onChange={(e) =>
                            setForm({ ...form, rawUsage: e.target.value })
                          }
                          className={inputCls}
                        />
                      </Field>
                    </div>
                    <p className="mt-2 text-xs text-stone-500">
                      {(() => {
                        const raw = rawMaterials.find(
                          (r) => r.id === form.rawMaterialId,
                        );
                        const usage = parseFloat(form.rawUsage) || 0;
                        if (!raw || usage <= 0)
                          return "Set how much raw stock one sale uses.";
                        const perRaw = Math.round((1 / usage) * 100) / 100;
                        const avail = Math.floor(raw.stock / usage);
                        return `1 ${raw.name} makes ${perRaw} ${form.unit || "unit"}(s). About ${avail} sellable now.`;
                      })()}
                    </p>
                  </>
                )}
              </div>
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

function SourceBtn({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-brand bg-brand text-white"
          : "border-stone-300 bg-surface text-stone-600 hover:border-brand hover:text-brand-dark"
      }`}
    >
      {children}
    </button>
  );
}

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
