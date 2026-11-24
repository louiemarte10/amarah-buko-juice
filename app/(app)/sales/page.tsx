"use client";

import { useEffect, useState } from "react";
import { api, type Role, type Sale } from "@/lib/client";
import { formatPeso } from "@/lib/money";
import Receipt from "@/components/Receipt";
import { SkeletonRows } from "@/components/Skeleton";
import ConfirmModal, { type ConfirmState } from "@/components/ConfirmModal";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function load() {
    const { sales } = await api.get<{ sales: Sale[] }>("/api/sales?limit=100");
    setSales(sales);
  }

  useEffect(() => {
    (async () => {
      try {
        const [, me] = await Promise.all([
          load(),
          api
            .get<{ user: { role: Role } }>("/api/auth/me")
            .catch(() => ({ user: { role: "CASHIER" as Role } })),
        ]);
        setRole(me.user.role);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isAdmin = role === "ADMIN";
  const totalShown = sales.reduce((s, x) => s + x.totalCents, 0);
  const cols = isAdmin ? 7 : 6;

  function requestDelete(s: Sale) {
    setConfirm({
      title: "Delete sale",
      message: `Delete sale ${s.reference} (${formatPeso(
        s.totalCents,
      )})? Its items will be returned to stock. This can't be undone.`,
      confirmLabel: "Delete sale",
      danger: true,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.del(`/api/sales/${s.id}`);
          setConfirm(null);
          if (selected?.id === s.id) setSelected(null);
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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-stone-800">Sales History</h1>
        <p className="text-sm text-stone-500">
          {sales.length} sales · {formatPeso(totalShown)}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-surface shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Cashier</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Total</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows rows={6} cols={cols} />
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={cols} className="px-4 py-8 text-center text-stone-400">
                  No sales yet.
                </td>
              </tr>
            ) : (
              sales.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="cursor-pointer border-b border-stone-100 last:border-0 hover:bg-cream"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-stone-700">
                    {s.reference}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {new Date(s.createdAt).toLocaleString("en-PH", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {s.cashier?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {s.items.reduce((a, i) => a + i.quantity, 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                      {s.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-800">
                    {formatPeso(s.totalCents)}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDelete(s);
                        }}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <p className="mt-3 text-xs text-stone-400">
          Deleting a sale returns its items to stock. Admins only.
        </p>
      )}

      {selected && <Receipt sale={selected} onClose={() => setSelected(null)} />}

      <ConfirmModal
        state={confirm}
        loading={confirmLoading}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
