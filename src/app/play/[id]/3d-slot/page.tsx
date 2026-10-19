"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CameraStage } from "@/components/game/CameraStage";
import { LabelBillboard } from "@/components/game/LabelBillboard";
import { Button } from "@/components/ui/Button";
import { usePoseDetector, type PoseFrame } from "@/hooks/usePoseDetector";
import { cn, uid } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useDataStore } from "@/store/useDataStore";
import type { Landmark, Question } from "@/types";

const SLOT_X = -8.5;
const SLOT_RADIUS = 2.2;
const LANE_X = [2, 5.5, 9, 12.5];
const CATCH_Y = 1.6;
const ORB_SPEED = 3.4;
const SPAWN_Y = 11;
const BASE_X = 2;
const MOVE_RANGE = 12;
const MOVE_SPEED = 14;
const MIN_X = -10.5;
const MAX_X = 14;
const ROUND_SECONDS = 130;
const PLACE_HOLD_S = 0.8; // tahan condongan (dalam satuan detik) untuk meletakkan
const LEAN_THRESHOLD = 0.12; // seberapa jauh hip bergeser dari pusat frame agar dianggap "miring"

interface Orb {
  id: string;
  x: number;
  y: number;
  text: string;
  correct: boolean;
}

interface Engine {
  belt: Orb[];
  carried: Orb | null;
  playerX: number;
  targetX: number;
  keyDir: number;
  keyHold: number;
  jumpY: number;
  vy: number;
  handsUp: boolean;
  placePulse: boolean;
  leanHold: number; // timestamp saat mulai menahan condongan (0 = tidak aktif)
  running: boolean;
  finished: boolean;
  spawned: boolean;
  resolved: boolean;
  questionDone: boolean;
  advanceIn: number;
  score: number;
  lives: number;
  combo: number;
  qi: number;
  elapsed: number;
  correctPlaces: number;
  wrongPlaces: number;
  missedCorrect: number;
  slotFlash: number;
  slotTone: "correct" | "wrong" | null;
  hint: string;
  hintTimer: number;
}

interface Hud {
  score: number;
  lives: number;
  combo: number;
  qi: number;
  total: number;
  time: number;
  carrying: boolean;
  carriedText: string;
  inSlot: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createEngine(): Engine {
  return {
    belt: [],
    carried: null,
    playerX: BASE_X,
    targetX: BASE_X,
    keyDir: 0,
    keyHold: 0,
    jumpY: 0,
    vy: 0,
    handsUp: false,
    placePulse: false,
    leanHold: 0,
    running: false,
    finished: false,
    spawned: false,
    resolved: false,
    questionDone: false,
    advanceIn: 0,
    score: 0,
    lives: 3,
    combo: 0,
    qi: 0,
    elapsed: 0,
    correctPlaces: 0,
    wrongPlaces: 0,
    missedCorrect: 0,
    slotFlash: 0,
    slotTone: null,
    hint: "",
    hintTimer: 0,
  };
}

const EMPTY_HUD: Hud = {
  score: 0,
  lives: 3,
  combo: 0,
  qi: 0,
  total: 0,
  time: ROUND_SECONDS,
  carrying: false,
  carriedText: "",
  inSlot: false,
};

export default function Play3DSlotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sets = useDataStore((s) => s.sets);
  const loading = useDataStore((s) => s.loading);
  const recordResult = useDataStore((s) => s.recordResult);
  const saveSet = useDataStore((s) => s.saveSet);
  const user = useAuthStore((s) => s.user);
  const set = useMemo(() => sets.find((s) => s.id === id), [sets, id]);

  const [phase, setPhase] = useState<"setup" | "playing" | "done">("setup");
  const [hud, setHud] = useState<Hud>({ ...EMPTY_HUD, total: set?.questions.length ?? 0 });
  const [banner, setBanner] = useState("");
  const [belt, setBelt] = useState<Orb[]>([]);
  const [carried, setCarried] = useState<Orb | null>(null);
  const [hint, setHint] = useState("");
  const [calibrated, setCalibrated] = useState(false);
  const [bodyVisible, setBodyVisible] = useState(false);
  const [reason, setReason] = useState<"clear" | "over" | "timeout">("clear");

