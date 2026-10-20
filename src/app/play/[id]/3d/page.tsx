"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { CameraStage } from "@/components/game/CameraStage";
import { LabelBillboard } from "@/components/game/LabelBillboard";
import { Button } from "@/components/ui/Button";
import { usePoseDetector, type PoseFrame } from "@/hooks/usePoseDetector";
import { cn, uid } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useDataStore } from "@/store/useDataStore";
import type { Landmark, Question, QuestionSet } from "@/types";

const LANE_X = [-6, -2, 2, 6];
const CATCH_Y = 1.7;
const ORB_SPEED = 3.1;
const SPAWN_Y = 12.5;
const MOVE_RANGE = 7.5;
const MOVE_SPEED = 14;
const ROUND_SECONDS = 100;

interface Orb {
  id: string;
  x: number;
  y: number;
  text: string;
  correct: boolean;
}

interface Engine {
  orbs: Orb[];
  playerX: number;
  targetX: number;
  keyDir: number;
  keyHold: number;
  jumpY: number;
  vy: number;
  running: boolean;
  finished: boolean;
  score: number;
  lives: number;
  combo: number;
  qi: number;
  pending: number;
  elapsed: number;
  correctCatches: number;
  wrongCatches: number;
  missedCorrect: number;
}

interface Hud {
  score: number;
  lives: number;
  combo: number;
  qi: number;
  total: number;
  time: number;
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
    orbs: [],
    playerX: 0,
    targetX: 0,
    keyDir: 0,
    keyHold: 0,
    jumpY: 0,
    vy: 0,
    running: false,
    finished: false,
    score: 0,
    lives: 3,
    combo: 0,
    qi: 0,
    pending: 0,
    elapsed: 0,
    correctCatches: 0,
    wrongCatches: 0,
    missedCorrect: 0,
  };
}

export default function Play3DPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sets = useDataStore((s) => s.sets);
  const loading = useDataStore((s) => s.loading);
  const recordResult = useDataStore((s) => s.recordResult);
  const saveSet = useDataStore((s) => s.saveSet);
  const user = useAuthStore((s) => s.user);
  const set = useMemo(() => sets.find((s) => s.id === id), [sets, id]);

  const [phase, setPhase] = useState<"setup" | "playing" | "done">("setup");
  const [hud, setHud] = useState<Hud>({
    score: 0,
    lives: 3,
    combo: 0,
    qi: 0,
    total: set?.questions.length ?? 0,
    time: ROUND_SECONDS,
  });
  const [banner, setBanner] = useState("");
  const [orbs, setOrbs] = useState<Orb[]>([]);
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
          mode: "motion-catch-3d",
          score: e.score,
          total: set.questions.length,
          correct: e.correctCatches,
          wrong: e.wrongCatches + e.missedCorrect,
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
    const hipX = (lm[23].x + lm[24].x) / 2;
    if (engine.current.keyHold <= 0) engine.current.targetX = (0.5 - hipX) * 2 * MOVE_RANGE;
    if (f.action === "raise_both_hands" && engine.current.jumpY <= 0.01 && engine.current.running) {
      engine.current.vy = 10.5;
    }
  }, []);

  const detector = usePoseDetector({ mirror: true, onFrame });

  const begin = () => {
    const e = createEngine();
    engine.current = e;
    e.running = true;
    finishedRef.current = false;
    setOrbs([]);
    setHud({
      score: 0,
      lives: 3,
      combo: 0,
      qi: 0,
      total: questionsRef.current.length,
      time: ROUND_SECONDS,
    });
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
      } else if (
        (ev.key === " " || ev.key === "Enter" || ev.key === "ArrowUp" || ev.key === "w") &&
        e.jumpY <= 0.01
      ) {
        e.vy = 10.5;
        if (ev.key === " ") ev.preventDefault();
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
            Motion Catch 3D
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
            <Box label="Soal tuntas" value={`${Math.min(hud.qi + 1, total)}/${total}`} />
            <Box
              label="Kombo terbaik"
              value={`×${Math.max(hud.combo, 0)}`}
              tone="accent"
            />
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
              Motion Catch 3D
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
                  t: "Geser badan untuk berpindah lajur",
                  d: "Condongkan badan ke kiri/kanan. Karakter 3D akan mengikuti posisi pangkal pahamu.",
                },
                {
                  n: "2",
                  t: "Angkat kedua tangan untuk melompat",
                  d: "Menangkap bola sambil menerbangkan karakter memberi bonus skor tambahan.",
                },
                {
                  n: "3",
                  t: "Tangkap bola jawaban yang benar",
                  d: "Bola hijau = jawaban benar. Bola merah sebaiknya dihindari. Salah tangkap atau terlewat mengurangi nyawa.",
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
              <>
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
              </>
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
              <span className="text-[11px]">← → geser · ↑ / Space melompat</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-xl">
        <Link
          href="/play"
          className="rounded-lg px-2 py-1.5 text-sm font-semibold text-muted hover:text-fg"
        >
          ← Keluar
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{set.title}</p>
          <p className="truncate text-[11px] text-muted">
            Soal {Math.min(hud.qi + 1, hud.total)} · tangkap jawaban benar
          </p>
        </div>
        <HudPill label="Skor" value={hud.score.toString()} accent />
        {hud.combo >= 2 && <HudPill label="Kombo" value={`🔥×${hud.combo}`} />}
        <HudPill label="Nyawa" value={"❤️".repeat(Math.max(0, hud.lives)) || "0"} danger={hud.lives <= 1} />
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
          camera={{ position: [0, 6.5, 21], fov: 50, near: 0.1, far: 120 }}
          onCreated={({ camera }) => camera.lookAt(0, 3.6, 0)}
          gl={{ antialias: true }}
        >
          <color attach="background" args={["#050a16"]} />
          <fog attach="fog" args={["#050a16", 26, 55]} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[8, 16, 10]} intensity={1.5} color="#c7d2fe" />
          <pointLight position={[0, 8, 8]} intensity={40} color="#818cf8" distance={40} />
          <pointLight position={[-10, 4, -6]} intensity={25} color="#a3e635" distance={35} />

          <Stage />

          <Player engine={engine} />

          <Scene
            engine={engine}
            orbs={orbs}
            setOrbs={setOrbs}
            onHud={setHud}
            onEnd={endRound}
            onBanner={setBanner}
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

        {orbs.length > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-3 p-5">
            {[...orbs]
              .sort((a, b) => a.x - b.x)
              .map((o) => (
                <span
                  key={o.id}
                  className="rounded-full border border-white/15 bg-black/45 px-3.5 py-1.5 text-[12px] font-bold text-white backdrop-blur"
                >
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                    style={{ background: o.correct ? "#a3e635" : "#fb7185" }}
                  />
                  {o.text}
                </span>
              ))}
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-5 left-5 hidden text-[11px] font-semibold text-white/45 sm:block">
          {detector.isReady
            ? "← Geser badan → · ↑ Angkat dua tangan untuk lompat"
            : "⌨️ Pratinjau: ← → geser · ↑ / Space melompat"}
        </div>
      </div>
    </div>
  );
}

