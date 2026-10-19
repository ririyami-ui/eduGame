import type { GameMode, PoseAction } from "@/types";

export const MODE_LABEL: Record<GameMode, string> = {
  "pose-quiz-2d": "Pose Quiz 2D",
  "motion-catch-3d": "Motion Catch 3D",
  "answer-slot-3d": "Ambil & Tempatkan 3D",
  "catch-eat-2d": "Tangkap & Makan",
  "archery-2d": "Panahan",
};

export const MODE_SHORT: Record<GameMode, string> = {
  "pose-quiz-2d": "2D",
  "motion-catch-3d": "3D",
  "answer-slot-3d": "3D+",
  "catch-eat-2d": "2D+",
  "archery-2d": "2D+",
};

export const MODE_DESC: Record<GameMode, string> = {
  "pose-quiz-2d": "Jawab dengan gerakan — tahan pose untuk mengunci pilihan.",
  "motion-catch-3d": "Kendalikan karakter 3D, tangkap bola jawaban yang benar.",
  "answer-slot-3d": "Tangkap bola jawaban, bawa, lalu letakkan di Tempat Jawaban.",
  "catch-eat-2d": "Pegang jawaban melayang dengan tangan lalu bawa ke mulut — mahkota jika benar, bom jika salah.",
  "archery-2d": "Bidik jawaban dengan tangan, tahan sampai busur penuh — panah dilepas otomatis.",
};

export function modeHref(setId: string, mode: GameMode): string {
  if (mode === "motion-catch-3d") return `/play/${setId}/3d`;
  if (mode === "answer-slot-3d") return `/play/${setId}/3d-slot`;
  if (mode === "catch-eat-2d") return `/play/${setId}/eat`;
  if (mode === "archery-2d") return `/play/${setId}/archery`;
  return `/play/${setId}`;
}

export const POSE_LABEL: Record<PoseAction, string> = {
  raise_left_hand: "Angkat Tangan Kiri",
  raise_right_hand: "Angkat Tangan Kanan",
  raise_both_hands: "Angkat Kedua Tangan",
  squat: "Jongkok",
  jump: "Lompat",
  lean_left: "Miring ke Kiri",
  lean_right: "Miring ke Kanan",
  t_pose: "Rentangkan Tangan",
  kick_left: "Angkat Kaki Kiri",
  kick_right: "Angkat Kaki Kanan",
};

export const POSE_DESC: Record<PoseAction, string> = {
  raise_left_hand: "Berdiri tegak, angkat tangan kiri lurus ke atas di atas bahu.",
  raise_right_hand: "Berdiri tegak, angkat tangan kanan lurus ke atas di atas bahu.",
  raise_both_hands: "Angkat kedua tangan lurus ke atas di atas kepala.",
  squat: "Turunkan badan seperti jongkok, lutut menekuk ±90°.",
  jump: "Lompat kecil dari tempat, kedua kaki terangkat dari lantai.",
  lean_left: "Condongkan badan ke arah kiri kamu (bahu bergeser).",
  lean_right: "Condongkan badan ke arah kanan kamu (bahu bergeser).",
  t_pose: "Rentangkan kedua tangan lurus ke samping setinggi bahu.",
  kick_left: "Angkat kaki kiri ke depan, lutut tetap relatif lurus.",
  kick_right: "Angkat kaki kanan ke depan, lutut tetap relatif lurus.",
};

export const SUBJECT_LABEL: Record<string, string> = {
  math: "Matematika",
  science: "IPA / Sains",
  english: "Bahasa Inggris",
  indo: "Bahasa Indonesia",
  history: "Sejarah",
  civics: "PPKn",
  other: "Lainnya",
};
