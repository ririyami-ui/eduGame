"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#cara-kerja", label: "Cara Kerja" },
  { href: "/#fitur", label: "Fitur" },
  { href: "/#mode", label: "Mode Game" },
];

export function Navbar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-soft hover:text-fg",
                pathname === l.href && "text-fg",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && user.uid !== "guest" ? (
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center rounded-xl bg-brand-strong px-4 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold text-muted transition hover:text-fg sm:inline-flex"
              >
                Masuk
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center rounded-xl bg-brand-strong px-4 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Mulai Gratis
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
