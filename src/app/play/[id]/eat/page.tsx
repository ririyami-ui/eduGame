"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraStage } from "@/components/game/CameraStage";
import { Button } from "@/components/ui/Button";
import { usePoseDetector, type PoseFrame } from "@/hooks/usePoseDetector";
import { playBomb, playCrown } from "@/lib/sfx";
import { cn, uid } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useDataStore } from "@/store/useDataStore";
import type { AnswerOption, Landmark, Question, QuestionSet } from "@/types";

const QUESTION_SECONDS = 15;
const CATCH_MS = 450; // tahan tangan di mulut agar jawaban "termakan"
const GRAB_R = 0.1; // radius tangan (fraksi lebar video) untuk memegang bola
const EAT_R = 0.09; // radius mulut (fraksi lebar video) saat menelan, diukur dari telapak
const MOUTH_DY = 0.04; // mulut sedikit di bawah hidung (fraksi tinggi)
const PALM_T = 0.2; // telapak: pergelangan diperpanjang 20% panjang lengan ke arah jari
const HAND_MIN_VIS = 0.5; // visibilitas minimal pergelangan tangan agar dianggap terlihat
const FLICK_SPEED = 2.2; // kecepatan tangan (fraksi/detik) yang dianggap "mengibaskan"
const GRAB_LOCK_MS = 700; // jeda sebelum bisa memegang bola lagi setelah mengibaskan
const ORB_DRIFT = 0.09; // amplitudo melayang horizontal (fraksi lebar)
const ORB_FLOAT = 0.05; // amplitudo melayang vertikal (fraksi tinggi)
const REWARD_MS = 2200; // lama mahkota / bom tampil

type Phase = "setup" | "playing" | "result" | "done";

/** Satu jawaban yang melayang di layar. Posisi dalam fraksi (0..1) relatif video. */
interface Orb {
  id: string;
  option: AnswerOption;
  nx: number; // pusat horizontal (fraksi lebar)
  ny: number; // pusat vertikal (fraksi tinggi)
  phase: number; // offset gelombang melayang
  eaten: boolean;
}

