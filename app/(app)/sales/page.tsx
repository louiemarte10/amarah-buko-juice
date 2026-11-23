"use client";

import { useEffect, useState } from "react";
import { api, type Sale } from "@/lib/client";
import { formatPeso } from "@/lib/money";
import Receipt from "@/components/Receipt";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Sale | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { sales } = await api.get<{ sales: Sale[] }>("/api/sales?limit=100");
        setSales(sales);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalShown = sales.reduce((s, x) => s + x.totalCents, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-stone-800">Sales History</h1>
        <p className="text-sm text-stone-500">
          {sales.length} sales · {formatPeso(totalShown)}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400">
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Cashier</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  Loading…
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <Receipt sale={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
