"use client";

import { useEffect, useState } from "react";
import { api, type UserRow } from "@/lib/client";

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "CASHIER" as "CASHIER" | "ADMIN",
  });
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { users } = await api.get<{ users: UserRow[] }>("/api/users");
      setUsers(users);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    setError("");
    try {
      await api.post("/api/users", form);
      setForm({ name: "", email: "", password: "", role: "CASHIER" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add user");
    }
  }

  async function toggleActive(u: UserRow) {
    try {
      await api.patch(`/api/users/${u.id}`, { active: !u.active });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update");
    }
  }

  async function changeRole(u: UserRow) {
    const next = u.role === "ADMIN" ? "CASHIER" : "ADMIN";
    if (!confirm(`Make ${u.name} a ${next.toLowerCase()}?`)) return;
    await api.patch(`/api/users/${u.id}`, { role: next });
    load();
  }

  async function resetPassword(u: UserRow) {
    const pw = prompt(`New password for ${u.name} (min 6 chars)`);
    if (!pw) return;
    try {
      await api.patch(`/api/users/${u.id}`, { password: pw });
      alert("Password updated.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not reset");
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-800">Staff</h1>
        <button
          onClick={() => {
            setError("");
            setShowForm((v) => !v);
          }}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          {showForm ? "Close" : "+ Add Staff"}
        </button>
      </div>

      {showForm && (
        <div className="mb-5 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputCls}
            />
            <input
              placeholder="Password (min 6)"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputCls}
            />
            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as "CASHIER" | "ADMIN" })
              }
              className={inputCls}
            >
              <option value="CASHIER">Cashier</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
          <button
            onClick={add}
            disabled={!form.name || !form.email || form.password.length < 6}
            className="mt-3 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            Create account
          </button>
        </div>
      )}

      <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-center text-stone-400">Loading…</p>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div>
                <p className="font-medium text-stone-800">
                  {u.name}{" "}
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                      u.role === "ADMIN"
                        ? "bg-brand-light text-brand-dark"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {u.role === "ADMIN" ? "Admin" : "Cashier"}
                  </span>
                  {!u.active && (
                    <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                      Inactive
                    </span>
                  )}
                </p>
                <p className="text-xs text-stone-400">{u.email}</p>
              </div>
              <div className="flex gap-3 text-sm font-medium">
                <button
                  onClick={() => changeRole(u)}
                  className="text-brand hover:underline"
                >
                  Change role
                </button>
                <button
                  onClick={() => resetPassword(u)}
                  className="text-stone-500 hover:underline"
                >
                  Reset PW
                </button>
                <button
                  onClick={() => toggleActive(u)}
                  className="text-red-500 hover:underline"
                >
                  {u.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
