"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { calibrate, detectPose, drawPose, PoseSmoother } from "@/lib/poses";
import type { Calibration, Landmark, PoseAction } from "@/types";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export type DetectorStatus =
  | "idle"
  | "loading-model"
  | "requesting-camera"
  | "running"
  | "no-camera"
  | "error";

export interface PoseFrame {
  landmarks: Landmark[] | null;
  action: PoseAction | null;
  hold: number;
  fps: number;
}

interface Options {
  mirror?: boolean;
  onFrame?: (frame: PoseFrame) => void;
  /** Gambar skeleton tubuh di canvas overlay. Default true. */
  showSkeleton?: boolean;
}

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

function loadLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.45,
        minPosePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      });
    })().catch((err) => {
      landmarkerPromise = null;
      throw err;
    });
  }
  return landmarkerPromise;
}

export function usePoseDetector(options: Options = {}) {
  const { mirror = true, onFrame, showSkeleton = true } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoCbRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (!el) return;
    const stream = streamRef.current;
    if (stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.muted = true;
      el.playsInline = true;
      void el.play().catch((e) => console.warn("[pose] re-attach stream play failed", e));
    }
  }, []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const smootherRef = useRef(new PoseSmoother(7));
  const calRef = useRef<Calibration | null>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef(0);
  const prevTsRef = useRef(0);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const showSkeletonRef = useRef(showSkeleton);
  showSkeletonRef.current = showSkeleton;

  const [status, setStatus] = useState<DetectorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [currentAction, setCurrentAction] = useState<PoseAction | null>(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const v = videoRef.current;
    if (v) v.srcObject = null;
    const c = canvasRef.current;
    if (c) {
      const ctx = c.getContext("2d");
      ctx?.clearRect(0, 0, c.width, c.height);
    }
    smootherRef.current.reset();
    setCurrentAction(null);
    setStatus("idle");
  }, []);

  const loop = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      rafRef.current = requestAnimationFrame(() => void loop());
      return;
    }

    if (video.readyState < 2 || video.paused) {
      try {
        if (video.paused) {
          await video.play();
        }
      } catch (e) {
        console.warn("[pose] failed to resume video play", e);
      }
      rafRef.current = requestAnimationFrame(() => void loop());
      return;
    }

    try {
      if (!landmarkerRef.current) landmarkerRef.current = await loadLandmarker();
      const landmarker = landmarkerRef.current;
      const ts = performance.now();
      if (ts === lastTsRef.current) return;
      lastTsRef.current = ts;

      const result = landmarker.detectForVideo(video, ts);
      const lm = (result.landmarks?.[0] ?? null) as Landmark[] | null;

      const fps = prevTsRef.current ? 1000 / Math.max(1, ts - prevTsRef.current) : 0;
      prevTsRef.current = ts;

      if (lm) {
        const { action } = detectPose(lm, calRef.current);
        smootherRef.current.push(action);
        const stable = smootherRef.current.value;
        setCurrentAction(stable);
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          if (showSkeletonRef.current) {
            drawPose(ctx, lm, canvas.width, canvas.height, mirror, stable);
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
        onFrameRef.current?.({
          landmarks: lm,
          action: stable,
          hold: smootherRef.current.hold,
          fps,
        });
      } else {
        smootherRef.current.push(null);
        setCurrentAction(null);
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        onFrameRef.current?.({ landmarks: null, action: null, hold: 0, fps });
      }
    } catch (err) {
      console.error("[pose] loop error", err);
    }

    rafRef.current = requestAnimationFrame(() => void loop());
  }, [mirror]);

  const ensureVideoPlaying = useCallback(async (video: HTMLVideoElement) => {
    if (video.paused || video.readyState < 2) {
      try {
        video.muted = true;
        video.playsInline = true;
        await video.play();
      } catch (playErr) {
        console.error("[pose] video play error", playErr);
        throw playErr;
      }
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus("requesting-camera");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Browser ini tidak mendukung akses kamera.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      let video = videoRef.current;
      if (!video) {
        await new Promise((r) => setTimeout(r, 30));
        video = videoRef.current;
      }
      if (!video) throw new Error("Elemen video belum siap.");

      video.srcObject = stream;
      console.log("[pose] video srcObject set", video.srcObject === stream);
      video.muted = true;
      video.playsInline = true;
      try {
        await ensureVideoPlaying(video);
        console.log("[pose] video played successfully");
      } catch (playErr) {
        console.error("[pose] video play error", playErr);
      }

      setStatus("loading-model");
      await loadLandmarker();

      setStatus("running");
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => void loop());
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Izin kamera ditolak. Izinkan akses kamera lalu coba lagi."
          : err instanceof Error
            ? err.message
            : "Gagal mengaktifkan kamera.";
      setError(msg);
      setStatus(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "no-camera"
          : "error",
      );
    }
  }, [loop, ensureVideoPlaying]);

  const captureCalibration = useCallback((lm?: Landmark[] | null) => {
    const source = lm ?? null;
    if (!source) {
      setError("Tidak ada tubuh terdeteksi — berdiri tegak di dalam frame dulu.");
      return false;
    }
    const c = calibrate(source);
    calRef.current = c;
    setCalibration(c);
    smootherRef.current.reset();
    return true;
  }, []);



  useEffect(() => {
    const sync = () => {
      const video = videoRef.current;
      const stream = streamRef.current;
      if (video && stream) {
        if (video.srcObject !== stream) {
          video.srcObject = stream;
        }
        video.muted = true;
        video.playsInline = true;
        if (status === "running") {
          try {
            void ensureVideoPlaying(video);
            console.log("[pose] video played successfully (sync)");
          } catch (playErr) {
            console.error("[pose] video play error (sync)", playErr);
          }
        }
      }
    };
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, ensureVideoPlaying]);

  return {
    videoRef,
    videoCbRef,
    canvasRef,
    status,
    error,
    calibration,
    currentAction,
    start,
    stop,
    captureCalibration,
    isReady: status === "running",
  };
}
