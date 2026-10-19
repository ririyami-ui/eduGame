"use client";

import { useMemo } from "react";
import { AppShell, SubjectDot } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SUBJECT_LABEL, MODE_SHORT, modeHref } from "@/lib/labels";
import { SUBJECTS } from "@/types";
import { useDataStore } from "@/store/useDataStore";
import type { QuestionSet, Subject } from "@/types";

interface Rec {
  set: QuestionSet;
  reason: string;
  priority: "high" | "medium" | "low";
  score: number;
}

export default function RekomendasiPage() {
  const sets = useDataStore((s) => s.sets);
  const results = useDataStore((s) => s.results);

  const { stats, recs } = useMemo(() => {
    const bySubject = new Map<Subject, { correct: number; total: number; played: number }>();
    for (const r of results) {
      const set = sets.find((s) => s.id === r.setId);
      const subject = (set?.subject ?? "other") as Subject;
      const cur = bySubject.get(subject) ?? { correct: 0, total: 0, played: 0 };
      cur.correct += r.correct;
      cur.total += r.total;
      cur.played += 1;
      bySubject.set(subject, cur);
    }

    const stats = SUBJECTS.filter((s) => bySubject.has(s.id)).map((s) => {
      const v = bySubject.get(s.id)!;
      return {
        subject: s.id as Subject,
        label: s.label,
        accuracy: v.total ? Math.round((v.correct / v.total) * 100) : 0,
        sessions: v.played,
      };
    });

    const playedIds = new Set(results.map((r) => r.setId));
    const weakSubjects = stats
      .filter((s) => s.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)
      .map((s) => s.subject);

    const recs: Rec[] = sets.map((set) => {
      let reason = "Belum pernah dimainkan — mulai dari sini.";
      let priority: Rec["priority"] = "medium";
      let score = 50;

      if (playedIds.has(set.id)) {
        const mine = results.filter((r) => r.setId === set.id);
        const acc = mine.length
          ? Math.round(
              (mine.reduce((n, r) => n + (r.total ? r.correct / r.total : 0), 0) / mine.length) * 100,
            )
          : 0;
        if (acc < 60) {
          reason = `Skormu baru ${acc}% — materi ini perlu diperkuat.`;
          priority = "high";
          score = 100 - acc;
        } else if (acc < 80) {
          reason = `Skormu ${acc}%. Ulangi sekali lagi untuk mengunci konsep.`;
          priority = "medium";
          score = 60;
        } else {
          reason = `Sudah dikuasai (${acc}%). Coba set lain untuk variasi.`;
          priority = "low";
          score = 20;
        }
      } else if (weakSubjects.includes(set.subject)) {
        reason = `Memperkuat ${SUBJECT_LABEL[set.subject]} yang masih di bawah 70%.`;
        priority = "high";
        score = 90;
      } else if (set.mode === "motion-catch-3d") {
        reason = "Mode 3D untuk variasi gerak dan pemanasan kelas.";
        priority = "low";
        score = 40;
      } else if (set.mode === "answer-slot-3d") {
        reason = "Mode Ambil & Tempatkan — melatih ketepatan gerak dan pengambilan keputusan.";
        priority = "low";
        score = 42;
      }

      return { set, reason, priority, score };
    });

    recs.sort((a, b) => b.score - a.score);
    return { stats, recs };
  }, [sets, results]);

  return (
    <AppShell
      title="Rekomendasi Materi"
      subtitle="Sistem membaca riwayat jawaban lalu menyusun urutan set yang paling perlu dimainkan berikutnya."
    >
      {stats.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.subject}>
              <CardBody>
                <div className="flex items-baseline justify-between">
                  <p className="text-[13px] font-semibold">{s.label}</p>
                  <Badge
                    tone={s.accuracy >= 80 ? "ok" : s.accuracy >= 60 ? "warn" : "danger"}
                  >
                    {s.accuracy}%
                  </Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-soft">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-all"
                    style={{ width: `${s.accuracy}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted">{s.sessions} sesi tercatat</p>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mb-5 border-dashed">
          <CardBody className="py-10 text-center">
            <p className="text-3xl">✨</p>
            <p className="mt-3 font-display text-base font-semibold">Belum ada data bermain</p>
            <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
              Setelah kamu menyelesaikan minimal satu sesi, sistem akan mulai menganalisis mapel yang
              lemah dan menyusun rekomendasi personal.
            </p>
          </CardBody>
        </Card>
      )}

      <Card className="mt-5">
        <CardHeader
          title="Urutan yang disarankan"
          subtitle="Diurutkan berdasarkan kebutuhan remedial, variasi mode, lalu materi baru."
        />
        <CardBody className="space-y-2.5 pt-3">
          {recs.map((r, i) => (
            <div
              key={r.set.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-soft/40 px-4 py-3.5"
            >
              <span
                className={
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display text-sm font-bold " +
                  (r.priority === "high"
                    ? "bg-danger/15 text-danger"
                    : r.priority === "medium"
                      ? "bg-brand/15 text-brand"
                      : "bg-soft text-muted")
                }
              >
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{r.set.title}</p>
                  <SubjectDot subject={r.set.subject} />
                  <Badge tone={r.set.mode === "pose-quiz-2d" ? "brand" : "accent"}>
                    {MODE_SHORT[r.set.mode]}
                  </Badge>
                </div>
                <p className="mt-1 text-[13px] text-muted">{r.reason}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  href={modeHref(r.set.id, r.set.mode)}
                >
                  ▶ Mainkan
                </Button>
                <Button size="sm" variant="ghost" href={`/dashboard/sets/${r.set.id}`}>
                  Detail
                </Button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </AppShell>
  );
}
