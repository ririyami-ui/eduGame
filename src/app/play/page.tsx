"use client";

import { AppShell, SubjectDot } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { useDataStore } from "@/store/useDataStore";

export default function PlayPickerPage() {
  const sets = useDataStore((s) => s.sets);

  const twoD = sets.filter((s) => s.mode === "pose-quiz-2d");
  const catchD = sets.filter((s) => s.mode === "motion-catch-3d");
  const slotD = sets.filter((s) => s.mode === "answer-slot-3d");
  const eatD = sets.filter((s) => s.mode === "catch-eat-2d");
  const archeryD = sets.filter((s) => s.mode === "archery-2d");

  return (
    <AppShell
      title="Mode Main"
      subtitle="Pilih bank soal lalu jalankan di smartboard. Pastikan kamera menghadap seluruh badan siswa dengan pencahayaan yang cukup."
    >
      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold">Pose Quiz 2D</h2>
          <Badge tone="brand">Jawab dengan gerakan</Badge>
        </div>
        {twoD.length === 0 ? (
          <Empty msg="Belum ada set 2D. Buat bank soal dengan mode Pose Quiz 2D." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {twoD.map((set) => (
              <SetCard key={set.id} set={set} href={`/play/${set.id}`} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold">Motion Catch 3D</h2>
          <Badge tone="accent">Kendalikan karakter 3D</Badge>
        </div>
        {catchD.length === 0 ? (
          <Empty msg="Belum ada set Motion Catch 3D. Ubah mode set untuk memakainya." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catchD.map((set) => (
              <SetCard key={set.id} set={set} href={`/play/${set.id}/3d`} accent />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold">Ambil &amp; Tempatkan 3D</h2>
          <Badge tone="ok">Tangkap, bawa &amp; letakkan jawaban</Badge>
        </div>
        {slotD.length === 0 ? (
          <Empty msg="Belum ada set Ambil & Tempatkan 3D. Buat bank soal dengan mode ini di editor." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {slotD.map((set) => (
              <SetCard key={set.id} set={set} href={`/play/${set.id}/3d-slot`} accent />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold">Tangkap &amp; Makan</h2>
          <Badge tone="accent">Kamera langsung · tangkap jawaban melayang</Badge>
        </div>
        {eatD.length === 0 ? (
          <Empty msg="Belum ada set Tangkap & Makan. Buat bank soal dengan mode ini di editor." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eatD.map((set) => (
              <SetCard key={set.id} set={set} href={`/play/${set.id}/eat`} accent />
            ))}
          </div>
        )}
      </section>
      <section className="mt-10">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold">Panahan</h2>
          <Badge tone="ok">Kamera langsung · bidik &amp; lepas panah</Badge>
        </div>
        {archeryD.length === 0 ? (
          <Empty msg="Belum ada set Panahan. Buat bank soal dengan mode ini di editor." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archeryD.map((set) => (
              <SetCard key={set.id} set={set} href={`/play/${set.id}/archery`} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function SetCard({
  set,
  href,
  accent,
}: {
  set: import("@/types").QuestionSet;
  href: string;
  accent?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardBody className="flex flex-1 flex-col">
        <h3 className="font-display text-base font-semibold leading-snug">{set.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <SubjectDot subject={set.subject} />
          <span className="text-[12px] text-muted">Kelas {set.grade}</span>
        </div>
        <p className="mt-3 line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted">
          {set.description || "Tanpa deskripsi."}
        </p>
        <p className="mt-3 text-[12px] text-muted">{set.questions.length} soal · ±{set.questions.length * 20} detik</p>
        <Button href={href} className="mt-4" variant={accent ? "accent" : "primary"}>
          ▶ Mulai Bermain
        </Button>
      </CardBody>
    </Card>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <Card className="border-dashed">
      <CardBody className="py-12 text-center text-[13px] text-muted">{msg}</CardBody>
    </Card>
  );
}
