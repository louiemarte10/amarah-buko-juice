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
    title: "Selling from whole buko",
    blocks: [
      {
        kind: "p",
        text: "Use **Raw Materials** when one thing you buy becomes several things you sell. Classic example: you stock **whole buko**, but you sell **water by the pack**.",
      },
      {
        kind: "list",
        items: [
          "On the **Raw Materials** page, add your base stock — e.g. **Whole Buko**, 100 on hand.",
          "In **Inventory**, add or edit a product (e.g. **Buko Water Pack**), pick **Made from raw material → Whole Buko**, and set **Uses per sale** to **0.25** (because 1 buko makes 4 packs).",
          "You can also sell a **Whole Buko** product that uses **1** per sale — both draw from the same buko stock.",
          "Each sale automatically subtracts from the buko stock: sell 4 packs → 1 buko gone.",
        ],
      },
      {
        kind: "note",
        text: "Running low? Open **Raw Materials** and hit **Restock** to add more buko. The Dashboard warns you when buko falls to your alert level.",
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
  const step = STEPS[at];

  return (
    <div className="space-y-4 pb-10">
      <header>
        <h1 className="text-2xl font-bold text-stone-800">
          How to use Amarah Fresh Buko&apos;s
        </h1>
        <p className="mt-1 max-w-[75ch] text-sm text-stone-500">
          A quick, step-by-step walkthrough of the POS &amp; Inventory system —
          from ringing up a sale to managing stock and staff.
        </p>
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
    </div>
  );
}
