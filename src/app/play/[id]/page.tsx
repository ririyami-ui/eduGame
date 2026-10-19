"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraStage } from "@/components/game/CameraStage";
import { PoseIcon } from "@/components/game/PoseIcon";
import { Button } from "@/components/ui/Button";
import { POSE_DESC, POSE_LABEL } from "@/lib/labels";
import { usePoseDetector, type PoseFrame } from "@/hooks/usePoseDetector";
import { cn, uid } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useDataStore } from "@/store/useDataStore";
import type { AnswerOption, Landmark, PoseAction, QuestionSet } from "@/types";

const HOLD_MS = 900;
const QUESTION_SECONDS = 20;

type Phase = "setup" | "playing" | "feedback" | "done";

interface Attempt {
  prompt: string;
  chosen: string | null;
  correctText: string;
  ok: boolean;
}

export default function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sets = useDataStore((s) => s.sets);
  const loading = useDataStore((s) => s.loading);
  const recordResult = useDataStore((s) => s.recordResult);
  const saveSet = useDataStore((s) => s.saveSet);
  const user = useAuthStore((s) => s.user);
  const set = useMemo(() => sets.find((s) => s.id === id), [sets, id]);

  const [phase, setPhase] = useState<Phase>("setup");
  const [qIndex, setQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [action, setAction] = useState<PoseAction | null>(null);
  const [holdPct, setHoldPct] = useState(0);
  const [selected, setSelected] = useState<AnswerOption | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [calibrated, setCalibrated] = useState(false);
  const [bodyVisible, setBodyVisible] = useState(false);

  const answeredRef = useRef(false);
  const holdRef = useRef<{ key: PoseAction | null; since: number }>({ key: null, since: 0 });
  const landmarksRef = useRef<Landmark[] | null>(null);
  const chooseRef = useRef<(opt: AnswerOption | null) => void>(() => {});
  const timeRef = useRef(QUESTION_SECONDS);
  const startRef = useRef(0);
  const recordedRef = useRef(false);

  const question = set?.questions[qIndex] ?? null;
  const qPromptRef = useRef("");
  const qOptionsRef = useRef<AnswerOption[]>([]);
  useEffect(() => {
    qPromptRef.current = question?.prompt ?? "";
    qOptionsRef.current = question?.options ?? [];
  }, [question]);

  const choose = useCallback(
    (opt: AnswerOption | null) => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      const ok = !!opt?.isCorrect;
      setSelected(opt);
      setAttempts((a) => [
        ...a,
        {
          prompt: qPromptRef.current,
          chosen: opt?.text ?? null,
          correctText: qOptionsRef.current.find((o) => o.isCorrect)?.text ?? "—",
          ok,
        },
      ]);
      if (ok) {
        setScore((s) => s + 100 + Math.round(Math.max(0, timeRef.current) * 2));
        setStreak((s) => s + 1);
      } else {
        setStreak(0);
      }
      setPhase("feedback");
    },
    [],
  );
  chooseRef.current = choose;

  const onFrame = useCallback((f: PoseFrame) => {
    landmarksRef.current = f.landmarks;
    setBodyVisible((prev) => (prev === !!f.landmarks ? prev : !!f.landmarks));
    setAction((prev) => (prev === f.action ? prev : f.action));

    if (!f.action || answeredRef.current) {
      holdRef.current = { key: null, since: 0 };
      setHoldPct(0);
      return;
    }
    const match = qOptionsRef.current.find((o) => o.pose === f.action);
    if (!match) {
      holdRef.current = { key: null, since: 0 };
      setHoldPct(0);
      return;
    }
    const now = performance.now();
    if (holdRef.current.key !== f.action) {
      holdRef.current = { key: f.action, since: now };
    }
    const pct = Math.min(1, (now - holdRef.current.since) / HOLD_MS);
    setHoldPct(Math.round(pct * 16) / 16);
    if (pct >= 1) chooseRef.current(match);
  }, []);

  const detector = usePoseDetector({ mirror: true, onFrame });

  const resetRound = useCallback(() => {
    answeredRef.current = false;
    holdRef.current = { key: null, since: 0 };
    landmarksRef.current = null;
    timeRef.current = QUESTION_SECONDS;
    setTimeLeft(QUESTION_SECONDS);
    setQIndex(0);
    setAttempts([]);
    setScore(0);
    setStreak(0);
    setSelected(null);
    setAction(null);
    setHoldPct(0);
    recordedRef.current = false;
    startRef.current = 0;
  }, []);

  // Timer per soal
  useEffect(() => {
    if (phase !== "playing") return;
    const t = window.setInterval(() => {
      timeRef.current = Math.max(0, +(timeRef.current - 0.1).toFixed(1));
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) {
        window.clearInterval(t);
        chooseRef.current(null);
      }
    }, 100);
    return () => window.clearInterval(t);
  }, [phase, qIndex]);

  // Lanjut ke soal berikutnya / selesai
  useEffect(() => {
    if (phase !== "feedback" || !set) return;
    const t = window.setTimeout(() => {
      if (qIndex + 1 >= set.questions.length) {
        setPhase("done");
      } else {
        answeredRef.current = false;
        holdRef.current = { key: null, since: 0 };
        timeRef.current = QUESTION_SECONDS;
        setTimeLeft(QUESTION_SECONDS);
        setSelected(null);
        setHoldPct(0);
        setQIndex((i) => i + 1);
        setPhase("playing");
      }
    }, 1600);
    return () => window.clearTimeout(t);
  }, [phase, qIndex, set]);

  // Simpan hasil akhir
  useEffect(() => {
    if (phase !== "done" || !set || recordedRef.current) return;
    recordedRef.current = true;
    const correct = attempts.filter((a) => a.ok).length;
    void recordResult({
      id: uid("res"),
      ownerId: user?.uid ?? "guest",
      setId: set.id,
      setTitle: set.title,
      mode: "pose-quiz-2d",
      score,
      total: set.questions.length,
      correct,
      wrong: attempts.length - correct,
      durationMs: startRef.current ? performance.now() - startRef.current : 0,
      createdAt: Date.now(),
    });
    void saveSet({ ...set, plays: set.plays + 1 });
  }, [phase, set, attempts, score, recordResult, saveSet, user?.uid]);

  if (loading && !set) return <Centered>Memuat bank soal…</Centered>;

  if (!set) {
    return (
      <Centered>
        <p className="text-3xl">🤔</p>
        <p className="mt-3 font-display text-lg font-semibold">Set tidak ditemukan</p>
        <p className="mt-1 text-sm text-muted">
          Pastikan kamu membuka set dari perangkat / akun yang sama.
        </p>
        <Button href="/play" className="mt-6">
          Pilih set lain
        </Button>
      </Centered>
    );
  }

  if (phase === "done") {
    const correct = attempts.filter((a) => a.ok).length;
    const pct = attempts.length ? Math.round((correct / attempts.length) * 100) : 0;
    const verdict =
      pct >= 80 ? "Luar biasa! 🎉" : pct >= 50 ? "Bagus, terus berlatih! 💪" : "Ayo coba lagi! 🌱";
    return (
      <div className="min-h-dvh px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-[11px] font-bold tracking-[0.3em] text-accent uppercase">Selesai</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">{verdict}</h1>
            <p className="mt-2 text-sm text-muted">{set.title}</p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            <Stat label="Skor" value={score.toString()} />
            <Stat label="Benar" value={`${correct}/${attempts.length}`} />
            <Stat label="Akurasi" value={`${pct}%`} tone={pct >= 70 ? "ok" : "danger"} />
          </div>

          <ul className="mt-6 space-y-2">
            {attempts.map((a, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-xl border px-4 py-3",
                  a.ok ? "border-ok/30 bg-ok/10" : "border-danger/30 bg-danger/10",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] font-semibold">
                    <span className="mr-2">{a.ok ? "✅" : "❌"}</span>
                    {a.prompt}
                  </p>
                  <span className="shrink-0 text-[11px] text-muted">#{i + 1}</span>
                </div>
                <p className="mt-1.5 pl-6 text-[12px] text-muted">
                  Jawabanmu:{" "}
                  <span className="font-semibold text-fg">{a.chosen ?? "Waktu habis"}</span>
                  {!a.ok && (
                    <>
                      {" · "}Benar: <span className="font-semibold text-ok">{a.correctText}</span>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => {
                resetRound();
                setCalibrated(false);
                setPhase("setup");
              }}
              size="lg"
            >
              ↻ Main Lagi
            </Button>
            <Button href="/play" size="lg" variant="secondary">
              Pilih Set Lain
            </Button>
            <Button href="/dashboard" size="lg" variant="ghost">
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <SetupView
        set={set}
        detector={detector}
        bodyVisible={bodyVisible}
        calibrated={calibrated}
        onCalibrate={() => {
          const ok = detector.captureCalibration(landmarksRef.current);
          if (ok) setCalibrated(true);
        }}
        onBegin={() => {
          resetRound();
          startRef.current = performance.now();
          setPhase("playing");
        }}
      />
    );
  }

  const total = set.questions.length;
  const isFeedback = phase === "feedback";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4">
          <Link
            href="/play"
            className="rounded-lg px-2 py-1.5 text-sm font-semibold text-muted transition hover:text-fg"
          >
            ← Keluar
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{set.title}</p>
            <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-soft">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-all duration-500"
                style={{ width: `${(attempts.length / total) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Hud label="Soal" value={`${Math.min(qIndex + 1, total)}/${total}`} />
            <Hud label="Skor" value={score.toString()} accent />
            {streak >= 2 && <Hud label="Streak" value={`🔥${streak}`} />}
            <Hud label="Waktu" value={Math.ceil(timeLeft).toString()} danger={timeLeft <= 5} />
          </div>
          <button
            onClick={() => {
              const el = document.documentElement;
              if (!document.fullscreenElement) void el.requestFullscreen?.();
              else void document.exitFullscreen?.();
            }}
            className="hidden h-10 w-10 place-items-center rounded-xl border border-line bg-soft text-base transition hover:border-brand sm:grid"
            title="Layar penuh"
          >
            ⛶
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-5 px-4 py-5 lg:grid-cols-[1.35fr_0.65fr] lg:px-6">
        <section className="space-y-4">
          {question?.hint ? (
            <p className="rounded-xl border border-brand/25 bg-brand/10 px-4 py-2.5 text-[13px] font-medium text-brand">
              💡 {question.hint}
            </p>
          ) : null}

          <div className="rounded-2xl border border-line bg-elev px-6 py-7">
            <p className="text-[11px] font-bold tracking-[0.25em] text-muted uppercase">
              Pertanyaan {Math.min(qIndex + 1, total)}
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
              {question?.prompt}
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {question?.options.map((o) => {
              const isMatch = action === o.pose;
              const isChosen = selected?.id === o.id;
              return (
                <div
                  key={o.id}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border bg-elev p-4 transition-all duration-150",
                    isMatch &&
                      !isFeedback &&
                      "scale-[1.02] border-accent shadow-[0_0_0_3px_var(--accent)]",
                    isFeedback && o.isCorrect && "border-ok bg-ok/12",
                    isFeedback && isChosen && !o.isCorrect && "animate-shake border-danger bg-danger/12",
                    isFeedback && !o.isCorrect && !isChosen && "opacity-40",
                  )}
                >
                  {isMatch && !isFeedback ? (
                    <div
                      className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-accent to-brand"
                      style={{ width: `${holdPct * 100}%` }}
                    />
                  ) : null}

                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "h-14 w-14 shrink-0 transition-colors",
                        isFeedback
                          ? o.isCorrect
                            ? "text-ok"
                            : isChosen
                              ? "text-danger"
                              : "text-muted"
                          : isMatch
                            ? "text-accent"
                            : "text-muted",
                      )}
                    >
                      <PoseIcon action={o.pose} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-xl font-bold leading-tight sm:text-2xl">
                        {o.text}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {POSE_LABEL[o.pose]}
                      </p>
                    </div>
                  </div>

                  {isMatch && !isFeedback ? (
                    <p className="mt-3 text-[12px] font-semibold text-accent">
                      Tahan gerakan… {Math.round(holdPct * 100)}%
                    </p>
                  ) : null}
                  {isFeedback && isChosen ? (
                    <p
                      className="mt-3 text-[12px] font-semibold"
                      style={{ color: o.isCorrect ? "var(--ok)" : "var(--danger)" }}
                    >
                      {o.isCorrect ? "Benar! 🎉" : "Belum tepat 😔"}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="text-center text-[12px] text-muted">
            Tahan gerakan selama {Math.round(HOLD_MS / 1000)} detik untuk mengunci jawaban.
          </p>
        </section>

        <aside className="space-y-3">
          <CameraStage
            videoRef={detector.videoCbRef}
            canvasRef={detector.canvasRef}
            status={detector.status}
            error={detector.error}
          />
          <div className="rounded-2xl border border-line bg-elev px-4 py-3">
            <p className="text-[11px] font-bold tracking-[0.2em] text-muted uppercase">
              Gerakan terdeteksi
            </p>
            <p className={cn("mt-1.5 font-display text-xl font-bold", action ? "text-accent" : "text-muted")}>
              {action ? POSE_LABEL[action] : "—"}
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
              {action
                ? POSE_DESC[action]
                : "Cocokkan gerakanmu dengan ikon di kartu jawaban."}
            </p>
            {detector.calibration ? (
              <p className="mt-3 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-[11px] font-semibold text-ok">
                ✓ Terkalibrasi — jongkok & lompat siap dideteksi
              </p>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="mt-3 w-full"
                disabled={!bodyVisible}
                onClick={() => detector.captureCalibration(landmarksRef.current)}
              >
                Kalibrasi posisi berdiri
              </Button>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function SetupView({
  set,
  detector,
  bodyVisible,
  calibrated,
  onCalibrate,
  onBegin,
}: {
  set: QuestionSet;
  detector: ReturnType<typeof usePoseDetector>;
  bodyVisible: boolean;
  calibrated: boolean;
  onCalibrate: () => void;
  onBegin: () => void;
}) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/play" className="text-sm font-semibold text-muted hover:text-fg">
            ← Kembali
          </Link>
          <span className="text-[11px] font-bold tracking-[0.25em] text-accent uppercase">
            Pose Quiz 2D
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{set.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">{set.description}</p>

          <ol className="mt-8 space-y-4">
            {[
              {
                n: "1",
                t: "Berdiri, seluruh badan terlihat",
                d: "Posisikan smartboard 2–3 meter dari siswa. Pastikan kepala hingga kaki masuk frame kamera.",
              },
              {
                n: "2",
                t: "Kalibrasi posisi berdiri",
                d: "Berdiri tegak lalu tekan tombol kalibrasi. Ini patokan agar deteksi jongkok & lompat akurat.",
              },
              {
                n: "3",
                t: "Jawab dengan gerakan",
                d: "Tirukan ikon gerakan pada kartu jawaban. Tahan 1 detik untuk mengunci pilihan.",
              },
            ].map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 font-display text-sm font-bold text-brand">
                  {s.n}
                </span>
                <div>
                  <p className="text-sm font-semibold">{s.t}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-2xl border border-line bg-elev p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Ringkasan set</p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-display text-2xl font-bold">{set.questions.length}</p>
                <p className="text-[11px] text-muted">soal</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold">{QUESTION_SECONDS}s</p>
                <p className="text-[11px] text-muted">per soal</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold">{HOLD_MS / 1000}s</p>
                <p className="text-[11px] text-muted">tahan gerakan</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <CameraStage
            videoRef={detector.videoCbRef}
            canvasRef={detector.canvasRef}
            status={detector.status}
            error={detector.error}
          >
            {detector.isReady ? (
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-black/60 px-4 py-2.5 backdrop-blur">
                  <span className="text-[12px] font-semibold text-white">
                    {bodyVisible ? "✓ Tubuh terdeteksi" : "Menunggu tubuh masuk frame…"}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-wider",
                      bodyVisible ? "text-lime-300" : "text-white/50",
                    )}
                  >
                    LIVE
                  </span>
                </div>
              </div>
            ) : null}
          </CameraStage>

          {detector.isReady ? (
            <>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={!bodyVisible}
                  onClick={onCalibrate}
                >
                  {calibrated ? "✓ Terkalibrasi" : "Kalibrasi berdiri"}
                </Button>
                <Button className="flex-1" disabled={!calibrated} onClick={onBegin}>
                  ▶ Mulai
                </Button>
              </div>
              {!calibrated ? (
                <p className="text-center text-[12px] text-muted">
                  Berdiri tegak di tengah frame, lalu kalibrasi.
                </p>
              ) : null}
            </>
          ) : (
            <Button size="lg" className="w-full" onClick={() => void detector.start()}>
              🎥 Aktifkan Kamera
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Hud({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="text-right">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p
        className={cn(
          "font-display text-lg font-bold leading-tight",
          danger ? "text-danger" : accent ? "text-accent" : "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "danger" }) {
  return (
    <div className="rounded-2xl border border-line bg-elev px-4 py-5 text-center">
      <p
        className={cn(
          "font-display text-3xl font-bold",
          tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : "text-fg",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>{children}</div>
    </div>
  );
}