  const engine = useRef<Engine>(createEngine());
  const landmarksRef = useRef<Landmark[] | null>(null);
  const questionsRef = useRef<Question[]>([]);
  const finishedRef = useRef(false);
  useEffect(() => {
    questionsRef.current = set?.questions ?? [];
  }, [set]);

  const endRound = useCallback(
    (why: "clear" | "over" | "timeout") => {
      const e = engine.current;
      if (e.finished) return;
      e.finished = true;
      e.running = false;
      setReason(why);
      setPhase("done");
      if (set && !finishedRef.current) {
        finishedRef.current = true;
        void recordResult({
          id: uid("res"),
          ownerId: user?.uid ?? "guest",
          setId: set.id,
          setTitle: set.title,
          mode: "answer-slot-3d",
          score: e.score,
          total: set.questions.length,
          correct: e.correctPlaces,
          wrong: e.wrongPlaces + e.missedCorrect,
          durationMs: e.elapsed * 1000,
          createdAt: Date.now(),
        });
        void saveSet({ ...set, plays: set.plays + 1 });
      }
    },
    [set, recordResult, saveSet, user?.uid],
  );

  const onFrame = useCallback((f: PoseFrame) => {
    landmarksRef.current = f.landmarks;
    setBodyVisible((p) => (p === !!f.landmarks ? p : !!f.landmarks));
    if (!f.landmarks) return;
    const lm = f.landmarks;
    if (lm.length < 25) return;
    const e = engine.current;
    const hipX = (lm[23].x + lm[24].x) / 2;
    if (e.keyHold <= 0) e.targetX = BASE_X + (0.5 - hipX) * 2 * MOVE_RANGE;

    if (f.action === "raise_both_hands") {
      if (!e.handsUp) {
        e.handsUp = true;
        e.placePulse = true;
      }
    } else {
      e.handsUp = false;
    }
    if (f.action === "jump" && e.jumpY <= 0.01) e.vy = 11;

    // Condongkan badan di dalam Tempat Jawaban untuk meletakkan (tanpa tombol).
    // Condongan = posisi hip bergeser jauh dari pusat frame kamera.
    if (e.carried && !e.resolved && !e.questionDone) {
      const inSlot =
        Math.abs(e.playerX - SLOT_X) < SLOT_RADIUS + 0.3 ||
        Math.abs(e.targetX - SLOT_X) < SLOT_RADIUS + 0.3;
      const leaning = Math.abs(hipX - 0.5) > LEAN_THRESHOLD;
      const now = performance.now();
      if (inSlot && leaning && e.jumpY <= 0.01) {
        if (e.leanHold <= 0) e.leanHold = now;
        if (now - e.leanHold >= PLACE_HOLD_S * 1000) {
          e.placePulse = true;
          e.leanHold = 0;
        }
      } else {
        e.leanHold = 0;
      }
    } else {
      e.leanHold = 0;
    }
  }, []);

  const detector = usePoseDetector({ mirror: true, onFrame });

