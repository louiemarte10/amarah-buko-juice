"use client";

import { useState } from "react";

type Block =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "note"; text: string; tone?: "info" | "warn" };

type Step = { id: string; label: string; title: string; blocks: Block[] };

const STEPS: Step[] = [
  {
    id: "start",
    label: "Getting started",
    title: "Signing in",
    blocks: [
      {
        kind: "p",
        text: "Open the app and sign in with the email and password your admin gave you. There are two access levels: **Admin** (full access) and **Cashier** (Point of Sale and Sales History only).",
      },
      {
        kind: "list",
        items: [
          "**Admins** see everything: Dashboard, Inventory, Archived, Categories, Suppliers, Staff.",
          "**Cashiers** see the Point of Sale and Sales History — everything they need to serve customers.",
          "Use the **Light / Dark** switch at the bottom of the sidebar anytime.",
        ],
      },
      {
        kind: "note",
        text: "Change the demo password right away: go to **Staff → Edit** and set a new password.",
      },
    ],
  },
  {
    id: "sell",
    label: "Make a sale",
    title: "Point of Sale",
    blocks: [
      {
        kind: "p",
        text: "The **Point of Sale** screen is where you ring up orders. Tap products to add them to the order on the right.",
      },
      {
        kind: "list",
        items: [
          "Filter by category or use the **search box** to find a product fast.",
          "Tap a product to add it; use **+ / −** to change quantity, or ✕ to remove.",
          "Add a **discount** in pesos if needed.",
          "Pick the payment method — **Cash, GCash, or Card**. For cash, type the amount received and the **change** is computed automatically.",
          "Press **Charge** to complete the sale.",
        ],
      },
      {
        kind: "note",
        text: "A product shows **Out of stock** and can't be added once its stock hits zero — so you never oversell.",
      },
    ],
  },
  {
    id: "invoice",
    label: "Invoice & receipt",
    title: "Invoices save automatically",
    blocks: [
      {
        kind: "p",
        text: "The moment you press **Charge**, a **sales invoice** is created with its own invoice number and **saved automatically to Sales History** — nothing to do manually.",
      },
      {
        kind: "list",
        items: [
          "A printable invoice pops up right after the sale — press **Print** to print it, or **New Sale** to continue.",
          "Every sale lowers the stock of the items sold.",
          "Open **Sales History** anytime and click any sale to **re-open and reprint** its invoice.",
        ],
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    title: "Managing products",
    blocks: [
      {
        kind: "p",
        text: "The **Inventory** page (admins) lists your active products with price and stock. Low stock shows in amber.",
      },
      {
        kind: "list",
        items: [
          "**+ Add Product** to create one — name, price, cost, stock, unit, category and supplier.",
          "**Edit** changes any detail. You'll be asked to confirm an update.",
          "Tick the checkboxes (or the header box to **select all**) to act on many at once.",
          "**Archive** removes a product from the POS without deleting its history.",
        ],
      },
      {
        kind: "note",
        text: "Set a **Low-stock alert** number per product. When stock reaches it, the item appears in the Dashboard's Low Stock list.",
      },
    ],
  },
  {
    id: "raw",
    label: "Raw materials",
    title: "Your buko stock",
    blocks: [
      {
        kind: "p",
        text: "**Raw Materials** holds the base stock you buy — your **whole buko**. Add it once, then **Restock** whenever you buy more.",
      },
      {
        kind: "list",
        items: [
          "Add **Whole Buko** (unit `buko`) with how many you have on hand and a low-stock alert.",
          "Sell the **whole coconut**? Make a product that uses a **fixed** amount per sale — e.g. **Whole Buko** uses **1** buko per sale (set this in Inventory → Stock source → Made from raw material).",
          "For packs, the yield varies (some bukos have no water), so you encode those on the **Production** page instead — see the next step.",
          "**Restock** adds more buko; the Dashboard warns you when buko runs low.",
        ],
      },
    ],
  },
  {
    id: "production",
    label: "Production",
    title: "Encode your daily breakage",
    blocks: [
      {
        kind: "p",
        text: "Pack yield isn't fixed — a buko with no water is **damage** — so each day you **encode** what you actually made on the **Production** page.",
      },
      {
        kind: "list",
        items: [
          "Pick the **date**, enter **bukos broken** (e.g. 9), **damaged** (no water), and the **packs produced** you counted.",
          "Choose which product the packs go to (**Buko Water Pack**).",
          "Saving **adds the packs to that product's stock** (ready to sell) and **subtracts the broken bukos** from your buko stock.",
          "The **History** table keeps every day — filter by Today, Yesterday, 7 days, or a date range to backtrack.",
        ],
      },
      {
        kind: "note",
        text: "So the flow is: buy buko (**Raw Materials**) → break & count packs (**Production**) → sell packs (**Point of Sale**).",
      },
    ],
  },
  {
    id: "archive",
    label: "Archiving",
    title: "Archive, restore, delete",
    blocks: [
      {
        kind: "p",
        text: "Archiving is a safe alternative to deleting. Archived products leave the POS but keep their sales records.",
      },
      {
        kind: "list",
        items: [
          "From **Inventory**, use **Archive** (single or bulk) to shelve products you're not selling right now.",
          "Open the **Archived** page to **Restore** them (undo) or **Delete permanently**.",
          "Products that appear in past sales can't be fully deleted — they stay archived to protect your records.",
        ],
      },
    ],
  },
  {
    id: "catalog",
    label: "Categories & suppliers",
    title: "Organising your catalog",
    blocks: [
      {
        kind: "p",
        text: "Keep products tidy with **Categories** (e.g. Buko Drinks, Add-ons) and track where stock comes from with **Suppliers**.",
      },
      {
        kind: "list",
        items: [
          "Add categories, then assign them when creating or editing a product.",
          "Add suppliers with a contact person, phone and email for easy restocking.",
          "Deleting a category or supplier keeps the products — they just lose that link.",
        ],
      },
    ],
  },
  {
    id: "reports",
    label: "Dashboard",
    title: "Reading your numbers",
    blocks: [
      {
        kind: "p",
        text: "The **Dashboard** gives you the day at a glance — today's sales, the last 7 days, your best sellers, and what's running low.",
      },
      {
        kind: "list",
        items: [
          "**Today's Sales** and **Last 7 Days** update automatically as you ring up orders.",
          "**Best Sellers** shows your top products over the last 30 days.",
          "**Low Stock Alerts** tells you what to restock before you run out.",
        ],
      },
    ],
  },
  {
    id: "staff",
    label: "Staff & roles",
    title: "Managing your team",
    blocks: [
      {
        kind: "p",
        text: "On the **Staff** page (admins) you add team members and control what they can do.",
      },
      {
        kind: "list",
        items: [
          "**+ Add Staff** creates an account with a name, email, password and role.",
          "**Edit** changes a staff member's name, role, or password.",
          "**Manage roles** lets you create as many roles as you like (e.g. Manager, Supervisor). Each role is either **Admin access** or cashier-level.",
          "**Deactivate** blocks someone from signing in without deleting them. You can't deactivate your own account.",
        ],
      },
      {
        kind: "note",
        text: "That's it — you're ready to run Amarah Fresh Buko's. 🥥",
      },
    ],
  },
];

function Rich({ text }: { text: string }) {
  // Render **bold** segments.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <span key={i} className="font-semibold text-stone-800">
            {p.slice(2, -2)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  if (b.kind === "p")
    return (
      <p className="max-w-[75ch] text-sm leading-relaxed text-stone-600">
        <Rich text={b.text} />
      </p>
    );
  if (b.kind === "note")
    return (
      <div
        className={`max-w-[75ch] rounded-lg border px-4 py-3 text-sm leading-relaxed ${
          b.tone === "warn"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-brand/30 bg-brand-light/50 text-stone-700"
        }`}
      >
        <Rich text={b.text} />
      </div>
    );
  return (
    <ul className="max-w-[75ch] space-y-2">
      {b.items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-stone-600">
          <span aria-hidden className="mt-1 text-xs text-brand">
            ●
          </span>
          <span className="flex-1">
            <Rich text={t} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function GuidePage() {
  const [at, setAt] = useState(0);
  const [showData, setShowData] = useState(false);
  const step = STEPS[at];

  return (
    <div className="space-y-4 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">
            How to use Amarah Fresh Buko&apos;s
          </h1>
          <p className="mt-1 max-w-[75ch] text-sm text-stone-500">
            A quick, step-by-step walkthrough of the POS &amp; Inventory system —
            from ringing up a sale to managing stock and staff.
          </p>
        </div>
        <button
          onClick={() => setShowData(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-brand bg-brand-light px-3 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand hover:text-white"
        >
          🗄️ Where&apos;s my data?
        </button>
      </header>

      {/* Step tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STEPS.map((s, i) => {
          const on = i === at;
          return (
            <button
              key={s.id}
              onClick={() => setAt(i)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                on
                  ? "border-brand bg-brand text-white"
                  : "border-stone-200 bg-surface text-stone-600 hover:border-brand hover:text-brand-dark"
              }`}
            >
              <span className={on ? "text-white/70" : "text-stone-400"}>
                {i + 1}
              </span>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <section className="rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm sm:p-7">
        <h2 className="flex items-baseline gap-3 text-lg font-bold text-stone-800">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand text-xs font-bold text-brand-dark">
            {at + 1}
          </span>
          {step.title}
        </h2>

        <div className="mt-4 space-y-3.5">
          {step.blocks.map((b, i) => (
            <BlockView key={i} b={b} />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
          <button
            onClick={() => setAt((v) => Math.max(0, v - 1))}
            disabled={at === 0}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-brand hover:text-brand-dark disabled:opacity-40"
          >
            ← {at > 0 ? STEPS[at - 1].label : "Back"}
          </button>
          <span className="text-xs text-stone-400">
            {at + 1} of {STEPS.length}
          </span>
          <button
            onClick={() => setAt((v) => Math.min(STEPS.length - 1, v + 1))}
            disabled={at === STEPS.length - 1}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-brand hover:text-brand-dark disabled:opacity-40"
          >
            {at < STEPS.length - 1 ? STEPS[at + 1].label : "Done"} →
          </button>
        </div>
      </section>

      {showData && <DataModal onClose={() => setShowData(false)} />}
    </div>
  );
}

function DataModal({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["Host", "Neon (neon.tech) — cloud Postgres"],
    ["Project", "Amarah"],
    ["Region", "Singapore (ap-southeast-1)"],
    ["Database", "neondb"],
    ["Branch", "production"],
  ];
  const steps = [
    "Go to neon.tech and click Sign in (use the account you made the project with).",
    "Open the Amarah project from your dashboard.",
    "In the left menu, click Tables to browse your data.",
    "Click any table — Product, RawMaterial, Sale, User… — to view, search and sort rows.",
    "Prefer queries? Open the SQL Editor and run the example below.",
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-stone-800">
            🗄️ Where your data is stored
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-stone-600">
          Everything the app saves — products, raw materials (buko), sales and
          staff — lives in a <strong>cloud Postgres database hosted on Neon</strong>.
          It&apos;s <strong>not</strong> on your computer or inside the app code, so
          your data is safe even if your laptop breaks, and the live website and
          your local app share the <strong>same</strong> database.
        </p>

        <div className="mb-4 overflow-hidden rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([k, v], i) => (
                <tr
                  key={k}
                  className={i % 2 ? "bg-cream" : ""}
                >
                  <td className="px-3 py-2 font-medium text-stone-500">{k}</td>
                  <td className="px-3 py-2 text-stone-800">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mb-2 text-sm font-bold text-stone-800">
          How to see it on the Neon website
        </h3>
        <ol className="mb-4 space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-stone-600">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span className="flex-1">{s}</span>
            </li>
          ))}
        </ol>

        <pre className="mb-4 overflow-x-auto rounded-lg bg-stone-100 p-3 text-xs text-stone-700">
          <code>{`select name, "priceCents", stock
from "Product" order by name;

select * from "RawMaterial";`}</code>
        </pre>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-700">
          🔒 <strong>Keep it private.</strong> Your database password and
          connection strings (in the project&apos;s <code>.env</code> file and in
          Vercel&apos;s Environment Variables) should never be shared or posted
          online. On Neon you can find them under <strong>Connect</strong>.
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
