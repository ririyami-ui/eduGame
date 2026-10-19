export type Role = "teacher" | "student" | "admin";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: Role;
  school?: string;
  createdAt: number;
}

export type PoseAction =
  | "raise_left_hand"
  | "raise_right_hand"
  | "raise_both_hands"
  | "squat"
  | "jump"
  | "lean_left"
  | "lean_right"
  | "t_pose"
  | "kick_left"
  | "kick_right";

export const POSE_ACTIONS: PoseAction[] = [
  "raise_left_hand",
  "raise_right_hand",
  "raise_both_hands",
  "squat",
  "jump",
  "lean_left",
  "lean_right",
  "t_pose",
  "kick_left",
  "kick_right",
];

export type GameMode =
  | "pose-quiz-2d"
  | "motion-catch-3d"
  | "answer-slot-3d"
  | "catch-eat-2d"
  | "archery-2d";

export const GAME_MODES: {
  id: GameMode;
  label: string;
  short: string;
  desc: string;
  tone: "brand" | "accent" | "ok";
}[] = [
  {
    id: "pose-quiz-2d",
    label: "Pose Quiz 2D",
    short: "2D",
    desc: "Jawab dengan gerakan — tahan pose untuk mengunci pilihan.",
    tone: "brand",
  },
  {
    id: "motion-catch-3d",
    label: "Motion Catch 3D",
    short: "3D",
    desc: "Kendalikan karakter 3D, tangkap bola jawaban yang benar.",
    tone: "accent",
  },
  {
    id: "answer-slot-3d",
    label: "Ambil & Tempatkan 3D",
    short: "3D+",
    desc: "Tangkap bola jawaban, bawa, lalu letakkan di Tempat Jawaban.",
    tone: "ok",
  },
  {
    id: "catch-eat-2d",
    label: "Tangkap & Makan",
    short: "2D+",
    desc: "Pegang jawaban melayang dengan tangan, lalu bawa ke mulut untuk memakannya.",
    tone: "accent",
  },
  {
    id: "archery-2d",
    label: "Panahan",
    short: "2D+",
    desc: "Bidik jawaban dengan tangan, tahan sampai busur penuh — panah dilepas otomatis.",
    tone: "ok",
  },
];

export type Subject =
  | "math"
  | "science"
  | "english"
  | "indo"
  | "history"
  | "civics"
  | "other";

export const SUBJECTS: { id: Subject; label: string }[] = [
  { id: "math", label: "Matematika" },
  { id: "science", label: "IPA / Sains" },
  { id: "english", label: "Bahasa Inggris" },
  { id: "indo", label: "Bahasa Indonesia" },
  { id: "history", label: "Sejarah" },
  { id: "civics", label: "PPKn" },
  { id: "other", label: "Lainnya" },
];

export const GRADES = ["VII", "VIII", "IX", "Umum"];

export interface AnswerOption {
  id: string;
  text: string;
  pose: PoseAction;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  prompt: string;
  hint?: string;
  options: AnswerOption[];
}

export interface QuestionSet {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  subject: Subject;
  grade: string;
  description: string;
  mode: GameMode;
  questions: Question[];
  isPublic: boolean;
  plays: number;
  avgScore: number;
  createdAt: number;
  updatedAt: number;
}

export interface MediaAsset {
  id: string;
  ownerId: string;
  name: string;
  url: string;
  type: "image" | "audio" | "video";
  tags: string[];
  createdAt: number;
}

export interface GameResult {
  id: string;
  ownerId: string;
  setId: string;
  setTitle: string;
  mode: GameMode;
  score: number;
  total: number;
  correct: number;
  wrong: number;
  durationMs: number;
  createdAt: number;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface Calibration {
  torso: number;
  shoulderY: number;
  hipY: number;
  ankleY: number;
  center: number;
  capturedAt: number;
}
