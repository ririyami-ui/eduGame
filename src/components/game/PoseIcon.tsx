import type { PoseAction } from "@/types";
import { cn } from "@/lib/utils";

type Pt = [number, number];

interface Fig {
  head: Pt;
  shL: Pt;
  shR: Pt;
  elL: Pt;
  elR: Pt;
  wrL: Pt;
  wrR: Pt;
  hipL: Pt;
  hipR: Pt;
  knL: Pt;
  knR: Pt;
  anL: Pt;
  anR: Pt;
}

const BASE: Fig = {
  head: [50, 15],
  shL: [40, 29],
  shR: [60, 29],
  elL: [36, 44],
  elR: [64, 44],
  wrL: [34, 57],
  wrR: [66, 57],
  hipL: [44, 57],
  hipR: [56, 57],
  knL: [44, 76],
  knR: [56, 76],
  anL: [44, 94],
  anR: [56, 94],
};

const OVERRIDE: Record<PoseAction, Partial<Fig>> = {
  raise_left_hand: { elL: [33, 20], wrL: [32, 6] },
  raise_right_hand: { elR: [67, 20], wrR: [68, 6] },
  raise_both_hands: { elL: [33, 20], wrL: [30, 5], elR: [67, 20], wrR: [70, 5] },
  t_pose: { elL: [27, 29], wrL: [12, 29], elR: [73, 29], wrR: [88, 29] },
  squat: {
    head: [50, 30],
    shL: [40, 43],
    shR: [60, 43],
    elL: [31, 52],
    elR: [69, 52],
    wrL: [28, 62],
    wrR: [72, 62],
    hipL: [44, 68],
    hipR: [56, 68],
    knL: [30, 80],
    knR: [70, 80],
    anL: [38, 94],
    anR: [62, 94],
  },
  jump: {
    head: [50, 7],
    shL: [40, 21],
    shR: [60, 21],
    elL: [27, 13],
    elR: [73, 13],
    wrL: [20, 5],
    wrR: [80, 5],
    hipL: [44, 48],
    hipR: [56, 48],
    knL: [37, 64],
    knR: [63, 64],
    anL: [42, 79],
    anR: [58, 79],
  },
  lean_left: {
    head: [39, 17],
    shL: [29, 31],
    shR: [49, 30],
    elL: [20, 39],
    elR: [41, 40],
    wrL: [13, 47],
    wrR: [35, 49],
  },
  lean_right: {
    head: [61, 17],
    shL: [51, 30],
    shR: [71, 31],
    elL: [59, 40],
    elR: [80, 39],
    wrL: [65, 49],
    wrR: [87, 47],
  },
  kick_left: { knL: [33, 74], anL: [19, 69] },
  kick_right: { knR: [67, 74], anR: [81, 69] },
};

function build(action: PoseAction): Fig {
  return { ...BASE, ...OVERRIDE[action] };
}

const line = (a: Pt, b: Pt) => (
  <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeLinecap="round" />
);

export function PoseIcon({
  action,
  className,
  strokeWidth = 6,
}: {
  action: PoseAction;
  className?: string;
  strokeWidth?: number;
}) {
  const f = build(action);
  const shMid: Pt = [(f.shL[0] + f.shR[0]) / 2, (f.shL[1] + f.shR[1]) / 2];
  const hipMid: Pt = [(f.hipL[0] + f.hipR[0]) / 2, (f.hipL[1] + f.hipR[1]) / 2];

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-full w-full", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden
    >
      <circle cx={f.head[0]} cy={f.head[1]} r={7} strokeWidth={strokeWidth * 0.9} />
      {line(shMid, hipMid)}
      {line(f.shL, f.elL)}
      {line(f.elL, f.wrL)}
      {line(f.shR, f.elR)}
      {line(f.elR, f.wrR)}
      {line(f.hipL, f.knL)}
      {line(f.knL, f.anL)}
      {line(f.hipR, f.knR)}
      {line(f.knR, f.anR)}
    </svg>
  );
}
