"use client";

import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/client";
import { formatPeso } from "@/lib/money";
import ConfirmModal, { type ConfirmState } from "@/components/ConfirmModal";

export default function ArchivePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { products } = await api.get<{ products: Product[] }>(
        "/api/products?status=archived",
      );
      setProducts(products);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function bulkAction(action: "restore" | "delete", ids: string[]) {
    setConfirmLoading(true);
    setNotice("");
    try {
      const res = await api.post<{ deleted?: number; blocked?: number }>(
        "/api/products/bulk",
        { action, ids },
      );
      if (action === "delete" && res.blocked) {
        setNotice(
          `${res.blocked} product${res.blocked === 1 ? "" : "s"} had sales history and were kept archived (can't be fully deleted).`,
        );
      }
      setConfirm(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
      setConfirm(null);
    } finally {
      setConfirmLoading(false);
    }
  }

  function requestRestore(ids: string[], label: string) {
    setConfirm({
      title: "Restore product",
      message: `Restore ${label}? ${ids.length === 1 ? "It" : "They"} will return to your active inventory and the POS.`,
      confirmLabel: "Restore",
      onConfirm: () => bulkAction("restore", ids),
    });
  }

  function requestDelete(ids: string[], label: string) {
    setConfirm({
      title: "Delete permanently",
      message: `Permanently delete ${label}? This cannot be undone. Products with past sales will stay archived to protect your records.`,
      confirmLabel: "Delete forever",
      danger: true,
      onConfirm: () => bulkAction("delete", ids),
    });
  }

  const allSelected =
    products.length > 0 && products.every((p) => selected.has(p.id));

  function toggleAll() {
    setSelected((prev) =>
      products.every((p) => prev.has(p.id))
        ? new Set()
        : new Set(products.map((p) => p.id)),
    );
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
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-stone-800">Archived Products</h1>
      </div>
      <p className="mb-4 text-sm text-stone-500">
        Archived items are hidden from the POS. Restore them to sell again, or
        delete permanently.
      </p>

      {notice && (
        <div className="mb-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
          {notice}
        </div>
      )}

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-brand-light px-4 py-2.5">
          <span className="text-sm font-medium text-brand-dark">
            {selected.size} selected
          </span>
          <button
            onClick={() => requestRestore([...selected], `${selected.size} products`)}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Restore selected
          </button>
          <button
            onClick={() => requestDelete([...selected], `${selected.size} products`)}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete selected
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
        <table className="w-full min-w-[640px] text-sm">
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
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-stone-400">
                  🗃️ Nothing archived. Items you archive from Inventory show up
                  here.
                </td>
              </tr>
            ) : (
              products.map((p) => (
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
                  <td className="px-4 py-3 text-right text-stone-500">
                    {p.stock} {p.unit}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => requestRestore([p.id], `"${p.name}"`)}
                      className="mr-3 text-sm font-medium text-brand hover:underline"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => requestDelete([p.id], `"${p.name}"`)}
                      className="text-sm font-medium text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
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