interface Attempt {
  prompt: string;
  chosen: string | null;
  correctText: string;
  ok: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sebar jawaban di kolom yang berbeda agar tidak bertumpuk. */
function spawnOrbs(question: Question): Orb[] {
  const opts = shuffle(question.options);
  const slots = shuffle([0.18, 0.38, 0.62, 0.82]);
  return opts.map((option, i) => ({
    id: `orb-${option.id}`,
    option,
    nx: slots[i] ?? 0.2 + i * 0.2,
    ny: 0.42,
    phase: Math.random() * Math.PI * 2,
    eaten: false,
  }));
}

export default function PlayEatPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [head, setHead] = useState<{ nx: number; ny: number } | null>(null);
  const [hand, setHand] = useState<{ nx: number; ny: number } | null>(null);
  const [heldId, setHeldId] = useState<string | null>(null);
  const [eatPct, setEatPct] = useState(0);
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bodyVisible, setBodyVisible] = useState(false);
  const [reward, setReward] = useState<"crown" | "bomb" | null>(null);
  const [chewed, setChewed] = useState<{ text: string; ok: boolean } | null>(null);
  const [eatingId, setEatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const question = set?.questions[qIndex] ?? null;
  const questionRef = useRef<Question | null>(null);
  const answeredRef = useRef(false);
  const headRef = useRef<{ nx: number; ny: number } | null>(null);
  const handRef = useRef<{ nx: number; ny: number } | null>(null);
  const heldIdRef = useRef<string | null>(null);
  const handSpeedRef = useRef(0); // kecepatan tangan terakhir (fraksi/detik)
  const handPrevRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const grabLockRef = useRef(0); // timestamp sampai mana pegang diblokir (setelah kibas)
  const eatRef = useRef<{ key: string | null; since: number }>({ key: null, since: 0 });
  const rewardTimerRef = useRef<number>(0);
  const chewTimerRef = useRef<number>(0);
  const noticeTimerRef = useRef<number>(0);
  const landmarksRef = useRef<Landmark[] | null>(null);
  const chooseRef = useRef<(opt: AnswerOption | null) => void>(() => {});
  const timeRef = useRef(QUESTION_SECONDS);
  const startRef = useRef(0);
  const recordedRef = useRef(false);

  useEffect(() => {
    questionRef.current = question;
  }, [question]);

  const clearTimers = useCallback(() => {
    if (rewardTimerRef.current) window.clearTimeout(rewardTimerRef.current);
    if (chewTimerRef.current) window.clearTimeout(chewTimerRef.current);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    rewardTimerRef.current = 0;
    chewTimerRef.current = 0;
    noticeTimerRef.current = 0;
  }, []);

  const choose = useCallback(
    (opt: AnswerOption | null) => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      clearTimers();
      const ok = !!opt?.isCorrect;
      const prompt = questionRef.current?.prompt ?? "";
      const correctText = questionRef.current?.options.find((o) => o.isCorrect)?.text ?? "—";
      setAttempts((a) => [...a, { prompt, chosen: opt?.text ?? null, correctText, ok }]);
      setEatPct(0);
      heldIdRef.current = null;
      setHeldId(null);
      setChewed(opt ? { text: opt.text, ok } : null);
      setReward(ok ? "crown" : "bomb");
      if (ok) {
        setScore((s) => s + 100 + Math.round(Math.max(0, timeRef.current) * 2));
        setStreak((s) => s + 1);
        playCrown(); // efek suara mahkota
      } else {
        setStreak(0);
        playBomb(); // efek suara ledakan bom
      }
      rewardTimerRef.current = window.setTimeout(() => {
        setReward(null);
        setChewed(null);
        setPhase("result");
      }, REWARD_MS);
    },
    [clearTimers],
  );
  chooseRef.current = choose;

  const phaseRef = useRef<Phase>("setup");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const onFrame = useCallback((f: PoseFrame) => {
    landmarksRef.current = f.landmarks;
    setBodyVisible((prev) => (prev === !!f.landmarks ? prev : !!f.landmarks));
    // Posisi kepala & tangan hanya relevan saat bermain; agar halaman tidak
    // di-render ulang 30x/detik selama setup.
    if (phaseRef.current !== "playing") return;
    if (!f.landmarks || f.landmarks.length < 17) {
      headRef.current = null;
      setHead(null);
      handRef.current = null;
      setHand(null);
      eatRef.current = { key: null, since: 0 };
      setEatPct(0);
      return;
    }
    const lm = f.landmarks;
    const nose = lm[0];
    // Video ditampilkan ter-mirror, jadi koordinat layar = 1 - x kamera.
    // Dengan begini arah gerak siswa di layar searah dengan arah orb.
    const nextHead = { nx: 1 - nose.x, ny: nose.y };
    headRef.current = nextHead;
    setHead((prev) => {
      if (
        prev &&
        Math.abs(prev.nx - nextHead.nx) < 0.001 &&
        Math.abs(prev.ny - nextHead.ny) < 0.001
      ) {
        return prev;
      }
      return nextHead;
    });

    // Pergelangan tangan kiri (15) & kanan (16): pakai yang visibilitasnya
    // lebih tinggi, asal di atas ambang minimal.
    const lw = lm[15];
    const rw = lm[16];
    const lv = lw.visibility ?? 0;
    const rv = rw.visibility ?? 0;
    const wrist = lv >= rv ? lw : rw;
    const vis = Math.max(lv, rv);
    if (vis >= HAND_MIN_VIS) {
      // Telapak/jari: MediaPipe Pose tak punya landmark jari, jadi pergelangan
      // (15 kiri / 16 kanan) diperpanjang 20% panjang lengan ke arah jari
      // (melanjutkan garis siku → pergelangan). Bola yang dipegang menempel di sini.
      const elbow = lv >= rv ? lm[13] : lm[14];
      const evis = elbow.visibility ?? 0;
      const nextHand =
        evis >= HAND_MIN_VIS
          ? {
              nx: (1 - wrist.x) + ((1 - wrist.x) - (1 - elbow.x)) * PALM_T,
              ny: wrist.y + (wrist.y - elbow.y) * PALM_T,
            }
          : { nx: 1 - wrist.x, ny: wrist.y }; // siku tak terlihat → pakai pergelangan
      // Hitung kecepatan tangan untuk deteksi "kibasan" (lepasan cepat).
      const nowMs = performance.now();
      const prev = handPrevRef.current;
      if (prev && nowMs > prev.t) {
        const dt = (nowMs - prev.t) / 1000;
        const dist = Math.hypot(nextHand.nx - prev.x, nextHand.ny - prev.y);
        handSpeedRef.current = dist / dt;
      }
      handPrevRef.current = { x: nextHand.nx, y: nextHand.ny, t: nowMs };
      handRef.current = nextHand;
      setHand((prev) => {
        if (
          prev &&
          Math.abs(prev.nx - nextHand.nx) < 0.001 &&
          Math.abs(prev.ny - nextHand.ny) < 0.001
        ) {
          return prev;
        }
        return nextHand;
      });
    } else if (handRef.current) {
      handRef.current = null;
      setHand(null);
      handPrevRef.current = null;
      handSpeedRef.current = 0;
    }
  }, []);

  // Skeleton disembunyikan selama bermain agar tampilan bersih; saat setup
  // tetap tampil sebagai umpan balik bahwa tubuh terlacak.
  const detector = usePoseDetector({
    mirror: true,
    onFrame,
    showSkeleton: phase !== "playing",
  });

  // Loop inti: pegang bola dengan tangan, lalu bawa ke mulut untuk memakannya.
  // Posisi kepala & tangan dibaca lewat ref agar interval tidak perlu dibuat
  // ulang tiap frame kamera.
  useEffect(() => {
    if (phase !== "playing") return;
    const iv = window.setInterval(() => {
      if (answeredRef.current || !handRef.current) {
        eatRef.current = { key: null, since: 0 };
        setEatPct(0);
        setEatingId(null);
        return;
      }
      const now = performance.now();

      if (!heldIdRef.current) {
        // Belum memegang apa pun → coba pegang bola terdekat yang disentuh tangan.
        // Diblokir sesaat setelah mengibaskan agar bola tidak langsung terpegang lagi.
        const h = handRef.current;
        if (now < grabLockRef.current) {
          setEatPct(0);
          setEatingId(null);
          return;
        }
        let grabbed: Orb | undefined;
        let bestD = GRAB_R;
        for (const orb of orbs) {
          if (orb.eaten) continue;
          const moving = orb.nx + Math.sin(now / 900 + orb.phase) * ORB_DRIFT;
          const floatY = orb.ny + Math.cos(now / 1100 + orb.phase) * ORB_FLOAT;
          const d = Math.hypot(h.nx - moving, h.ny - floatY);
          if (d <= bestD) {
            bestD = d;
            grabbed = orb;
          }
        }
        if (grabbed) {
          heldIdRef.current = grabbed.id;
          setHeldId(grabbed.id);
        }
        eatRef.current = { key: null, since: 0 };
        setEatPct(0);
        setEatingId(null);
        return;
      }

      // Sedang memegang → kibaskan jika ayunan tangan cepat (tanpa penalti).
      const speed = handSpeedRef.current;
      if (speed > FLICK_SPEED) {
        heldIdRef.current = null;
        setHeldId(null);
        eatRef.current = { key: null, since: 0 };
        setEatPct(0);
        setEatingId(null);
        grabLockRef.current = now + GRAB_LOCK_MS;
        setNotice("Bola dilepas!");
        if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = window.setTimeout(() => setNotice(null), 900);
        return;
      }

      // Sedang memegang → bawa ke mulut (sedikit di bawah hidung) untuk menelan.
      const head = headRef.current;
      const held = orbs.find((o) => o.id === heldIdRef.current && !o.eaten);
      if (!head || !held) {
        heldIdRef.current = null;
        setHeldId(null);
        eatRef.current = { key: null, since: 0 };
        setEatPct(0);
        setEatingId(null);
        return;
      }
      const mouth = { x: head.nx, y: head.ny + MOUTH_DY };
      const from = handRef.current!;
      const d = Math.hypot(from.nx - mouth.x, from.ny - mouth.y);
      if (d > EAT_R) {
        eatRef.current = { key: null, since: 0 };
        setEatPct(0);
        setEatingId(null);
        return;
      }
      if (eatRef.current.key !== held.id) eatRef.current = { key: held.id, since: now };
      const pct = Math.min(1, (now - eatRef.current.since) / CATCH_MS);
      setEatPct(Math.round(pct * 10) / 10);
      setEatingId(held.id);
      if (pct >= 1) {
        eatRef.current = { key: null, since: 0 };
        setEatPct(0);
        heldIdRef.current = null;
        setHeldId(null);
        setOrbs((prev) => prev.map((o) => (o.id === held.id ? { ...o, eaten: true } : o)));
        chooseRef.current(held.option);
      }
    }, 80);
    return () => window.clearInterval(iv);
  }, [phase, orbs]);

  const resetRound = useCallback(() => {
    clearTimers();
    answeredRef.current = false;
    eatRef.current = { key: null, since: 0 };
    landmarksRef.current = null;
    timeRef.current = QUESTION_SECONDS;
    setTimeLeft(QUESTION_SECONDS);
    setQIndex(0);
    setAttempts([]);
    setScore(0);
    setStreak(0);
    setOrbs([]);
    setReward(null);
    setChewed(null);
    setEatPct(0);
    heldIdRef.current = null;
    setHeldId(null);
    setEatingId(null);
    grabLockRef.current = 0;
    handSpeedRef.current = 0;
    handPrevRef.current = null;
    setNotice(null);
    recordedRef.current = false;
    startRef.current = 0;
  }, [clearTimers]);

  const beginQuestion = useCallback((index: number) => {
    if (index === 0) resetRound();
    answeredRef.current = false;
    eatRef.current = { key: null, since: 0 };
    timeRef.current = QUESTION_SECONDS;
    setTimeLeft(QUESTION_SECONDS);
    setEatPct(0);
    setOrbs([]);
    setReward(null);
    setChewed(null);
    heldIdRef.current = null;
    setHeldId(null);
    setEatingId(null);
    grabLockRef.current = 0;
    handSpeedRef.current = 0;
    handPrevRef.current = null;
    setNotice(null);
    setPhase("playing");
    // `questionRef` baru terisi setelah render dengan qIndex baru, jadi soal
    // di-spawn pada efek berikutnya (lihat efek spawnOrbs di bawah).
    setQIndex(index);
  }, [resetRound]);

  // Timer per soal (dihitung turun, bukan akumulasi — aman dari drift).
  useEffect(() => {
    if (phase !== "playing") return;
    const endAt = performance.now() + QUESTION_SECONDS * 1000;
    const iv = window.setInterval(() => {
      const left = Math.max(0, (endAt - performance.now()) / 1000);
      timeRef.current = left;
      setTimeLeft(left);
      if (left <= 0) {
        window.clearInterval(iv);
        chooseRef.current(null);
      }
    }, 100);
    return () => window.clearInterval(iv);
  }, [phase, qIndex]);

  // Soal baru → sebar jawaban melayang. Berjalan saat masuk fase bermain dan
  // setiap `qIndex` berganti (soal masih sama saat lanjut dari hasil umpan balik).
  useEffect(() => {
    if (phase !== "playing") return;
    const q = set?.questions[qIndex] ?? null;
    if (!q) return;
    questionRef.current = q;
    setOrbs(spawnOrbs(q));
  }, [phase, qIndex, set]);

  // Umpan balik selesai → lanjut ke soal berikutnya atau selesai.
  useEffect(() => {
    if (phase !== "result" || !set) return;
    const t = window.setTimeout(() => {
      if (qIndex + 1 >= set.questions.length) {
        setPhase("done");
      } else {
        beginQuestion(qIndex + 1);
      }
    }, 700);
    return () => window.clearTimeout(t);
  }, [phase, qIndex, set, beginQuestion]);

  // Simpan hasil akhir.
  useEffect(() => {
    if (phase !== "done" || !set || recordedRef.current) return;
    recordedRef.current = true;
    const correct = attempts.filter((a) => a.ok).length;
    void recordResult({
      id: uid("res"),
      ownerId: user?.uid ?? "guest",
      setId: set.id,
      setTitle: set.title,
      mode: "catch-eat-2d",
      score,
      total: set.questions.length,
      correct,
      wrong: attempts.length - correct,
      durationMs: startRef.current ? performance.now() - startRef.current : 0,
      createdAt: Date.now(),
    });
    void saveSet({ ...set, plays: set.plays + 1 });
  }, [phase, set, attempts, score, recordResult, saveSet, user?.uid]);

  useEffect(() => {
    return () => {
      clearTimers();
      detector.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      pct >= 80 ? "Selera luar biasa! 🎉" : pct >= 50 ? "Lumayan, terus berlatih! 💪" : "Ayo coba lagi! 🌱";
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
                    <span className="mr-2">{a.ok ? "👑" : "💣"}</span>
                    {a.prompt}
                  </p>
                  <span className="shrink-0 text-[11px] text-muted">#{i + 1}</span>
                </div>
                <p className="mt-1.5 pl-6 text-[12px] text-muted">
                  Dimakan:{" "}
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
        beginQuestion={beginQuestion}
        onCalibrate={() => detector.captureCalibration(landmarksRef.current)}
      />
    );
  }

  const total = set.questions.length;

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
                style={{ width: `${(qIndex / total) * 100}%` }}
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
              if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
              else void document.exitFullscreen?.();
            }}
            className="hidden h-10 w-10 place-items-center rounded-xl border border-line bg-soft text-base transition hover:border-brand sm:grid"
            title="Layar penuh"
          >
            ⛶
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 lg:px-6">
        {/* Soal sebagai pita di atas panggung kamera */}
        <div className="mb-4 rounded-2xl border border-line bg-elev px-6 py-5">
          <p className="text-[11px] font-bold tracking-[0.25em] text-muted uppercase">
            Pertanyaan {Math.min(qIndex + 1, total)} · makan jawaban yang benar
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
            {question?.prompt}
          </h2>
          {question?.hint ? (
            <p className="mt-2 text-[13px] font-medium text-brand">💡 {question.hint}</p>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <GameStage
            videoRef={detector.videoCbRef}
            canvasRef={detector.canvasRef}
            status={detector.status}
            error={detector.error}
            head={head}
            hand={hand}
            heldId={heldId}
            eatPct={eatPct}
            eatingId={eatingId}
            orbs={orbs}
            reward={reward}
            chewed={chewed}
            notice={notice}
          />

          <aside className="space-y-3">
            <div className="rounded-2xl border border-line bg-elev px-4 py-3">
              <p className="text-[11px] font-bold tracking-[0.2em] text-muted uppercase">Cara main</p>
              <ul className="mt-2 space-y-2 text-[12px] leading-relaxed text-muted">
                <li>
                  <span className="font-semibold text-fg">1.</span> Arahkan tangan ke bola jawaban
                  yang melayang untuk <b className="text-fg">memegangnya</b> — bola menempel di
                  telapak.
                </li>
                <li>
                  <span className="font-semibold text-fg">2.</span> Bawa telapak ke{" "}
                  <b className="text-fg">mulut</b> (penanda di bawah hidung) untuk menelannya.
                </li>
                <li>
                  <span className="font-semibold text-fg">3.</span> Tahan tangan di mulut selama
                  setengah detik sampai bola habis dimakan.
                </li>
                <li>
                  <span className="font-semibold text-fg">4.</span> Salah pegang?{" "}
                  <b className="text-fg">Kibaskan tangan</b> dengan cepat untuk melepas bola.
                </li>
                <li>
                  Benar → <b className="text-ok">👑 mahkota</b>. Salah →{" "}
                  <b className="text-danger">💣 bom</b>.
                </li>
              </ul>
            </div>

            {detector.calibration ? (
              <p className="rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-[12px] font-semibold text-ok">
                ✓ Terkalibrasi — posisi berdiri terpatok
              </p>
            ) : (
              <Button
                variant="secondary"
                className="w-full"
                disabled={!bodyVisible}
                onClick={() => detector.captureCalibration(landmarksRef.current)}
              >
                Kalibrasi posisi berdiri
              </Button>
            )}

            {!bodyVisible ? (
              <p className="rounded-xl border border-line bg-elev px-4 py-3 text-[12px] text-muted">
                Menunggu tubuh masuk frame…
              </p>
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  );
}

function SetupView({
  set,
  detector,
  bodyVisible,
  beginQuestion,
  onCalibrate,
}: {
  set: QuestionSet;
  detector: ReturnType<typeof usePoseDetector>;
  bodyVisible: boolean;
  beginQuestion: (index: number) => void;
  onCalibrate: () => void;
}) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/play" className="text-sm font-semibold text-muted hover:text-fg">
            ← Kembali
          </Link>
          <span className="text-[11px] font-bold tracking-[0.25em] text-accent uppercase">
            Tangkap &amp; Makan
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
                d: "Berdiri tegak lalu tekan tombol kalibrasi sebagai patokan posisi siswa di depan kamera.",
              },
              {
                n: "3",
                t: "Pegang &amp; makan jawaban melayang",
                d: "Arahkan tangan ke bola jawaban untuk memegangnya (bola menempel di telapak), lalu bawa tangan ke mulut untuk memakannya. Salah pegang? Kibaskan tangan untuk melepasnya.",
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
                <p className="font-display text-2xl font-bold">👑 / 💣</p>
                <p className="text-[11px] text-muted">benar / salah</p>
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
                  {detector.calibration ? "✓ Terkalibrasi" : "Kalibrasi berdiri"}
                </Button>
                <Button
                  className="flex-1"
                  size="lg"
                  disabled={!detector.calibration}
                  onClick={() => beginQuestion(0)}
                >
                  ▶ Mulai
                </Button>
              </div>
              {!detector.calibration ? (
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

/**
 * Panggung permainan: video kamera sebagai latar penuh, dengan jawaban yang
 * melayang, penanda tangan & mulut, dan mahkota / bom di atas kepala siswa.
 */
function GameStage({
  videoRef,
  canvasRef,
  status,
  error,
  head,
  hand,
  heldId,
  eatPct,
  eatingId,
  orbs,
  reward,
  chewed,
  notice,
}: {
  videoRef: React.ComponentProps<typeof CameraStage>["videoRef"];
  canvasRef: React.ComponentProps<typeof CameraStage>["canvasRef"];
  status: ReturnType<typeof usePoseDetector>["status"];
  error: string | null;
  head: { nx: number; ny: number } | null;
  hand: { nx: number; ny: number } | null;
  heldId: string | null;
  eatPct: number;
  eatingId: string | null;
  orbs: Orb[];
  reward: "crown" | "bomb" | null;
  chewed: { text: string; ok: boolean } | null;
  notice: string | null;
}) {
  // Detak render internal: menjaga animasi melayang & posisi mahkota/bom tetap
  // bergerak mengikuti waktu. Berada di dalam GameStage agar halaman induk tidak
  // ikut di-render ulang 60x/detik.
  const [, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setTick((t) => (t + 1) % 1000000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Posisi layar (persen) untuk kepala dan mahkota/bom.
  const headPct = head ? { x: head.nx * 100, y: head.ny * 100 } : null;
  const rewardPct = headPct ? { x: headPct.x, y: headPct.y - 16 } : null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
        style={{ opacity: status === "running" ? 1 : 0 }}
      />
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 h-full w-full",
          status === "running" ? "opacity-25" : "opacity-0",
        )}
      />

      {status !== "running" ? (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <p className="text-sm font-semibold text-white">{error ?? "Menyiapkan kamera…"}</p>
        </div>
      ) : null}

      {/* Jawaban melayang (yang dipegang menempel di telapak/jari) — semua warna
          diseragamkan agar tidak ada petunjuk benar/salah dari warna. */}
      {orbs.map((orb) => {
        const isHeld = heldId === orb.id && hand;
        const floatX = isHeld
          ? hand!.nx * 100
          : orb.nx * 100 + Math.sin(performance.now() / 900 + orb.phase) * ORB_DRIFT * 100;
        const floatY = isHeld
          ? hand!.ny * 100
          : orb.ny * 100 + Math.cos(performance.now() / 1100 + orb.phase) * ORB_FLOAT * 100;
        return (
          <div
            key={orb.id}
            className={cn(
              "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/45 bg-white/15 px-4 py-3 text-center shadow-[0_0_30px_rgba(255,255,255,0.35)] backdrop-blur transition-opacity",
              isHeld && "ring-2 ring-white/70",
              orb.eaten ? "opacity-0" : "opacity-100",
            )}
            style={{ left: `${floatX}%`, top: `${floatY}%` }}
          >
            <p className="font-display text-lg font-bold leading-tight text-white sm:text-xl">
              {orb.option.text}
            </p>
            <div className="mx-auto mt-2 h-1.5 w-16 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-100"
                style={{ width: eatingId === orb.id ? `${eatPct * 100}%` : "0%" }}
              />
            </div>
          </div>
        );
      })}

      {/* Penanda mulut (target telan) — sedikit di bawah hidung */}
      {headPct ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${headPct.x}%`, top: `${headPct.y + MOUTH_DY * 100}%` }}
        >
          <div
            className={cn(
              "rounded-full border-2 transition-all duration-150",
              eatingId
                ? "h-12 w-12 border-lime-300 bg-lime-300/25 shadow-[0_0_24px_rgba(163,230,53,0.7)]"
                : "h-7 w-7 border-white/80 bg-white/15",
            )}
          />
          <p className="mt-0.5 -translate-y-1 text-center text-[10px] font-bold text-white/70">
            mulut
          </p>
        </div>
      ) : null}

      {/* Penanda tangan yang sedang aktif memegang */}
      {hand && heldId ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${hand.nx * 100}%`, top: `${hand.ny * 100}%` }}
        >
          <div className="h-9 w-9 rounded-full border-2 border-white/85 bg-white/20 shadow-[0_0_18px_rgba(255,255,255,0.5)]" />
        </div>
      ) : null}

      {/* Mahkota (benar) atau bom (salah) di atas kepala */}
      {reward && rewardPct ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 select-none text-center"
          style={{ left: `${rewardPct.x}%`, top: `${rewardPct.y}%` }}
        >
          <p
            className={cn(
              "drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]",
              reward === "crown"
                ? "animate-bounce text-6xl sm:text-7xl"
                : "animate-bounce text-6xl sm:text-7xl",
            )}
          >
            {reward === "crown" ? "👑" : "💣"}
          </p>
          <p
            className={cn(
              "mt-1 font-display text-lg font-bold",
              reward === "crown" ? "text-lime-300" : "text-rose-300",
            )}
          >
            {reward === "crown" ? "Benar!" : "Salah!"}
          </p>
        </div>
      ) : null}

      {/* Umpan balik singkat (mis. bola dilepas dengan kibasan) */}
      {notice ? (
        <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center">
          <div className="rounded-full bg-black/70 px-4 py-1.5 text-[13px] font-semibold text-white backdrop-blur">
            {notice}
          </div>
        </div>
      ) : null}

      {/* Label jawaban yang baru saja dimakan */}
      {chewed ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
          <div
            className={cn(
              "rounded-full px-5 py-2 font-display text-base font-bold backdrop-blur",
              chewed.ok ? "bg-lime-400/90 text-black" : "bg-rose-500/90 text-white",
            )}
          >
            {chewed.ok ? "👑 " : "💣 "}
            {chewed.text}
          </div>
        </div>
      ) : null}

      {status === "running" ? (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
          <span className="text-[11px] font-bold tracking-widest text-white uppercase">LIVE</span>
        </div>
      ) : null}
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
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
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
