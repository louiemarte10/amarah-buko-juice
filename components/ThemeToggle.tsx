"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
    setMounted(true);
  }, []);

  function toggle() {
    const next = dark ? "light" : "dark";
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
    setDark(!dark);
  }

  return (
    <button
      onClick={toggle}
      className="mb-2 flex w-full items-center justify-between rounded-lg bg-stone-100 px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-200"
      aria-label="Toggle dark mode"
    >
      <span>{mounted && dark ? "Dark mode" : "Light mode"}</span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
          mounted && dark ? "bg-brand" : "bg-stone-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
            mounted && dark ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
