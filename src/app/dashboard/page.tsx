"use client";

import Link from "next/link";
import { AppShell, SubjectDot } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatTanggal } from "@/lib/utils";
import { MODE_SHORT, MODE_LABEL } from "@/lib/labels";
import { useAuthStore } from "@/store/useAuthStore";
import { useDataStore } from "@/store/useDataStore";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const sets = useDataStore((s) => s.sets);
  const results = useDataStore((s) => s.results);
  const source = useDataStore((s) => s.source);

  const totalQuestions = sets.reduce((n, s) => n + s.questions.length, 0);
  const totalPlays = sets.reduce((n, s) => n + s.plays, 0) + results.length;
  const avg =
    results.length > 0
      ? Math.round(results.reduce((n, r) => n + (r.total ? (r.correct / r.total) * 100 : 0), 0) / results.length)
      : 0;

  const stats = [
    { label: "Bank soal", value: sets.length, icon: "🗂️" },
    { label: "Total soal", value: totalQuestions, icon: "❓" },
    { label: "Kali dimainkan", value: totalPlays, icon: "🎮" },
    { label: "Rata-rata skor", value: `${avg}%`, icon: "🎯" },
  ];

  return (
    <AppShell
      title={`Halo, ${(user?.displayName ?? "Tamu").split(" ")[0]} 👋`}
      subtitle={
        source === "cloud"
          ? "Data tersinkron di Firebase Firestore. Siapkan set, lalu jalankan di smartboard."
          : "Kamu berjalan dalam mode Tamu — semua bank soal tersimpan lokal di peramban ini."
      }
      action={
        <>
          <Button href="/play" variant="secondary">
            🎮 Mode Main
          </Button>
          <Button href="/dashboard/sets/new">+ Buat Soal</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/12 text-xl">
                {s.icon}
              </span>
              <div>
                <p className="font-display text-2xl font-bold">{s.value}</p>
                <p className="text-[12px] text-muted">{s.label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Bank soal terbaru"
            subtitle="Set yang baru kamu buat atau ubah."
            action={
              <Link href="/dashboard/sets" className="text-[13px] font-semibold text-brand hover:underline">
                Lihat semua →
              </Link>
            }
          />
          <CardBody className="space-y-2.5 pt-3">
            {sets.length === 0 ? (
              <EmptyState
                title="Belum ada bank soal"
                desc="Buat set pertama kamu — tentukan pertanyaan lalu petakan tiap opsi ke gerakan tubuh."
                cta="Buat soal pertama"
                href="/dashboard/sets/new"
              />
            ) : (
              sets.slice(0, 5).map((set) => (
                <Link
                  key={set.id}
                  href={`/dashboard/sets/${set.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-line bg-soft/40 px-4 py-3 transition hover:border-brand/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{set.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <SubjectDot subject={set.subject} />
                      <span className="text-[12px] text-muted">
                        Kelas {set.grade} · {set.questions.length} soal
                      </span>
                      <Badge tone={set.mode === "pose-quiz-2d" ? "brand" : "accent"}>
                        {MODE_SHORT[set.mode]}
                      </Badge>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted">
                    {formatTanggal(set.updatedAt)}
                  </span>
                </Link>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Riwayat bermain" subtitle="Hasil terakhir dari perangkat ini." />
          <CardBody className="pt-3">
            {results.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">
                Belum ada sesi bermain. Buka <span className="font-semibold text-fg">Mode Main</span> untuk
                mencoba salah satu set.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {results.slice(0, 6).map((r) => {
                  const pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
                  return (
                    <li key={r.id} className="rounded-xl border border-line bg-soft/40 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[13px] font-semibold">{r.setTitle}</p>
                        <Badge tone={pct >= 75 ? "ok" : pct >= 50 ? "warn" : "danger"}>{pct}%</Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted">
                        {MODE_LABEL[r.mode]} ·{" "}
                        {r.correct}/{r.total} benar · {formatTanggal(r.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5 border-brand/30 bg-gradient-to-br from-brand/12 to-transparent">
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Rekomendasi materi</h3>
            <p className="mt-1 max-w-xl text-[13px] text-muted">
              Sistem membaca pola jawabanmu dan menyarankan set untuk memperkuat konsep yang masih
              lemah.
            </p>
          </div>
          <Button href="/dashboard/rekomendasi" variant="accent">
            Lihat rekomendasi ✨
          </Button>
        </CardBody>
      </Card>
    </AppShell>
  );
}

export function EmptyState({
  title,
  desc,
  cta,
  href,
}: {
  title: string;
  desc: string;
  cta?: string;
  href?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line px-5 py-10 text-center">
      <p className="text-3xl">🗂️</p>
      <p className="mt-3 font-display text-base font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">{desc}</p>
      {cta && href ? (
        <Button href={href} className="mt-5" size="sm">
          {cta}
        </Button>
      ) : null}
    </div>
  );
}
