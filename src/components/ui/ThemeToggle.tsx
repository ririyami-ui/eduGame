"use client";

import { useAuthStore } from "@/store/useAuthStore";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useAuthStore((s) => s.theme);
  const setTheme = useAuthStore((s) => s.setTheme);
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Ganti ke mode ${next === "dark" ? "gelap" : "terang"}`}
      title={`Mode ${next === "dark" ? "gelap" : "terang"}`}
      className={
        className ??
        "grid h-10 w-10 place-items-center rounded-xl border border-line bg-soft text-base transition-colors hover:border-brand hover:text-brand"
      }
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