  const stopDetector = detector.stop;
  useEffect(() => {
    return () => {
      stopDetector();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const place = useCallback(() => {
    engine.current.placePulse = true;
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const down = (ev: KeyboardEvent) => {
      const e = engine.current;
      if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
        e.keyDir = -1;
        e.keyHold = 0.3;
      } else if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") {
        e.keyDir = 1;
        e.keyHold = 0.3;
      } else if (ev.key === " " || ev.key === "Enter") {
        e.placePulse = true;
        ev.preventDefault();
      } else if (ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W") {
        if (e.jumpY <= 0.01) e.vy = 11;
      }
    };
    const up = (ev: KeyboardEvent) => {
      const e = engine.current;
      if (["ArrowLeft", "a", "A", "ArrowRight", "d", "D"].includes(ev.key)) e.keyDir = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);

  const begin = () => {
    const e = createEngine();
    engine.current = e;
    e.running = true;
    finishedRef.current = false;
    setBelt([]);
    setCarried(null);
    setHint("");
    setHud({ ...EMPTY_HUD, total: questionsRef.current.length });
    setPhase("playing");
  };

  const demoStarted = useRef(false);
  useEffect(() => {
    if (demoStarted.current) return;
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("demo") !== "1") return;
    if (!set || questionsRef.current.length === 0) return;
    demoStarted.current = true;
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set]);

  if (loading && !set) {
    return <Centered>Memuat bank soal…</Centered>;
  }
  if (!set) {
    return (
      <Centered>
        <p className="text-3xl">🤔</p>
        <p className="mt-3 font-display text-lg font-semibold">Set tidak ditemukan</p>
        <Button href="/play" className="mt-6">
          Pilih set lain
        </Button>
      </Centered>
    );
  }

  if (phase === "done") {
    const total = set.questions.length;
    return (
      <div className="grid min-h-dvh place-items-center px-4 py-10">
        <div className="w-full max-w-xl text-center">
          <p className="text-[11px] font-bold tracking-[0.3em] text-accent uppercase">
            Ambil &amp; Tempatkan 3D
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
            {reason === "over"
              ? "Nyawa habis! 💥"
              : reason === "timeout"
                ? "Waktu habis! ⏱️"
                : "Semua soal tuntas! 🏆"}
          </h1>
          <p className="mt-2 text-sm text-muted">{set.title}</p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            <Box label="Skor" value={engine.current.score.toString()} />
            <Box label="Jawaban benar" value={engine.current.correctPlaces.toString()} />
            <Box label="Kombo terbaik" value={`×${Math.max(hud.combo, 0)}`} tone="accent" />
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              onClick={() => {
                finishedRef.current = false;
                setPhase("setup");
                setCalibrated(false);
              }}
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
      <div className="min-h-dvh">
        <header className="border-b border-line">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <Link href="/play" className="text-sm font-semibold text-muted hover:text-fg">
              ← Kembali
            </Link>
            <span className="text-[11px] font-bold tracking-[0.25em] text-accent uppercase">
              Ambil &amp; Tempatkan 3D
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
                  t: "Geser badan untuk berpindah",
                  d: "Condongkan badan ke kiri/kanan. Karakter 3D mengikuti posisi pangkal pahamu.",
                },
                {
                  n: "2",
                  t: "Tangkap bola jawaban yang jatuh",
                  d: "Berdiri tepat di bawah bola saat turun. Kamu membawa maksimal satu bola pada satu waktu.",
                },
                {
                  n: "3",
                  t: "Letakkan di Tempat Jawaban",
                  d: "Bawa bola ke pad bercahaya di sebelah kiri, lalu angkat kedua tangan ATAU condongkan badan (tahan ±1 detik) untuk menjatuhkannya ke dalam tempat jawaban.",
                },
              ].map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/15 font-display text-sm font-bold text-accent">
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
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="font-display text-2xl font-bold">{set.questions.length}</p>
                  <p className="text-[11px] text-muted">soal</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">3</p>
                  <p className="text-[11px] text-muted">nyawa</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">{ROUND_SECONDS}s</p>
                  <p className="text-[11px] text-muted">waktu</p>
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
                    <span className="text-[11px] font-bold uppercase tracking-wider text-lime-300">
                      LIVE
                    </span>
                  </div>
                </div>
              ) : null}
            </CameraStage>