const PLAYER_Z = -2;
const PLAYER_SCALE = 1.5;

function Player({ engine }: { engine: React.RefObject<Engine> }) {
  const gltf = useGLTF("/models/humanoid.glb");
  const { playerX, jumpY } = engine.current;
  const rotY = Math.atan2(engine.current.keyDir, 1) * 0.5;

  return (
    <group position={[playerX, jumpY, PLAYER_Z]} rotation={[0, rotY, 0]}>
      <primitive object={gltf.scene} scale={PLAYER_SCALE} />
    </group>
  );
}

function Stage() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0a1122" roughness={0.85} metalness={0.15} />
      </mesh>
      <gridHelper args={[60, 30, "#1d4ed8", "#0f1c3a"]} position={[0, 0.01, 0]} />

      {LANE_X.map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]}>
          <planeGeometry args={[2.4, 16]} />
          <meshBasicMaterial color="#1e3a8a" transparent opacity={0.35} />
        </mesh>
      ))}

      {[...Array(90)].map((_, i) => {
        const x = ((i * 37) % 60) - 30;
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

function Scene({
  engine,
  orbs,
  setOrbs,
  onHud,
  onEnd,
  onBanner,
  questions,
  total,
}: {
  engine: React.RefObject<Engine>;
  orbs: Orb[];
  setOrbs: React.Dispatch<React.SetStateAction<Orb[]>>;
  onHud: React.Dispatch<React.SetStateAction<Hud>>;
  onEnd: (why: "clear" | "over" | "timeout") => void;
  onBanner: (s: string) => void;
  questions: Question[];
  total: number;
}) {
  const playerRef = useRef<THREE.Group>(null);
  const groupMap = useRef(new Map<string, THREE.Group>());
  const spinMap = useRef(new Map<string, THREE.Mesh>());
  const hudAcc = useRef(0);
  const spawnAcc = useRef(false);

  const spawnQuestion = useCallback(
    (qi: number) => {
      const q = questions[qi];
      const e = engine.current;
      if (!q || !e) return;
      const lanes = shuffle([0, 1, 2, 3]);
      e.orbs = q.options.map((opt, i) => ({
        id: `${qi}-${opt.id}`,
        x: LANE_X[lanes[i]],
        y: SPAWN_Y + i * 1.25,
        text: opt.text,
        correct: opt.isCorrect,
      }));
      e.pending = e.orbs.length;
      onBanner(q.prompt);
      setOrbs([...e.orbs]);
    },
    [questions, engine, onBanner, setOrbs],
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

      // Gerak horizontal mengikuti posisi badan
      if (e.keyHold > 0) {
        e.keyHold -= delta;
        e.targetX += e.keyDir * MOVE_SPEED * delta;
      }
      const target = Math.max(-MOVE_RANGE, Math.min(MOVE_RANGE, e.targetX));
      e.playerX += (target - e.playerX) * Math.min(1, delta * 7);

      // Lompat
      if (e.vy !== 0 || e.jumpY > 0) {
        e.vy -= 26 * delta;
        e.jumpY += e.vy * delta;
        if (e.jumpY <= 0) {
          e.jumpY = 0;
          e.vy = 0;
        }
      }

      // Jatuhkan bola
      let structural = false;
      for (const o of e.orbs) o.y -= ORB_SPEED * delta;

      const landed = e.orbs.filter((o) => o.y <= CATCH_Y);
      if (landed.length > 0) {
        for (const o of landed) {
          const near = Math.abs(e.playerX - o.x) < 1.75;
          if (near) {
            if (o.correct) {
              e.combo += 1;
              e.correctCatches += 1;
              e.score += 100 + (e.jumpY > 0.3 ? 50 : 0) + e.combo * 15;
            } else {
              e.wrongCatches += 1;
              e.score = Math.max(0, e.score - 40);
              e.combo = 0;
            }
          } else if (o.correct) {
            e.missedCorrect += 1;
            e.lives -= 1;
            e.combo = 0;
          }
          e.pending -= 1;
        }
        e.orbs = e.orbs.filter((o) => o.y > CATCH_Y);
        structural = true;
      }

      // Waktu habis
      if (e.elapsed >= ROUND_SECONDS) {
        e.running = false;
        structural = true;
        onEnd("timeout");
      } else if (e.lives <= 0) {
        e.running = false;
        structural = true;
        onEnd("over");
      } else if (structural && e.pending <= 0) {
        if (e.qi + 1 >= total) {
          e.running = false;
          onEnd("clear");
        } else {
          e.qi += 1;
          spawnQuestion(e.qi);
          structural = false;
        }
      }

      if (structural) setOrbs([...e.orbs]);
    }

    // Terapkan posisi ke mesh
    for (const o of e.orbs) {
      const g = groupMap.current.get(o.id);
      if (g) g.position.set(o.x, o.y, 0);
      const s = spinMap.current.get(o.id);
      if (s) {
        s.rotation.y += delta * 1.4;
        s.rotation.x += delta * 0.7;
      }
    }

    if (playerRef.current) {
      playerRef.current.position.x = e.playerX;
      playerRef.current.position.y = e.jumpY;
      playerRef.current.rotation.z = -e.targetX * 0.02;
    }

    // HUD throttled
    hudAcc.current += delta;
    if (hudAcc.current > 0.12) {
      hudAcc.current = 0;
      onHud((prev) => {
        const next: Hud = {
          score: e.score,
          lives: e.lives,
          combo: e.combo,
          qi: e.qi,
          total,
          time: Math.max(0, ROUND_SECONDS - e.elapsed),
        };
        if (
          prev.score === next.score &&
          prev.lives === next.lives &&
          prev.combo === next.combo &&
          prev.qi === next.qi &&
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
      <group ref={playerRef} position={[0, 0, 0]}>
        <mesh position={[0, 1.15, 0]} castShadow>
          <capsuleGeometry args={[0.55, 1.1, 8, 20]} />
          <meshStandardMaterial color="#818cf8" emissive="#312e81" emissiveIntensity={0.6} roughness={0.35} />
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
      </group>

      {orbs.map((orb) => (
        <group
          key={orb.id}
          ref={(g) => {
            if (g) groupMap.current.set(orb.id, g);
            else groupMap.current.delete(orb.id);
          }}
        >
          <mesh
            ref={(m) => {
              if (m) spinMap.current.set(orb.id, m);
              else spinMap.current.delete(orb.id);
            }}
          >
            <sphereGeometry args={[0.85, 28, 28]} />
            <meshStandardMaterial
              color={orb.correct ? "#a3e635" : "#fb7185"}
              emissive={orb.correct ? "#4d7c0f" : "#9f1239"}
              emissiveIntensity={0.85}
              roughness={0.25}
              metalness={0.2}
            />
          </mesh>
          <LabelBillboard text={orb.text} position={[0, 0, 0.95]} />
        </group>
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
