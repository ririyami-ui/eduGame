"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { loadGeminiSettings } from "@/lib/aiSettings";
import { generateQuestions, type GeneratedQuestion } from "@/lib/gemini";

const COUNTS = [3, 4, 5, 6, 8, 10];

/**
 * Kartu pembuat soal dengan Gemini. Hasil generate dikirim mentah (prompt +
 * opsi + index benar) ke parent — pemetaan ke gerakan tubuh dilakukan editor.
 */
export function AiSoalCard({
  subjectLabel,
  grade,
  onQuestions,
}: {
  subjectLabel: string;
  grade: string;
  onQuestions: (questions: GeneratedQuestion[]) => void;
}) {
  const [configured, setConfigured] = useState(false);
  const [modelId, setModelId] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const s = loadGeminiSettings();
    setConfigured(s.apiKey.trim().length > 0);
    setModelId(s.model);
  }, []);

  const run = async () => {
    if (!topic.trim()) {
      setError("Tulis dulu topik materinya.");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const qs = await generateQuestions({ topic: topic.trim(), count, subjectLabel, grade });
      onQuestions(qs);
      setDone(`${qs.length} soal ditambahkan ke daftar soal di bawah — cek ulang, lalu atur gerakannya.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat soal.");
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 py-5">
          <p className="text-[13px] leading-relaxed text-muted">
            <span className="font-semibold text-fg">✨ Buat soal dengan AI</span> — isi API key Gemini sekali, lalu
            bank soal bisa dibuat dari topik materi secara otomatis.
          </p>
          <Button href="/dashboard/pengaturan" variant="secondary" size="sm">
            Atur di Pengaturan
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="✨ Buat soal dengan AI"
        subtitle={`Gemini ${modelId} · subjek: ${subjectLabel} · kelas ${grade || "Umum"}`}
        action={
          <Badge tone="accent" className="shrink-0">
            Free tier
          </Badge>
        }
      />
      <CardBody className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_7.5rem]">
          <Field label="Topik materi">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="cth. Sistem pernapasan manusia"
              disabled={busy}
            />
          </Field>
          <Field label="Jumlah soal">
            <Select value={count} onChange={(e) => setCount(Number(e.target.value))} disabled={busy}>
              {COUNTS.map((c) => (
                <option key={c} value={c}>
                  {c} soal
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {error ? (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] font-medium text-danger">
            ⚠️ {error}
          </p>
        ) : null}
        {done ? (
          <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-[13px] font-medium text-accent">
            ✅ {done}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void run()} disabled={busy}>
            {busy ? "Gemini sedang membuat soal…" : "✨ Generate soal"}
          </Button>
          <span className="text-[11px] text-muted">
            Soal hasil AI tetap bisa diedit sebelum disimpan.
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
