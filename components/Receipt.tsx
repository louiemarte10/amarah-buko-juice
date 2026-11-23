"use client";

import { type Sale } from "@/lib/client";
import { formatPeso } from "@/lib/money";

export default function Receipt({
  sale,
  onClose,
}: {
  sale: Sale;
  onClose: () => void;
}) {
  const date = new Date(sale.createdAt).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:bg-white print:p-0">
      <div className="w-full max-w-xs rounded-2xl bg-surface p-5 shadow-2xl print:max-w-full print:shadow-none print:bg-white">
        <div id="receipt" className="text-stone-800">
          <div className="mb-3 text-center">
            <div className="text-2xl">🥥</div>
            <h2 className="text-lg font-bold">Amarah Fresh Buko&apos;s</h2>
            <p className="mt-0.5 inline-block rounded bg-brand-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-dark">
              Sales Invoice
            </p>
          </div>

          <div className="mb-2 space-y-0.5 text-xs text-stone-500">
            <div className="flex justify-between">
              <span>Invoice No.</span>
              <span className="font-mono font-semibold text-stone-700">
                {sale.reference}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{date}</span>
            </div>
            {sale.cashier && (
              <div className="flex justify-between">
                <span>Cashier</span>
                <span>{sale.cashier.name}</span>
              </div>
            )}
          </div>

          <div className="my-2 border-t border-dashed border-stone-300" />

          <table className="w-full text-sm">
            <tbody>
              {sale.items.map((it) => (
                <tr key={it.id} className="align-top">
                  <td className="py-1">
                    {it.productName}
                    <span className="block text-xs text-stone-400">
                      {it.quantity} × {formatPeso(it.unitCents)}
                    </span>
                  </td>
                  <td className="py-1 text-right font-medium">
                    {formatPeso(it.lineCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="my-2 border-t border-dashed border-stone-300" />

          <div className="space-y-1 text-sm">
            <Line label="Subtotal" value={formatPeso(sale.subtotalCents)} />
            {sale.discountCents > 0 && (
              <Line label="Discount" value={"−" + formatPeso(sale.discountCents)} />
            )}
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatPeso(sale.totalCents)}</span>
            </div>
            <Line label={`Paid (${sale.paymentMethod})`} value={formatPeso(sale.cashCents)} />
            {sale.changeCents > 0 && (
              <Line label="Change" value={formatPeso(sale.changeCents)} />
            )}
          </div>

          <p className="mt-4 text-center text-xs text-stone-400">
            Salamat! Come again 🥥
          </p>
        </div>

        <div className="mt-4 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 rounded-lg border border-stone-300 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-stone-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
