"use client";

import { useEffect, useState } from "react";
import { api, type Category } from "@/lib/client";
import ConfirmModal, { type ConfirmState } from "@/components/ConfirmModal";
import { Skeleton } from "@/components/Skeleton";

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { categories } = await api.get<{ categories: Category[] }>(
        "/api/categories",
      );
      setItems(categories);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/categories", { name });
      setName("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add");
    }
  }

  async function rename(c: Category) {
    const next = prompt("Rename category", c.name);
    if (!next || next === c.name) return;
    try {
      await api.patch(`/api/categories/${c.id}`, { name: next });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not rename");
    }
  }

  function requestRemove(c: Category) {
    setConfirm({
      title: "Delete category",
      message: `Delete "${c.name}"? Products keep, but become uncategorised.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.del(`/api/categories/${c.id}`);
          setConfirm(null);
          load();
        } catch (err) {
          alert(err instanceof Error ? err.message : "Could not delete");
          setConfirm(null);
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-stone-800">Categories</h1>

      <form onSubmit={add} className="mb-5 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-lg border border-stone-300 bg-surface px-4 py-2 outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-surface shadow-sm">
        {loading ? (
          <div className="space-y-4 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-stone-400">No categories yet.</p>
        ) : (
          items.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="font-medium text-stone-800">{c.name}</p>
                <p className="text-xs text-stone-400">
                  {c._count?.products ?? 0} product
                  {(c._count?.products ?? 0) === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => rename(c)}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Rename
                </button>
                <button
                  onClick={() => requestRemove(c)}
                  className="text-sm font-medium text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        state={confirm}
        loading={confirmLoading}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
