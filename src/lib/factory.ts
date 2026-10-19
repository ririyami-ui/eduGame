import { uid } from "@/lib/utils";
import type { QuestionSet } from "@/types";

export function emptySet(ownerId: string, ownerName: string): QuestionSet {
  const now = Date.now();
  return {
    id: uid("set"),
    ownerId,
    ownerName,
    title: "",
    subject: "math",
    grade: "VII",
    description: "",
    mode: "pose-quiz-2d",
    isPublic: false,
    plays: 0,
    avgScore: 0,
    createdAt: now,
    updatedAt: now,
    questions: [],
  };
}
