"use client";

import { useMemo, useState } from "react";
import { AppShell, SubjectDot } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { SUBJECTS, GAME_MODES } from "@/types";
import { MODE_SHORT, modeHref } from "@/lib/labels";
import { formatTanggal } from "@/lib/utils";
import { useDataStore } from "@/store/useDataStore";
import type { QuestionSet } from "@/types";

export default function SetsPage() {
  const sets = useDataStore((s) => s.sets);
  const deleteSet = useDataStore((s) => s.deleteSet);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("all");
  const [mode, setMode] = useState("all");
  const [confirm, setConfirm] = useState<QuestionSet | null>(null);

  const filtered = useMemo(() => {
    return sets.filter((s) => {
      const okQ =
        !q.trim() ||
        s.title.toLowerCase().includes(q.toLowerCase()) ||
        s.description.toLowerCase().includes(q.toLowerCase());
      const okS = subject === "all" || s.subject === subject;
      const okM = mode === "all" || s.mode === mode;
      return okQ && okS && okM;
    });
  }, [sets, q, subject, mode]);

  return (
    <AppShell
      title="Bank Soal"
      subtitle="Kelola kumpulan soal. Setiap opsi jawaban dipetakan ke satu gerakan tubuh."
      action={<Button href="/dashboard/sets/new">+ Soal Baru</Button>}
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari judul atau deskripsi…"
          className="max-w-xs"
        />
        <Select value={subject} onChange={(e) => setSubject(e.target.value)} className="max-w-[13rem]">
          <option value="all">Semua mapel</option>
          {SUBJECTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select value={mode} onChange={(e) => setMode(e.target.value)} className="max-w-[13rem]">
          <option value="all">Semua mode</option>
          {GAME_MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <p className="text-3xl">🔍</p>
            <p className="mt-3 font-display text-base font-semibold">Tidak ada set yang cocok</p>
            <p className="mt-1.5 text-[13px] text-muted">
              Ubah kata kunci atau filter, atau buat bank soal baru.
            </p>
            <Button href="/dashboard/sets/new" className="mt-5" size="sm">
              + Buat soal baru
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((set) => {
            const pct = set.avgScore;
            return (
              <Card key={set.id} className="flex flex-col">
                <CardBody className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-semibold leading-snug">
                        {set.title}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <SubjectDot subject={set.subject} />
                        <span className="text-[12px] text-muted">Kelas {set.grade}</span>
                      </div>
                    </div>
                    <Badge tone={set.mode === "pose-quiz-2d" ? "brand" : "accent"}>
                      {MODE_SHORT[set.mode]}
                    </Badge>
                  </div>

                  <p className="mt-3 line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted">
                    {set.description || "Tanpa deskripsi."}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                    <div>
                      <p className="font-display text-base font-bold">{set.questions.length}</p>
                      <p className="text-[11px] text-muted">soal</p>
                    </div>
                    <div>
                      <p className="font-display text-base font-bold">{set.plays}</p>
                      <p className="text-[11px] text-muted">dimainkan</p>
                    </div>
                    <div>
                      <p className="font-display text-base font-bold text-accent">{pct}%</p>
                      <p className="text-[11px] text-muted">rata-rata</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button href={modeHref(set.id, set.mode)} size="sm" className="flex-1">
                      ▶ Main
                    </Button>
                    <Button href={`/dashboard/sets/${set.id}`} size="sm" variant="secondary">
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirm(set)}>
                      🗑
                    </Button>
                  </div>

                  <p className="mt-3 text-[11px] text-muted">Diubah {formatTanggal(set.updatedAt)}</p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Hapus bank soal?">
        <p className="text-sm leading-relaxed text-muted">
          Set <span className="font-semibold text-fg">“{confirm?.title}”</span> beserta{" "}
          {confirm?.questions.length} soal di dalamnya akan dihapus permanen.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (confirm) await deleteSet(confirm.id);
              setConfirm(null);
            }}
          >
            Ya, hapus
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
