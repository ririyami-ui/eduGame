"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AiSoalCard } from "@/components/forms/AiSoalCard";
import { PoseIcon } from "@/components/game/PoseIcon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { POSE_DESC, POSE_LABEL, MODE_LABEL } from "@/lib/labels";
import type { GeneratedQuestion } from "@/lib/gemini";
import { uid } from "@/lib/utils";
import { GRADES, GAME_MODES, POSE_ACTIONS, SUBJECTS, type PoseAction, type QuestionSet } from "@/types";
import { useDataStore } from "@/store/useDataStore";

const POSE_POOL: PoseAction[] = [
  "raise_both_hands",
  "raise_left_hand",
  "raise_right_hand",
  "squat",
  "t_pose",
  "lean_left",
  "lean_right",
  "jump",
];

function pickPoses(seed: number): PoseAction[] {
  const out: PoseAction[] = [];
  for (let i = 0; i < 4; i++) out.push(POSE_POOL[(seed + i * 3) % POSE_POOL.length]);
  return [...new Set(out)];
  }

export function SetEditor({
  initial,
  isNew,
}: {
  initial: QuestionSet;
  isNew: boolean;
}) {
  const router = useRouter();
  const saveSet = useDataStore((s) => s.saveSet);
  const [set, setSet] = useState<QuestionSet>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchMeta = (p: Partial<QuestionSet>) => setSet((s) => ({ ...s, ...p }));

  const usedPoses = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of set.questions) for (const o of q.options) m.set(o.pose, (m.get(o.pose) ?? 0) + 1);
    return m;
  }, [set.questions]);

  const addQuestion = () => {
    const poses = pickPoses(set.questions.length * 3 + 1);
    setSet((s) => ({
      ...s,
      questions: [
        ...s.questions,
        {
          id: uid("q"),
          prompt: "",
          hint: "",
          options: ["", "", "", ""].map((text, i) => ({
            id: uid("o"),
            text,
            pose: poses[i],
            isCorrect: i === 0,
          })),
        },
      ],
    }));
  };

  const addAiQuestions = (raw: GeneratedQuestion[], suggestedTitle?: string) =>
    setSet((s) => ({
      ...s,
      title: s.title.trim() ? s.title : suggestedTitle?.trim() || s.title,
      questions: [
        ...s.questions,
        ...raw.map((r, qi) => {
          const poses = pickPoses((s.questions.length + qi) * 3 + 1);
          return {
            id: uid("q"),
            prompt: r.prompt,
            hint: r.hint ?? "",
            options: r.options.slice(0, 4).map((text, i) => ({
              id: uid("o"),
              text,
              pose: poses[i] ?? POSE_POOL[i],
              isCorrect: i === r.correctIndex,
            })),
          };
        }),
      ],
    }));

  const patchQuestion = (qid: string, p: Partial<QuestionSet["questions"][number]>) =>
    setSet((s) => ({
      ...s,
      questions: s.questions.map((q) => (q.id === qid ? { ...q, ...p } : q)),
    }));

  const patchOption = (qid: string, oid: string, p: { text?: string; pose?: PoseAction; isCorrect?: boolean }) =>
    setSet((s) => ({
      ...s,
      questions: s.questions.map((q) =>
        q.id !== qid
          ? q
          : {
              ...q,
              options: q.options.map((o) => (o.id === oid ? { ...o, ...p } : o)),
            },
      ),
    }));

  const removeQuestion = (qid: string) =>
    setSet((s) => ({ ...s, questions: s.questions.filter((q) => q.id !== qid) }));

  const validate = (): string | null => {
    if (!set.title.trim()) return "Judul bank soal wajib diisi.";
    if (set.questions.length === 0) return "Minimal harus ada satu soal.";
    for (let i = 0; i < set.questions.length; i++) {
      const q = set.questions[i];
      if (!q.prompt.trim()) return `Soal ke-${i + 1} belum memiliki pertanyaan.`;
      const filled = q.options.filter((o) => o.text.trim());
      if (filled.length < 2) return `Soal ke-${i + 1} minimal butuh 2 opsi jawaban terisi.`;
      if (!q.options.some((o) => o.isCorrect && o.text.trim()))
        return `Soal ke-${i + 1} belum menandai jawaban yang benar.`;
      const poses = q.options.filter((o) => o.text.trim()).map((o) => o.pose);
      if (new Set(poses).size !== poses.length)
        return `Soal ke-${i + 1} memakai gerakan yang sama untuk lebih dari satu opsi.`;
    }
    return null;
  };

  const submit = async (andPlay: boolean) => {
    const problem = validate();
    if (problem) return setError(problem);
    setError(null);
    setSaving(true);
    const payload: QuestionSet = {
      ...set,
      title: set.title.trim(),
      updatedAt: Date.now(),
    };
    await saveSet(payload);
    setSaving(false);
    router.push(andPlay ? `/play/${payload.id}` : "/dashboard/sets");
  };

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] font-medium text-danger">
          ⚠️ {error}
        </div>
      ) : null}

      <Card>
        <CardHeader title="Detail bank soal" subtitle="Informasi yang tampil di daftar dan layar pemilihan." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Judul" className="sm:col-span-2">
            <Input
              value={set.title}
              onChange={(e) => patchMeta({ title: e.target.value })}
              placeholder="cth. Pangbat & Akar — Kelas VII"
            />
          </Field>
          <Field label="Mata pelajaran">
            <Select value={set.subject} onChange={(e) => patchMeta({ subject: e.target.value as QuestionSet["subject"] })}>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Kelas / jenjang">
            <Select value={set.grade} onChange={(e) => patchMeta({ grade: e.target.value })}>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Deskripsi" className="sm:col-span-2">
            <Textarea
              value={set.description}
              onChange={(e) => patchMeta({ description: e.target.value })}
              placeholder="Jelaskan materi yang diuji dan cara memainkannya."
            />
          </Field>
          <Field label="Mode game">
            <Select value={set.mode} onChange={(e) => patchMeta({ mode: e.target.value as QuestionSet["mode"] })}>
              {GAME_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.desc}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Visibilitas">
            <Select
              value={set.isPublic ? "public" : "private"}
              onChange={(e) => patchMeta({ isPublic: e.target.value === "public" })}
            >
              <option value="private">Pribadi</option>
              <option value="public">Publik (bisa dipakai guru lain)</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      <AiSoalCard
        subjectLabel={SUBJECTS.find((s) => s.id === set.subject)?.label ?? set.subject}
        grade={set.grade}
        onQuestions={addAiQuestions}
      />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Daftar soal</h2>
          <p className="text-[13px] text-muted">
            {set.questions.length} soal · setiap opsi wajib punya gerakan unik.
          </p>
        </div>
        <Button onClick={addQuestion} variant="secondary" size="sm">
          + Tambah soal
        </Button>
      </div>

      {set.questions.length === 0 ? (
        <Card>
          <CardBody className="py-14 text-center">
            <p className="text-3xl">✍️</p>
            <p className="mt-3 font-display text-base font-semibold">Belum ada soal</p>
            <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
              Klik <span className="font-semibold text-fg">+ Tambah soal</span>. Isi pertanyaan dan
              minimal dua opsi jawaban, lalu petakan tiap opsi ke gerakan tubuh siswa.
            </p>
            <Button onClick={addQuestion} className="mt-5" size="sm">
              + Tambah soal pertama
            </Button>
          </CardBody>
        </Card>
      ) : (
        <ol className="space-y-4">
          {set.questions.map((q, qi) => (
            <li key={q.id}>
              <Card>
                <CardBody className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/15 font-display text-sm font-bold text-brand">
                      {qi + 1}
                    </span>
                    <div className="flex-1 space-y-3">
                      <Input
                        value={q.prompt}
                        onChange={(e) => patchQuestion(q.id, { prompt: e.target.value })}
                        placeholder="Tulis pertanyaan…"
                      />
                      <Input
                        value={q.hint ?? ""}
                        onChange={(e) => patchQuestion(q.id, { hint: e.target.value })}
                        placeholder="Petunjuk (opsional)"
                      />
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeQuestion(q.id)} title="Hapus soal">
                      🗑
                    </Button>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {q.options.map((o) => (
                      <div
                        key={o.id}
                        className={
                          "rounded-xl border p-3 transition " +
                          (o.isCorrect ? "border-accent/60 bg-accent/8" : "border-line bg-soft/40")
                        }
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => patchOption(q.id, o.id, { isCorrect: true })}
                            aria-label="Tandai sebagai jawaban benar"
                            className={
                              "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition " +
                              (o.isCorrect
                                ? "border-accent bg-accent text-black"
                                : "border-line text-transparent hover:border-brand")
                            }
                          >
                            ✓
                          </button>
                          <input
                            value={o.text}
                            onChange={(e) => patchOption(q.id, o.id, { text: e.target.value })}
                            placeholder={`Opsi jawaban…`}
                            className="h-9 w-full rounded-lg border border-line bg-elev px-3 text-sm text-fg focus:border-brand focus:outline-none"
                          />
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 text-brand">
                            <PoseIcon action={o.pose} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Select
                              value={o.pose}
                              onChange={(e) =>
                                patchOption(q.id, o.id, { pose: e.target.value as PoseAction })
                              }
                              className="h-9 text-[13px]"
                            >
                              {POSE_ACTIONS.map((p) => (
                                <option key={p} value={p}>
                                  {POSE_LABEL[p]}
                                </option>
                              ))}
                            </Select>
                            <p className="mt-1 line-clamp-1 text-[11px] text-muted">
                              {POSE_DESC[o.pose]}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-muted">
                    Pemakaian gerakan di seluruh set:{" "}
                    {[...usedPoses.entries()]
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([p, n]) => `${POSE_LABEL[p as PoseAction]} (${n})`)
                      .join(" · ") || "—"}
                  </p>
                </CardBody>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <div className="sticky bottom-4 z-10">
        <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Badge tone={set.mode === "pose-quiz-2d" ? "brand" : "accent"}>
              {MODE_LABEL[set.mode]}
            </Badge>
            <span className="text-[13px] text-muted">{set.questions.length} soal siap disimpan</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => router.push("/dashboard/sets")}>
              Batal
            </Button>
            <Button variant="secondary" disabled={saving} onClick={() => void submit(false)}>
              Simpan
            </Button>
            <Button disabled={saving} onClick={() => void submit(true)}>
              Simpan & Mainkan ▶
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
