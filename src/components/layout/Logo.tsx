import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="KinestetiKa MotionEdu"
    >
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-brand/40 bg-brand/15 text-lg">
        <span className="absolute inset-0 bg-gradient-to-br from-brand/40 to-accent/20" />
        <span className="relative">🤸</span>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-bold tracking-tight">
            KinestetiKa
          </span>
          <span className="block text-[10px] font-semibold tracking-[0.22em] text-accent uppercase">
            MotionEdu
          </span>
        </span>
      )}
    </Link>
  );
}
