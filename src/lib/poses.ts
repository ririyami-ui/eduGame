import type { Calibration, Landmark, PoseAction } from "@/types";

export const POSE_CONNECTIONS: [number, number][] = [
  [0, 11], [0, 12],
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24],
  [23, 24],
  [23, 25], [25, 27],
  [24, 26], [26, 28],
];

const ID = {
  nose: 0,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lKnee: 25,
  rKnee: 26,
  lAnkle: 27,
  rAnkle: 28,
} as const;

type V2 = { x: number; y: number };

function mid(a: V2, b: V2): V2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function dist(a: V2, b: V2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function angleDeg(a: V2, b: V2, c: V2): number {
  const abx = a.x - b.x, aby = a.y - b.y;
  const cbx = c.x - b.x, cby = c.y - b.y;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag === 0) return 180;
  const dot = (abx * cbx + aby * cby) / mag;
  return (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI;
}

function vis(lm: Landmark | undefined, min = 0.3): boolean {
  if (!lm) return false;
  return (lm.visibility ?? 1) >= min;
}

/**
 * Kalibrasi posisi berdiri netral. Dipakai agar deteksi jongkok & lompat
 * relatif terhadap tubuh siswa, bukan absolut terhadap frame.
 */
export function calibrate(lm: Landmark[]): Calibration {
  const sh = mid(lm[ID.lShoulder], lm[ID.rShoulder]);
  const hip = mid(lm[ID.lHip], lm[ID.rHip]);
  const torso = Math.max(0.05, dist(sh, hip));
  return {
    torso,
    shoulderY: sh.y,
    hipY: hip.y,
    ankleY: (lm[ID.lAnkle].y + lm[ID.rAnkle].y) / 2,
    center: hip.x,
    capturedAt: Date.now(),
  };
}

export interface PoseReading {
  action: PoseAction | null;
  confidence: number;
}

/**
 * Deteksi satu pose dari 33 landmark MediaPipe Pose.
 * Prioritas: lompat > angkat tangan > rentang > jongkok > miring > tendang.
 */
export function detectPose(lm: Landmark[], cal: Calibration | null): PoseReading {
  if (!lm || lm.length < 29) return { action: null, confidence: 0 };

  const lSh = lm[ID.lShoulder], rSh = lm[ID.rShoulder];
  const lWr = lm[ID.lWrist], rWr = lm[ID.rWrist];
  const lHip = lm[ID.lHip], rHip = lm[ID.rHip];
  const lAn = lm[ID.lAnkle], rAn = lm[ID.rAnkle];
  const lKn = lm[ID.lKnee], rKn = lm[ID.rKnee];

  const visible =
    vis(lSh, 0.25) && vis(rSh, 0.25) && vis(lHip, 0.25) && vis(rHip, 0.25) &&
    (vis(lWr, 0.15) || vis(rWr, 0.15));

  if (!visible) return { action: null, confidence: 0 };

  const sh = mid(lSh, rSh);
  const hip = mid(lHip, rHip);
  const torso = Math.max(0.05, dist(sh, hip));
  const conf = Math.min(
    (lSh.visibility ?? 1),
    (rSh.visibility ?? 1),
    (lHip.visibility ?? 1),
    (rHip.visibility ?? 1),
  );

  const margin = torso * 0.15;
  const lUp = vis(lWr, 0.15) && lWr.y < lSh.y - margin;
  const rUp = vis(rWr, 0.15) && rWr.y < rSh.y - margin;

  const kneeL = angleDeg(lHip, lKn, lAn);
  const kneeR = angleDeg(rHip, rKn, rAn);
  const crouched = cal ? hip.y > cal.hipY + cal.torso * 0.28 : (kneeL < 110 || kneeR < 110);

  const ankleLift = cal ? cal.ankleY - (lAn.y + rAn.y) / 2 : 0;
  const inAir = vis(lAn, 0.15) && vis(rAn, 0.15) && cal
    ? ankleLift > cal.torso * 0.19
    : false;

  // 1) Lompat — kaki terangkat dari garis lantai hasil kalibrasi
  if (inAir) return { action: "jump", confidence: conf };

  // 2) Angkat kedua tangan
  if (lUp && rUp) return { action: "raise_both_hands", confidence: conf };

  // 3) Rentangkan tangan (T-pose): tangan setinggi bahu & melebar
  if (vis(lWr, 0.15) && vis(rWr, 0.15)) {
    const armSpan = dist(lWr, rWr);
    const atShoulder =
      Math.abs(lWr.y - lSh.y) < torso * 0.24 &&
      Math.abs(rWr.y - rSh.y) < torso * 0.24;
    if (atShoulder && armSpan > torso * 1.45) {
      return { action: "t_pose", confidence: conf };
    }
  }

  // 4) Angkat satu tangan
  if (lUp && !rUp) return { action: "raise_left_hand", confidence: conf };
  if (rUp && !lUp) return { action: "raise_right_hand", confidence: conf };

  // 5) Jongkok
  if (crouched) return { action: "squat", confidence: conf };

  // 6) Miring badan (bahu bergeser relatif terhadap pangkal paha)
  const lean = (sh.x - hip.x) / torso;
  if (lean > 0.38) return { action: "lean_left", confidence: conf };
  if (lean < -0.38) return { action: "lean_right", confidence: conf };

  // 7) Tendang / angkat kaki
  if (vis(lAn, 0.15) && lAn.y < hip.y + torso * 0.05 && kneeL > 125) {
    return { action: "kick_left", confidence: conf };
  }
  if (vis(rAn, 0.15) && rAn.y < hip.y + torso * 0.05 && kneeR > 125) {
    return { action: "kick_right", confidence: conf };
  }

  return { action: null, confidence: conf };
}

/** Peredam getar: vote mayoritas pada jendela N frame terakhir. */
export class PoseSmoother {
  private buf: (PoseAction | null)[] = [];

  constructor(private size = 9) {}

  push(action: PoseAction | null): void {
    this.buf.push(action);
    if (this.buf.length > this.size) this.buf.shift();
  }

  get value(): PoseAction | null {
    const counts = new Map<PoseAction, number>();
    for (const a of this.buf) if (a) counts.set(a, (counts.get(a) ?? 0) + 1);
    let best: PoseAction | null = null;
    let bestN = 0;
    for (const [k, n] of counts) {
      if (n > bestN) {
        best = k;
        bestN = n;
      }
    }
    const threshold = Math.ceil(this.size * 0.55);
    return bestN >= threshold ? best : null;
  }

  /** 0..1 — berapa stabil pose saat ini (dipakai untuk "tahan untuk memilih"). */
  get hold(): number {
    const v = this.value;
    if (!v) return 0;
    let n = 0;
    for (const a of this.buf) if (a === v) n++;
    return n / this.size;
  }

  reset(): void {
    this.buf = [];
  }
}

export function drawPose(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  w: number,
  h: number,
  mirror: boolean,
  highlight?: PoseAction | null,
): void {
  const px = (p: Landmark) => (mirror ? (1 - p.x) * w : p.x * w);
  const py = (p: Landmark) => p.y * h;

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(163, 230, 53, 0.95)";
  ctx.shadowColor = "rgba(163, 230, 53, 0.55)";
  ctx.shadowBlur = 12;

  for (const [a, b] of POSE_CONNECTIONS) {
    const pa = lm[a], pb = lm[b];
    if (!pa || !pb) continue;
    if ((pa.visibility ?? 1) < 0.2 || (pb.visibility ?? 1) < 0.2) continue;
    ctx.beginPath();
    ctx.moveTo(px(pa), py(pa));
    ctx.lineTo(px(pb), py(pb));
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#a3e635";
  const r = Math.max(3.5, w * 0.008);
  for (const p of lm) {
    if ((p.visibility ?? 1) < 0.25) continue;
    ctx.beginPath();
    ctx.arc(px(p), py(p), r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (highlight) {
    const nose = lm[0];
    if (nose && (nose.visibility ?? 1) > 0.25) {
      ctx.strokeStyle = "#f472b6";
      ctx.lineWidth = Math.max(4, w * 0.008);
      ctx.beginPath();
      ctx.arc(px(nose), py(nose), r * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}
