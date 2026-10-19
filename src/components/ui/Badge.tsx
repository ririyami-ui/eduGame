import { cn } from "@/lib/utils";

type Tone = "brand" | "accent" | "muted" | "ok" | "danger" | "warn";

const TONES: Record<Tone, string> = {
  brand: "bg-brand/12 text-brand border-brand/25",
  accent: "bg-accent/12 text-accent border-accent/25",
  muted: "bg-soft text-muted border-line",
  ok: "bg-ok/12 text-ok border-ok/25",
  danger: "bg-danger/12 text-danger border-danger/25",
  warn: "bg-amber-500/12 text-amber-500 border-amber-500/25",
};

export function Badge({
  tone = "muted",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
