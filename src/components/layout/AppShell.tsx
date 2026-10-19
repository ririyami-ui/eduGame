"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SUBJECT_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useDataStore } from "@/store/useDataStore";

const NAV = [
  { href: "/dashboard", label: "Ringkasan", icon: "📊" },
  { href: "/dashboard/sets", label: "Bank Soal", icon: "🗂️" },
  { href: "/dashboard/media", label: "Media Library", icon: "🎨" },
  { href: "/dashboard/rekomendasi", label: "Rekomendasi", icon: "✨" },
  { href: "/play", label: "Mode Main", icon: "🎮" },
];

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const source = useDataStore((s) => s.source);

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="border-b border-line bg-elev/60 lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between gap-2 px-4">
            <Logo />
            <ThemeToggle className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-soft text-sm lg:hidden" />
          </div>

          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-2.5">
            {NAV.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand/15 text-brand"
                      : "text-muted hover:bg-soft hover:text-fg",
                  )}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden border-t border-line p-3 lg:block">
            <div className="rounded-xl bg-soft/70 p-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/20 text-sm font-bold text-brand">
                  {(user?.displayName ?? "T").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{user?.displayName ?? "Tamu"}</p>
                  <p className="truncate text-[11px] text-muted">
                    {source === "cloud" ? "☁️ Tersimpan di cloud" : "💾 Penyimpanan lokal"}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
                className="mt-3 w-full rounded-lg border border-line py-2 text-xs font-semibold text-muted transition hover:border-danger/50 hover:text-danger"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {title}
              </h1>
              {subtitle ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
            </div>
            {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function SubjectDot({ subject }: { subject: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {SUBJECT_LABEL[subject] ?? subject}
    </span>
  );
}
