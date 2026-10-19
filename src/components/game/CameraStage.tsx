"use client";

import type { RefCallback, RefObject } from "react";
import { cn } from "@/lib/utils";
import type { DetectorStatus } from "@/hooks/usePoseDetector";

const STATUS_TEXT: Record<DetectorStatus, string> = {
  idle: "Kamera nonaktif",
  "loading-model": "Memuat model pose (MediaPipe)…",
  "requesting-camera": "Meminta izin kamera…",
  running: "Kamera aktif · melacak 33 titik tubuh",
  "no-camera": "Kamera tidak tersedia",
  error: "Terjadi kesalahan",
};

export function CameraStage({
  videoRef,
  canvasRef,
  status,
  error,
  mirror = true,
  className,
  aspect = "video",
  children,
}: {
  videoRef: RefObject<HTMLVideoElement | null> | RefCallback<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  status: DetectorStatus;
  error: string | null;
  mirror?: boolean;
  className?: string;
  aspect?: "video" | "full";
  children?: React.ReactNode;
}) {
  const running = status === "running";
  const hasStream = status === "requesting-camera" || status === "loading-model" || running;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line bg-black",
        aspect === "video" ? "aspect-video" : "h-full w-full",
        className,
      )}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          mirror && "-scale-x-100",
          hasStream ? "opacity-100" : "opacity-0",
        )}
      />
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 h-full w-full",
          running ? "opacity-100" : "opacity-0",
        )}
      />

      {!hasStream ? (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#0b1020] to-[#05070f] p-6 text-center">
          <div className="space-y-3">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-brand/40 bg-brand/15 text-2xl">
              {status === "no-camera" || status === "error" ? "📷" : "🎥"}
            </div>
            <p className="text-sm font-semibold text-white">{STATUS_TEXT[status]}</p>
            {error ? (
              <p className="mx-auto max-w-xs text-[13px] leading-relaxed text-rose-300">{error}</p>
            ) : status === "idle" ? (
              <p className="mx-auto max-w-xs text-[13px] leading-relaxed text-white/55">
                Tekan tombol di bawah untuk mengaktifkan kamera dan mulai melacak gerakan.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {running ? (
        <>
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
            </span>
            <span className="text-[11px] font-bold tracking-widest text-white uppercase">LIVE</span>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
        </>
      ) : null}

      {children}
    </div>
  );
}
