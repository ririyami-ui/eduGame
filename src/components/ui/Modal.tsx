"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 max-h-[88dvh] w-full overflow-y-auto rounded-2xl border border-line bg-elev shadow-2xl animate-pop",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
      >
        {title ? (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-elev px-5 py-4">
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-soft hover:text-fg"
            >
              ✕
            </button>
          </div>
        ) : null}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
