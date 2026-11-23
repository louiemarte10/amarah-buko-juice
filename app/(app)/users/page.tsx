"use client";

import { useEffect, useState } from "react";
import { api, type StaffRole, type UserRow } from "@/lib/client";
import ConfirmModal, { type ConfirmState } from "@/components/ConfirmModal";
import { Skeleton } from "@/components/Skeleton";

type EditForm = {
  id: string;
  name: string;
  staffRoleId: string;
  password: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [meId, setMeId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    staffRoleId: "",
  });
  const [addError, setAddError] = useState("");

  const [edit, setEdit] = useState<EditForm | null>(null);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const [rolesOpen, setRolesOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", isAdmin: false });
  const [roleError, setRoleError] = useState("");

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function load() {
    try {
      const [u, r, me] = await Promise.all([
        api.get<{ users: UserRow[] }>("/api/users"),
        api.get<{ roles: StaffRole[] }>("/api/roles"),
        api.get<{ user: { id: string } }>("/api/auth/me"),
      ]);
      setUsers(u.users);
      setRoles(r.roles);
      setMeId(me.user.id);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function roleLabel(u: UserRow) {
    return u.staffRole?.name ?? (u.role === "ADMIN" ? "Administrator" : "Cashier");
  }
  function isAdminRole(u: UserRow) {
    return u.staffRole ? u.staffRole.isAdmin : u.role === "ADMIN";
  }

  async function addStaff() {
    setAddError("");
    try {
      await api.post("/api/users", addForm);
      setAddForm({ name: "", email: "", password: "", staffRoleId: "" });
      setShowAdd(false);
      load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add user");
    }
  }

  async function saveEdit() {
    if (!edit) return;
    setSaving(true);
    setEditError("");
    const payload: Record<string, unknown> = {
      name: edit.name,
      staffRoleId: edit.staffRoleId,
    };
    if (edit.password) payload.password = edit.password;
    try {
      await api.patch(`/api/users/${edit.id}`, payload);
      setEdit(null);
      load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function requestToggleActive(u: UserRow) {
    const deactivating = u.active;
    if (!deactivating) {
      // Reactivate immediately, no confirm needed.
      api.patch(`/api/users/${u.id}`, { active: true }).then(load);
      return;
    }
    setConfirm({
      title: "Deactivate staff",
      message: `Deactivate ${u.name}? They won't be able to sign in until reactivated.`,
      confirmLabel: "Deactivate",
      danger: true,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.patch(`/api/users/${u.id}`, { active: false });
          setConfirm(null);
          load();
        } catch (err) {
          alert(err instanceof Error ? err.message : "Could not update");
          setConfirm(null);
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }

  async function addRole() {
    setRoleError("");
    try {
      await api.post("/api/roles", newRole);
      setNewRole({ name: "", isAdmin: false });
      load();
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Could not add role");
    }
  }

  async function deleteRole(r: StaffRole) {
    try {
      await api.del(`/api/roles/${r.id}`);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete role");
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-stone-800">Staff</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setRolesOpen(true)}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
          >
            Manage roles
          </button>
          <button
            onClick={() => {
              setAddError("");
              setShowAdd((v) => !v);
            }}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            {showAdd ? "Close" : "+ Add Staff"}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="mb-5 rounded-xl border border-stone-200 bg-surface p-4 shadow-sm">
          {addError && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {addError}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Full name"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className={inputCls}
            />
            <input
              placeholder="Email"
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              className={inputCls}
            />
            <input
              placeholder="Password (min 6)"
              type="text"
              value={addForm.password}
              onChange={(e) =>
                setAddForm({ ...addForm, password: e.target.value })
              }
              className={inputCls}
            />
            <select
              value={addForm.staffRoleId}
              onChange={(e) =>
                setAddForm({ ...addForm, staffRoleId: e.target.value })
              }
              className={inputCls}
            >
              <option value="">Select role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.isAdmin ? " (admin access)" : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={addStaff}
            disabled={
              !addForm.name ||
              !addForm.email ||
              addForm.password.length < 6 ||
              !addForm.staffRoleId
            }
            className="mt-3 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            Create account
          </button>
        </div>
      )}

      <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-surface shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-8 w-28" />
              </div>
            ))}
          </div>
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
                      isAdminRole(u)
                        ? "bg-brand-light text-brand-dark"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {roleLabel(u)}
                  </span>
                  {!u.active && (
                    <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                      Inactive
                    </span>
                  )}
                  {u.id === meId && (
                    <span className="ml-1 text-xs text-stone-400">(you)</span>
                  )}
                </p>
                <p className="text-xs text-stone-400">{u.email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditError("");
                    setEdit({
                      id: u.id,
                      name: u.name,
                      staffRoleId: u.staffRoleId ?? "",
                      password: "",
                    });
                  }}
                  className="rounded-lg bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-200"
                >
                  Edit
                </button>
                {u.id !== meId && (
                  <button
                    onClick={() => requestToggleActive(u)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      u.active
                        ? "text-red-600 hover:bg-red-50"
                        : "text-brand hover:bg-brand-light"
                    }`}
                  >
                    {u.active ? "Deactivate" : "Activate"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit staff modal */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-stone-800">Edit Staff</h2>
            {editError && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {editError}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Name</label>
                <input
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select
                  value={edit.staffRoleId}
                  onChange={(e) =>
                    setEdit({ ...edit, staffRoleId: e.target.value })
                  }
                  className={inputCls}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.isAdmin ? " (admin access)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  New password{" "}
                  <span className="font-normal text-stone-400">
                    (leave blank to keep current)
                  </span>
                </label>
                <input
                  type="text"
                  value={edit.password}
                  onChange={(e) =>
                    setEdit({ ...edit, password: e.target.value })
                  }
                  placeholder="••••••"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setEdit(null)}
                className="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !edit.name.trim() || !edit.staffRoleId}
                className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage roles modal */}
      {rolesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-800">Manage Roles</h2>
              <button
                onClick={() => setRolesOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 divide-y divide-stone-100 rounded-lg border border-stone-200">
              {roles.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-stone-800">
                      {r.name}
                    </span>
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                        r.isAdmin
                          ? "bg-brand-light text-brand-dark"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {r.isAdmin ? "Admin access" : "Cashier access"}
                    </span>
                    <span className="ml-2 text-xs text-stone-400">
                      {r._count?.users ?? 0} staff
                    </span>
                  </div>
                  <button
                    onClick={() => deleteRole(r)}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            {roleError && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {roleError}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={newRole.name}
                onChange={(e) =>
                  setNewRole({ ...newRole, name: e.target.value })
                }
                placeholder="New role name (e.g. Manager)"
                className={`${inputCls} flex-1`}
              />
              <label className="flex items-center gap-1.5 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={newRole.isAdmin}
                  onChange={(e) =>
                    setNewRole({ ...newRole, isAdmin: e.target.checked })
                  }
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                Admin access
              </label>
              <button
                onClick={addRole}
                disabled={!newRole.name.trim()}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                Add role
              </button>
            </div>
            <p className="mt-3 text-xs text-stone-400">
              &quot;Admin access&quot; roles can manage inventory, staff and
              reports. Others get the POS and sales history only.
            </p>
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
  "w-full rounded-lg border border-stone-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
const labelCls = "mb-1 block text-xs font-medium text-stone-500";
