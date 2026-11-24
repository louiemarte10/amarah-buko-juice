"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@/lib/client";
import { api } from "@/lib/client";
import ThemeToggle from "@/components/ThemeToggle";

type NavItem = { href: string; label: string; icon: string; admin?: boolean };

const NAV: NavItem[] = [
  { href: "/pos", label: "Point of Sale", icon: "🧾" },
  { href: "/dashboard", label: "Dashboard", icon: "📊", admin: true },
  { href: "/inventory", label: "Inventory", icon: "📦", admin: true },
  { href: "/raw-materials", label: "Raw Materials", icon: "🥥", admin: true },
  { href: "/archive", label: "Archived", icon: "🗃️", admin: true },
  { href: "/categories", label: "Categories", icon: "🏷️", admin: true },
  { href: "/suppliers", label: "Suppliers", icon: "🚚", admin: true },
  { href: "/sales", label: "Sales History", icon: "💸" },
  { href: "/users", label: "Staff", icon: "👥", admin: true },
  { href: "/guide", label: "How to Use", icon: "📘" },
];

export default function AppShell({
  user,
  children,
}: {
  user: { name: string; role: Role; roleName: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => !n.admin || user.role === "ADMIN");

  async function logout() {
    await api.post("/api/auth/logout");
    router.replace("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-brand text-white shadow"
                : "text-stone-600 hover:bg-brand-light hover:text-brand-dark"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-xl">
          🥥
        </span>
        <div>
          <p className="text-sm font-bold leading-tight text-brand-dark">
            Amarah Fresh Buko&apos;s
          </p>
          <p className="text-xs text-stone-400">POS &amp; Inventory</p>
        </div>
      </div>
      {nav}
      <div className="border-t border-stone-100 p-3">
        <ThemeToggle />
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-semibold text-stone-700">
            {user.name}
          </p>
          <p className="text-xs text-stone-400">{user.roleName}</p>
        </div>
        <button
          onClick={logout}
          className="w-full rounded-lg bg-stone-100 px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-200"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-stone-200 bg-surface md:flex">
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-surface shadow-xl">
            {sidebarInner}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-stone-200 bg-surface px-4 py-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-stone-600 hover:bg-stone-100"
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="font-bold text-brand-dark">Amarah Fresh Buko&apos;s</span>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