        {detector.isReady ? (
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={!bodyVisible}
                  onClick={() => {
                    const ok = detector.captureCalibration(landmarksRef.current);
                    if (ok) setCalibrated(true);
                  }}
                >
                  {calibrated ? "✓ Terkalibrasi" : "Kalibrasi berdiri"}
                </Button>
                <Button className="flex-1" variant="accent" disabled={!calibrated} onClick={begin}>
                  ▶ Mulai
                </Button>
              </div>
            ) : (
              <Button size="lg" className="w-full" onClick={() => void detector.start()}>
                🎥 Aktifkan Kamera
              </Button>
            )}

            <p className="text-center text-[12px] leading-relaxed text-muted">
              Tidak ada kamera?{" "}
              <button
                type="button"
                className="font-semibold text-brand hover:underline"
                onClick={begin}
              >
                Coba mode pratinjau ⌨️
              </button>
              <br />
              <span className="text-[11px]">
                ← → geser · Space meletakkan · ↑ melompat
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-xl border-4 border-yellow-500">
        <Link
          href="/play"
          className="rounded-lg px-2 py-1.5 text-sm font-semibold text-muted hover:text-fg"
        >
          ← Keluar
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{set.title}</p>
          <p className="truncate text-[11px] text-muted">
            Soal {Math.min(hud.qi + 1, hud.total)} · ambil jawaban lalu letakkan
          </p>
        </div>
        {hud.carriedText ? (
          <div className="hidden max-w-[16rem] items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 sm:flex">
            <span className="text-[10px] font-bold tracking-wider text-muted uppercase">
              Dibawa
            </span>
            <span className="truncate text-sm font-bold text-accent">{hud.carriedText}</span>
            {hud.inSlot ? (
              <span className="text-[11px] font-semibold text-lime-400">· angkat tangan!</span>
            ) : (
              <span className="text-[11px] font-semibold text-muted">· ke tempat jawaban</span>
            )}
          </div>
        ) : null}
        <HudPill label="Skor" value={hud.score.toString()} accent />
        {hud.combo >= 2 && <HudPill label="Kombo" value={`🔥×${hud.combo}`} />}
        <HudPill
          label="Nyawa"
          value={"❤️".repeat(Math.max(0, hud.lives)) || "0"}
          danger={hud.lives <= 1}
        />
        <HudPill label="Waktu" value={`${Math.ceil(hud.time)}s`} danger={hud.time <= 15} />
        {detector.isReady ? (
          <div className="hidden h-14 w-28 shrink-0 overflow-hidden rounded-xl sm:block">
            <CameraStage
              videoRef={detector.videoCbRef}
              canvasRef={detector.canvasRef}
              status={detector.status}
              error={detector.error}
              aspect="full"
            />
          </div>
        ) : null}
      </header>

      <div className="relative min-h-0 flex-1">
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [BASE_X, 7.2, 21], fov: 48, near: 0.1, far: 120 }}
          onCreated={({ camera }) => camera.lookAt(BASE_X, 3.6, 0)}
          gl={{ antialias: true }}
        >
          <color attach="background" args={["#050a16"]} />
          <fog attach="fog" args={["#050a16", 26, 55]} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[8, 16, 10]} intensity={1.5} color="#c7d2fe" />
          <pointLight position={[BASE_X, 8, 8]} intensity={40} color="#818cf8" distance={40} />
          <pointLight position={[-10, 4, -6]} intensity={25} color="#a3e635" distance={35} />

          <Stage />

          <Scene
            engine={engine}
            belt={belt}
            setBelt={setBelt}
            carried={carried}
            setCarried={setCarried}
            onHud={setHud}
            onEnd={endRound}
            onBanner={setBanner}
            onHint={setHint}
            questions={set.questions}
            total={set.questions.length}
          />
        </Canvas>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-5">
          <div className="rounded-2xl border border-accent/30 bg-black/55 px-7 py-3.5 text-center backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
              Soal {Math.min(hud.qi + 1, hud.total)} dari {hud.total}
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">
              {banner || "—"}
            </p>
          </div>
        </div>

        {hint ? (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center">
            <p className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-5 py-2.5 text-sm font-semibold text-amber-200 backdrop-blur">
              {hint}
            </p>
          </div>
        ) : null}

        {belt.length > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-2 p-5">
            {[...belt]
              .sort((a, b) => a.x - b.x)
              .map((o) => (
                <span
                  key={o.id}
                  className="rounded-full border border-white/15 bg-black/45 px-3.5 py-1.5 text-[12px] font-bold text-white backdrop-blur"
                >
                  {o.text}
                </span>
              ))}
          </div>
        ) : null}

        <div className="pointer-events-auto absolute right-5 bottom-5 flex flex-col items-end gap-2">
          {hud.carrying ? (
            <Button size="sm" variant={hud.inSlot ? "accent" : "secondary"} onClick={place}>
              🙌 Letakkan Jawaban
            </Button>
          ) : null}
        </div>

        <div className="pointer-events-none absolute bottom-5 left-5 hidden text-[11px] font-semibold text-white/45 sm:block">
          {detector.isReady
            ? "← Geser badan → · berdirilah di bawah bola untuk menangkap · 🙌 angkat dua tangan / condongkan badan untuk meletakkan"
            : "⌨️ Pratinjau: ← → geser · Space meletakkan jawaban · ↑ melompat"}
        </div>
      </div>
    </div>
  );
}

