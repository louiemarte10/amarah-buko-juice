"use client";

import { useEffect, useState } from "react";
import { api, type Supplier } from "@/lib/client";

type Form = {
  id?: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
};

const EMPTY: Form = { name: "", contact: "", phone: "", email: "" };

export default function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { suppliers } = await api.get<{ suppliers: Supplier[] }>(
        "/api/suppliers",
      );
      setItems(suppliers);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!form) return;
    setError("");
    try {
      if (form.id) {
        await api.patch(`/api/suppliers/${form.id}`, form);
      } else {
        await api.post("/api/suppliers", form);
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function remove(s: Supplier) {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    await api.del(`/api/suppliers/${s.id}`);
    load();
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-800">Suppliers</h1>
        <button
          onClick={() => {
            setError("");
            setForm({ ...EMPTY });
          }}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Add Supplier
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {loading ? (
          <p className="text-stone-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-stone-400">No suppliers yet.</p>
        ) : (
          items.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-stone-800">{s.name}</p>
                  {s.contact && (
                    <p className="text-sm text-stone-500">{s.contact}</p>
                  )}
                </div>
                <span className="text-xs text-stone-400">
                  {s._count?.products ?? 0} items
                </span>
              </div>
              <div className="mt-2 space-y-0.5 text-sm text-stone-500">
                {s.phone && <p>📞 {s.phone}</p>}
                {s.email && <p>✉️ {s.email}</p>}
              </div>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => {
                    setError("");
                    setForm({
                      id: s.id,
                      name: s.name,
                      contact: s.contact ?? "",
                      phone: s.phone ?? "",
                      email: s.email ?? "",
                    });
                  }}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(s)}
                  className="text-sm font-medium text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-stone-800">
              {form.id ? "Edit Supplier" : "New Supplier"}
            </h2>
            {error && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="space-y-3">
              {(
                [
                  ["name", "Name"],
                  ["contact", "Contact person"],
                  ["phone", "Phone"],
                  ["email", "Email"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-stone-500">
                    {label}
                  </label>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setForm(null)}
                className="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={!form.name.trim()}
                className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