function Stage() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[BASE_X, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0a1122" roughness={0.85} metalness={0.15} />
      </mesh>
      <gridHelper args={[60, 30, "#1d4ed8", "#0f1c3a"]} position={[BASE_X, 0.01, 0]} />

      {LANE_X.map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]}>
          <planeGeometry args={[2.4, 18]} />
          <meshBasicMaterial color="#1e3a8a" transparent opacity={0.3} />
        </mesh>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[SLOT_X, 0.02, 0]}>
        <circleGeometry args={[SLOT_RADIUS, 48]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.18} />
      </mesh>

      {[...Array(90)].map((_, i) => {
        const x = ((i * 37) % 60) - 30 + BASE_X;
        const y = ((i * 53) % 28) + 6;
        const z = -((i * 17) % 30) - 6;
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshBasicMaterial color={i % 5 === 0 ? "#a3e635" : "#93c5fd"} />
          </mesh>
        );
      })}
    </group>
  );
}

function AnswerSlot({
  engine,
  active,
}: {
  engine: React.RefObject<Engine>;
  active: boolean;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const padRef = useRef<THREE.Mesh>(null);
  const t = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(0.05, rawDelta);
    t.current += delta;
    const e = engine.current;
    if (e) e.slotFlash = Math.max(0, e.slotFlash - delta * 1.6);

    const flash = e?.slotFlash ?? 0;
    const tone = e?.slotTone;
    const base = active ? "#22c55e" : "#3b82f6";

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (active ? 1.6 : 0.5);
      const s = 1 + (active ? Math.sin(t.current * 4) * 0.04 : 0) + flash * 0.18;
      ringRef.current.scale.setScalar(s);
      const m = ringRef.current.material as THREE.MeshStandardMaterial;
      m.color.set(tone === "wrong" ? "#fb7185" : tone === "correct" ? "#a3e635" : base);
      m.emissiveIntensity = 0.6 + (active ? 0.7 : 0.15) + flash;
    }
    if (padRef.current) {
      const m = padRef.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.4 + (active ? 0.7 : 0.1) + flash;
      m.emissive.set(tone === "wrong" ? "#9f1239" : tone === "correct" ? "#4d7c0f" : "#1d4ed8");
    }
  });

  return (
    <group position={[SLOT_X, 0, 0]}>
      <mesh ref={padRef} position={[0, 0.14, 0]} receiveShadow>
        <cylinderGeometry args={[SLOT_RADIUS, SLOT_RADIUS + 0.25, 0.28, 48]} />
        <meshStandardMaterial color="#0f1c3a" emissive="#1d4ed8" emissiveIntensity={0.4} roughness={0.5} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[SLOT_RADIUS, 0.11, 12, 64]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.7} />
      </mesh>

      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[1.75, 1.55, 2.4, 32, 1, true]} />
        <meshStandardMaterial
          color="#93c5fd"
          emissive="#1d4ed8"
          emissiveIntensity={0.3}
          transparent
          opacity={0.16}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 2.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.75, 0.09, 12, 48]} />
        <meshStandardMaterial color="#a3e635" emissive="#a3e635" emissiveIntensity={0.6} />
      </mesh>

      <LabelBillboard
        text="TEMPAT JAWABAN"
        position={[0, 3.45, 0]}
        variant="caption"
        color="#cbd5e1"
        maxWidth={6}
        maxChars={30}
      />
    </group>
  );
}

function Scene({
  engine,
  belt,
  setBelt,
  carried,
  setCarried,
  onHud,
  onEnd,
  onBanner,
  onHint,
  questions,
  total,
}: {
  engine: React.RefObject<Engine>;
  belt: Orb[];
  setBelt: React.Dispatch<React.SetStateAction<Orb[]>>;
  carried: Orb | null;
  setCarried: React.Dispatch<React.SetStateAction<Orb | null>>;
  onHud: React.Dispatch<React.SetStateAction<Hud>>;
  onEnd: (why: "clear" | "over" | "timeout") => void;
  onBanner: (s: string) => void;
  onHint: (s: string) => void;
  questions: Question[];
  total: number;
}) {
  const playerRef = useRef<THREE.Group>(null);
  const meshMap = useRef(new Map<string, THREE.Mesh>());
  const hudAcc = useRef(0);
  const spawnAcc = useRef(false);
  const [inSlot, setInSlot] = useState(false);

  const spawnQuestion = useCallback(
    (qi: number) => {
      const q = questions[qi];
      const e = engine.current;
      if (!q || !e) return;
      const lanes = shuffle([0, 1, 2, 3]);
      e.belt = q.options.map((opt, i) => ({
        id: `${qi}-${opt.id}`,
        x: LANE_X[lanes[i] % LANE_X.length],
        y: SPAWN_Y + i * 1.3,
        text: opt.text,
        correct: opt.isCorrect,
      }));
      e.carried = null;
      e.resolved = false;
      e.questionDone = false;
      e.advanceIn = 0;
      e.spawned = true;
      onBanner(q.prompt);
      setCarried(null);
      setBelt([...e.belt]);
    },
    [questions, engine, onBanner, setBelt, setCarried],
  );

  useEffect(() => {
    if (engine.current?.running && !spawnAcc.current) {
      spawnAcc.current = true;
      spawnQuestion(0);
    }
  }, [engine, spawnQuestion]);

  useFrame((_, rawDelta) => {
    const e = engine.current;
    if (!e) return;
    const delta = Math.min(0.05, rawDelta);

    if (e.running) {
      e.elapsed += delta;
      let structural = false;

      // Gerak horizontal (keyboard override, else pose)
      if (e.keyHold > 0) {
        e.keyHold -= delta;
        e.targetX += e.keyDir * MOVE_SPEED * delta;
      }
      const target = Math.max(MIN_X, Math.min(MAX_X, e.targetX));
      e.playerX += (target - e.playerX) * Math.min(1, delta * 8);

      // Lompat / hop
      if (e.vy !== 0 || e.jumpY > 0) {
        e.vy -= 26 * delta;
        e.jumpY += e.vy * delta;
        if (e.jumpY <= 0) {
          e.jumpY = 0;
          e.vy = 0;
        }
      }

      // Bola turun
      for (const o of e.belt) o.y -= ORB_SPEED * delta;

      // Tangkap bola yang sejajar dengan karakter
      if (!e.resolved) {
        const cands = e.belt.filter(
          (o) => o.y <= CATCH_Y + 0.4 && Math.abs(e.playerX - o.x) < 1.9,
        );
        if (cands.length > 0) {
          cands.sort((a, b) => a.y - b.y);
          const c = cands[0];
          e.belt = e.belt.filter((o) => o.id !== c.id);
          e.carried = c;
          if (e.jumpY <= 0.01) e.vy = 6;
          structural = true;
        }
      }

      // Bola menyentuh lantai
      if (!e.resolved) {
        const gone = e.belt.filter((o) => o.y <= 0.25);
        if (gone.length > 0) {
          for (const o of gone) {
            if (o.correct) {
              e.missedCorrect += 1;
              e.lives -= 1;
              e.combo = 0;
              e.slotTone = "wrong";
              e.slotFlash = 0.9;
            }
          }
          e.belt = e.belt.filter((o) => o.y > 0.25);
          structural = true;
        }
      }

      // Meletakkan jawaban
      if (e.placePulse) {
        e.placePulse = false;
        if (e.carried && !e.resolved && !e.questionDone) {
          const inZone = Math.abs(e.playerX - SLOT_X) < SLOT_RADIUS + 0.3;
          if (inZone) {
            const c = e.carried;
            e.carried = null;
            e.vy = 9;
            if (c.correct) {
              e.resolved = true;
              e.combo += 1;
              e.correctPlaces += 1;
              e.score += 100 + e.combo * 20;
              e.slotTone = "correct";
              e.slotFlash = 1.2;
              e.belt = [];
            } else {
              e.wrongPlaces += 1;
              e.combo = 0;
              e.lives -= 1;
              e.slotTone = "wrong";
              e.slotFlash = 1;
            }
            structural = true;
          } else {
            e.hint = "Bawa bolanya ke Tempat Jawaban dulu!";
            e.hintTimer = 1.8;
          }
        }
      }

      // Umpan balik progres condongan (hanya saat menahan condongan untuk meletakkan)
      if (e.carried && !e.resolved && !e.questionDone && e.leanHold > 0) {
        const pct = Math.min(
          100,
          Math.round(((performance.now() - e.leanHold) / (PLACE_HOLD_S * 1000)) * 100),
        );
        e.hint = `Miring… tahan untuk meletakkan ${pct}%`;
        e.hintTimer = 0.2; // pertahankan agar tidak kedip
      }

      if (e.hintTimer > 0) {
        e.hintTimer -= delta;
        if (e.hintTimer <= 0 && e.hint) {
          e.hint = "";
        }
      }

      // Selesai soal → jeda lalu lanjut
      if (!e.questionDone && e.spawned) {
        if (e.resolved) {
          e.questionDone = true;
          e.advanceIn = 1.1;
        } else if (e.belt.length === 0 && !e.carried) {
          e.questionDone = true;
          e.advanceIn = 0.7;
        }
      }
      if (e.questionDone) {
        e.advanceIn -= delta;
        if (e.advanceIn <= 0) {
          e.qi += 1;
          if (e.qi >= total) {
            e.running = false;
            structural = true;
            onEnd("clear");
          } else {
            spawnQuestion(e.qi);
            structural = false;
          }
        }
      }

      if (e.running) {
        if (e.lives <= 0) {
          e.running = false;
          structural = true;
          onEnd("over");
        } else if (e.elapsed >= ROUND_SECONDS) {
          e.running = false;
          structural = true;
          onEnd("timeout");
        }
      }

      const nowInSlot = Math.abs(e.playerX - SLOT_X) < SLOT_RADIUS + 0.3;
      if (nowInSlot !== inSlot) setInSlot(nowInSlot);

      if (structural) {
        setBelt([...e.belt]);
        setCarried(e.carried);
      }
    }

    // Posisi mesh bola
    for (const o of e.belt) {
      const m = meshMap.current.get(o.id);
      if (m) m.position.set(o.x, o.y, 0);
    }

    if (playerRef.current) {
      playerRef.current.position.x = e.playerX;
      playerRef.current.position.y = e.jumpY;
      playerRef.current.rotation.z = -e.targetX * 0.016;
    }

    // HUD throttled
    hudAcc.current += delta;
    if (hudAcc.current > 0.1) {
      hudAcc.current = 0;
      onHint(e.hint);
      onHud((prev) => {
        const next: Hud = {
          score: e.score,
          lives: e.lives,
          combo: e.combo,
          qi: e.qi,
          total,
          time: Math.max(0, ROUND_SECONDS - e.elapsed),
          carrying: !!e.carried,
          carriedText: e.carried?.text ?? "",
          inSlot,
        };
        if (
          prev.score === next.score &&
          prev.lives === next.lives &&
          prev.combo === next.combo &&
          prev.qi === next.qi &&
          prev.carrying === next.carrying &&
          prev.carriedText === next.carriedText &&
          prev.inSlot === next.inSlot &&
          Math.ceil(prev.time) === Math.ceil(next.time)
        ) {
          return prev;
        }
        return next;
      });
    }
  });

  return (
    <group>
      <AnswerSlot engine={engine} active={inSlot} />

      <group ref={playerRef} position={[BASE_X, 0, 0]}>
        <mesh position={[0, 1.15, 0]} castShadow>
          <capsuleGeometry args={[0.55, 1.1, 8, 20]} />
          <meshStandardMaterial
            color="#818cf8"
            emissive="#312e81"
            emissiveIntensity={0.6}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0, 2.35, 0]}>
          <sphereGeometry args={[0.46, 24, 24]} />
          <meshStandardMaterial color="#fde68a" roughness={0.5} />
        </mesh>
        <mesh position={[-0.95, 1.55, 0]} rotation={[0, 0, 0.35]}>
          <capsuleGeometry args={[0.16, 0.75, 6, 12]} />
          <meshStandardMaterial color="#c7d2fe" />
        </mesh>
        <mesh position={[0.95, 1.55, 0]} rotation={[0, 0, -0.35]}>
          <capsuleGeometry args={[0.16, 0.75, 6, 12]} />
          <meshStandardMaterial color="#c7d2fe" />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.35, 0.5, 0.2, 16]} />
          <meshStandardMaterial color="#a3e635" emissive="#3f6212" emissiveIntensity={0.5} />
        </mesh>

        {carried ? (
          <group position={[0, 3.45, 0]}>
            <mesh>
              <sphereGeometry args={[0.82, 28, 28]} />
              <meshStandardMaterial
                color="#fbbf24"
                emissive="#b45309"
                emissiveIntensity={0.85}
                roughness={0.25}
                metalness={0.2}
              />
            </mesh>
            <LabelBillboard text={carried.text} position={[0, 0, 0.92]} />
          </group>
        ) : null}
      </group>

      {belt.map((orb) => (
        <mesh
          key={orb.id}
          ref={(m) => {
            if (m) meshMap.current.set(orb.id, m);
            else meshMap.current.delete(orb.id);
          }}
        >
          <sphereGeometry args={[0.84, 28, 28]} />
          <meshStandardMaterial
            color="#93c5fd"
            emissive="#1d4ed8"
            emissiveIntensity={0.7}
            roughness={0.28}
            metalness={0.25}
          />
          <LabelBillboard text={orb.text} position={[0, 0, 0.92]} />
        </mesh>
      ))}
    </group>
  );
}

function Box({ label, value, tone }: { label: string; value: string; tone?: "accent" }) {
  return (
    <div className="rounded-2xl border border-line bg-elev px-4 py-5 text-center">
      <p className={cn("font-display text-3xl font-bold", tone === "accent" && "text-accent")}>
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}

function HudPill({
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
          "font-display text-base font-bold leading-tight",
          danger ? "text-danger" : accent ? "text-accent" : "text-fg",
        )}
      >
        {value}
      </p>
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
