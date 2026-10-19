"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PoseIcon } from "@/components/game/PoseIcon";
import { POSE_LABEL } from "@/lib/labels";
import type { PoseAction } from "@/types";

const STEPS = [
  {
    n: "01",
    t: "Kamera menyala",
    d: "Smartboard mengaktifkan webcam. MediaPipe Pose mendeteksi 33 titik tubuh secara real-time, tanpa sensor tambahan.",
  },
  {
    n: "02",
    t: "Kalibrasi berdiri",
    d: "Siswa berdiri tegak selama 1 detik. Sistem mempelajari garis bahu, pangkal paha, dan posisi kaki sebagai patokan.",
  },
  {
    n: "03",
    t: "Gerakan = jawaban",
    d: "Setiap opsi jawaban dipetakan ke satu gerakan. Tahan gerakan selama ±1 detik untuk mengunci pilihan.",
  },
  {
    n: "04",
    t: "Skor & rekomendasi",
    d: "Hasil tersimpan otomatis. Sistem merekomendasikan materi lanjutan berdasarkan pola kesalahan siswa.",
  },
];

const FEATURES = [
  { i: "🧠", t: "Retensi lewat gerak", d: "Belajar kinestetik terbukti meningkatkan ingatan jangka panjang hingga 2× dibanding duduk diam." },
  { i: "⚡", t: "Nol perangkat khusus", d: "Cukup webcam + browser. Tidak perlu Kinect, sensor, atau tracker mahal." },
  { i: "♿", t: "Inklusif", d: "Ambang gerakan dapat disetel agar siswa dengan keterbatasan motorik tetap bisa bermain." },
  { i: "📚", t: "Bank soal guru", d: "Guru membuat soal sendiri, menentukan gerakan tiap opsi, lalu membagikannya ke satu kelas." },
  { i: "📈", t: "Rekomendasi adaptif", d: "Sistem menandai konsep yang sering salah dan menyarankan set remedial otomatis." },
  { i: "🖥️", t: "Mode layar penuh", d: "Dirancang untuk smartboard: tombol besar, tipografi tebal, kontras tinggi." },
];

const DEMO_POSES: PoseAction[] = ["raise_both_hands", "raise_left_hand", "squat", "t_pose"];

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <main>
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
            <div>
              <Badge tone="accent">Untuk SMP · Kelas VII–IX</Badge>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Jawab soal dengan{" "}
                <span className="bg-gradient-to-r from-brand via-brand-strong to-accent bg-clip-text text-transparent">
                  seluruh tubuhmu
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
                KinestetiKa MotionEdu mengubah gerakan fisik siswa menjadi jawaban interaktif
                di atas smartboard. Quiz 2D dan game 3D yang berjalan sepenuhnya di browser —
                cukup webcam, tanpa perangkat keras khusus.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/dashboard" size="lg">
                  Mulai Buat Soal →
                </Button>
                <Button href="/play" size="lg" variant="secondary">
                  🎮 Coba Mode Main
                </Button>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6">
                {[
                  ["33", "titik tubuh dilacak"],
                  ["5", "mode game interaktif"],
                  ["0", "perangkat khusus"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dt className="font-display text-3xl font-bold text-accent">{v}</dt>
                    <dd className="mt-1 text-[12px] leading-snug text-muted">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-brand/25 via-transparent to-accent/20 blur-2xl" />
              <Card className="relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-danger/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-ok/80" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-widest text-muted uppercase">
                    Pose Quiz · Matematika VII
                  </span>
                </div>

                <CardBody className="space-y-4">
                  <p className="font-display text-lg font-semibold">
                    Berapa nilai dari <span className="text-accent">7²</span>?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {["49", "14", "21", "56"].map((v, i) => (
                      <div
                        key={v}
                        className={
                          "flex items-center gap-3 rounded-xl border p-3 " +
                          (i === 0
                            ? "border-accent/60 bg-accent/10"
                            : "border-line bg-soft/60")
                        }
                      >
                        <div
                          className={
                            "h-12 w-12 shrink-0 " +
                            (i === 0 ? "text-accent" : "text-muted")
                          }
                        >
                          <PoseIcon action={DEMO_POSES[i]} />
                        </div>
                        <span className="font-display text-xl font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-line bg-soft/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand/50 to-accent/40" />
                      <div>
                        <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">
                          Gerakan terdeteksi
                        </p>
                        <p className="text-sm font-bold text-accent">Angkat Kedua Tangan</p>
                      </div>
                    </div>
                    <span className="font-display text-2xl font-bold">100</span>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>

        <section id="cara-kerja" className="border-y border-line/70 bg-elev/40 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <Badge tone="brand">Cara Kerja</Badge>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Empat langkah dari berdiri menjadi jawaban
              </h2>
            </div>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <li key={s.n}>
                  <Card className="h-full">
                    <CardBody className="h-full">
                      <span className="font-display text-3xl font-bold text-brand/40">{s.n}</span>
                      <h3 className="mt-3 font-display text-base font-semibold">{s.t}</h3>
                      <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.d}</p>
                    </CardBody>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="mode" className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <Badge tone="brand">Lima Mode Game</Badge>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Satu bank soal, lima pengalaman bermain
              </h2>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              <Card className="overflow-hidden">
                <div className="border-b border-line bg-gradient-to-br from-brand/20 to-transparent px-6 py-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-xl font-bold">Pose Quiz 2D</h3>
                    <Badge tone="brand">Klasik</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    Empat kartu jawaban masing-masing terikat pada satu gerakan. Siswa memilih
                    dengan mengangkat tangan, jongkok, miring badan, atau merentangkan lengan.
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-3 p-6">
                  {DEMO_POSES.map((p) => (
                    <div key={p} className="text-center">
                      <div className="mx-auto h-16 w-16 text-brand">
                        <PoseIcon action={p} />
                      </div>
                      <p className="mt-2 text-[11px] font-semibold leading-tight text-muted">
                        {POSE_LABEL[p]}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b border-line bg-gradient-to-br from-accent/20 to-transparent px-6 py-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-xl font-bold">Motion Catch 3D</h3>
                    <Badge tone="accent">Aksi</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    Siswa mengendalikan karakter 3D di ruang bermain. Geser badan ke kiri/kanan
                    untuk berpindah lajur, angkat kedua tangan untuk melompat menangkap bola
                    jawaban yang berjatuhan.
                  </p>
                </div>
                <div className="p-6">
                  <div className="relative h-52 overflow-hidden rounded-xl border border-line bg-gradient-to-b from-[#101a36] to-[#050a18]">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
                    <span className="absolute left-6 top-5 text-[11px] font-semibold tracking-widest text-accent uppercase">
                      6 × 7 = ?
                    </span>
                    {[
                      { x: "18%", y: "26%", c: "bg-brand", l: "36" },
                      { x: "42%", y: "48%", c: "bg-accent", l: "42" },
                      { x: "66%", y: "32%", c: "bg-brand", l: "48" },
                      { x: "84%", y: "58%", c: "bg-danger", l: "56" },
                    ].map((o) => (
                      <span
                        key={o.l}
                        className={`absolute grid h-11 w-11 -translate-x-1/2 place-items-center rounded-full ${o.c} font-display text-sm font-bold text-black shadow-lg`}
                        style={{ left: o.x, top: o.y }}
                      >
                        {o.l}
                      </span>
                    ))}
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-3xl">
                      🧍
                    </span>
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-muted">
                    <span className="rounded-full border border-line px-2.5 py-1">← Geser badan</span>
                    <span className="rounded-full border border-line px-2.5 py-1">↑ Angkat tangan</span>
                    <span className="rounded-full border border-line px-2.5 py-1">Tangkap jawaban benar</span>
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b border-line bg-gradient-to-br from-emerald-500/20 to-transparent px-6 py-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-xl font-bold">Ambil &amp; Tempatkan 3D</h3>
                    <Badge tone="ok">3D+</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    Jawaban berjatuhan untuk <span className="font-semibold text-fg">diambil</span>.
                    Setelah bola ditangkap, siswa membawanya ke Tempat Jawaban lalu mengangkat
                    kedua tangan untuk <span className="font-semibold text-fg">menempatkannya</span>.
                  </p>
                </div>
                <div className="p-6">
                  <div className="relative h-52 overflow-hidden rounded-xl border border-line bg-gradient-to-b from-[#0f2432] to-[#050a18]">
                    <span className="absolute left-1/2 top-5 -translate-x-1/2 text-[11px] font-semibold tracking-widest text-emerald-300 uppercase">
                      Luas persegi sisi 8 cm?
                    </span>
                    {[
                      { x: "30%", y: "30%", c: "bg-sky-400", l: "32" },
                      { x: "58%", y: "48%", c: "bg-sky-400", l: "16" },
                      { x: "82%", y: "22%", c: "bg-sky-400", l: "24" },
                    ].map((o) => (
                      <span
                        key={o.l}
                        className={`absolute grid h-11 w-11 -translate-x-1/2 place-items-center rounded-full ${o.c} font-display text-sm font-bold text-black shadow-lg`}
                        style={{ left: o.x, top: o.y }}
                      >
                        {o.l}
                      </span>
                    ))}
                    <span className="absolute bottom-20 left-8 grid h-12 w-12 place-items-center rounded-full border-2 border-emerald-400/70 bg-emerald-500/20 font-display text-[11px] font-bold text-emerald-200">
                      64
                    </span>
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-3xl">🧍</span>
                    <span className="absolute bottom-4 left-4 text-[10px] font-bold tracking-wider text-emerald-300 uppercase">
                      Tempat jawaban
                    </span>
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-muted">
                    <span className="rounded-full border border-line px-2.5 py-1">Berdiri di bawah bola</span>
                    <span className="rounded-full border border-line px-2.5 py-1">Bawa ke pad</span>
                    <span className="rounded-full border border-line px-2.5 py-1">🙌 Letakkan</span>
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b border-line bg-gradient-to-br from-sky-500/20 to-transparent px-6 py-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-xl font-bold">Tangkap &amp; Makan</h3>
                    <Badge tone="accent">Kamera langsung</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    Jawaban melayang di layar dengan warna yang diseragamkan. Arahkan tangan
                    untuk <span className="font-semibold text-fg">memegang</span> bola, lalu
                    bawa ke mulut untuk <span className="font-semibold text-fg">memakannya</span>.
                  </p>
                </div>
                <div className="p-6">
                  <div className="relative h-52 overflow-hidden rounded-xl border border-line bg-gradient-to-b from-[#151d33] to-[#050a18]">
                    <span className="absolute left-1/2 top-4 -translate-x-1/2 text-[11px] font-semibold tracking-widest text-sky-300 uppercase">
                      Buah kaya vitamin C?
                    </span>
                    {[
                      { x: "26%", y: "38%", l: "Jeruk" },
                      { x: "55%", y: "55%", l: "Pisang" },
                      { x: "82%", y: "34%", l: "Semangka" },
                    ].map((o) => (
                      <span
                        key={o.l}
                        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/45 bg-white/15 px-4 py-2.5 font-display text-sm font-bold text-white backdrop-blur"
                        style={{ left: o.x, top: o.y }}
                      >
                        {o.l}
                      </span>
                    ))}
                    <span className="absolute left-[26%] top-[64%] -translate-x-1/2 text-3xl">
                      🖐️
                    </span>
                    <span className="absolute left-[46%] top-[76%] -translate-x-1/2 -translate-y-1/2 text-4xl">
                      👄
                    </span>
                    <span className="absolute left-[46%] top-[93%] -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold tracking-wider text-sky-300 uppercase">
                      mulut
                    </span>
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-muted">
                    <span className="rounded-full border border-line px-2.5 py-1">🖐️ Pegang bola</span>
                    <span className="rounded-full border border-line px-2.5 py-1">👄 Bawa ke mulut</span>
                    <span className="rounded-full border border-line px-2.5 py-1">👑 / 💣 benar / salah</span>
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b border-line bg-gradient-to-br from-amber-500/20 to-transparent px-6 py-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-xl font-bold">Panahan</h3>
                    <Badge tone="ok">Terbaru</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    Bidik target jawaban dengan telapak tangan, lalu{" "}
                    <span className="font-semibold text-fg">tahan</span> sampai busur terisi
                    penuh — panah dilepas otomatis menuju target yang dikunci.
                  </p>
                </div>
                <div className="p-6">
                  <div className="relative h-52 overflow-hidden rounded-xl border border-line bg-gradient-to-b from-[#2b2312] to-[#0f0a02]">
                    <span className="absolute left-1/2 top-4 -translate-x-1/2 text-[11px] font-semibold tracking-widest text-amber-300 uppercase">
                      Tulang terpanjang manusia?
                    </span>
                    {[
                      { x: "28%", y: "34%", l: "Tulang paha", lock: true },
                      { x: "57%", y: "52%", l: "Tulang kering", lock: false },
                      { x: "84%", y: "32%", l: "Tulang betis", lock: false },
                    ].map((o) => (
                      <span
                        key={o.l}
                        className={
                          "absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl px-4 py-2.5 font-display text-sm font-bold text-white backdrop-blur " +
                          (o.lock
                            ? "border-2 border-lime-300 bg-white/25 shadow-[0_0_24px_rgba(163,230,53,0.5)]"
                            : "border border-white/45 bg-white/15")
                        }
                        style={{ left: o.x, top: o.y }}
                      >
                        {o.l}
                      </span>
                    ))}
                    <span className="absolute left-[28%] top-[34%] h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-lime-300 bg-lime-300/20" />
                    <span className="absolute bottom-4 left-6 text-3xl">🧑‍🌾</span>
                    <span
                      className="absolute bottom-10 left-14 h-1.5 w-32 origin-left rotate-[-34deg] rounded-full bg-gradient-to-r from-white/60 to-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.7)]"
                    />
                    <span className="absolute right-5 top-14 text-2xl">🎯</span>
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-muted">
                    <span className="rounded-full border border-line px-2.5 py-1">🖐️ Bidik target</span>
                    <span className="rounded-full border border-line px-2.5 py-1">🎯 Tahan busur</span>
                    <span className="rounded-full border border-line px-2.5 py-1">➤ Panah dilepas</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section id="fitur" className="border-y border-line/70 bg-elev/40 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <Badge tone="brand">Fitur</Badge>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Dibangun untuk kelas nyata
              </h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <Card key={f.t} className="h-full">
                  <CardBody className="h-full">
                    <span className="text-2xl">{f.i}</span>
                    <h3 className="mt-3 font-display text-base font-semibold">{f.t}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">{f.d}</p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
              Siap menghidupkan kelas kamu?
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">
              Buat bank soal pertama dalam kurang dari dua menit, lalu langsung mainkan di
              smartboard. Berjalan penuh sebagai Tamu — akun Firebase opsional untuk sinkronisasi
              antar-perangkat.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button href="/dashboard" size="xl">
                Buka Dashboard
              </Button>
              <Button href="/login" size="xl" variant="outline">
                Masuk dengan Akun
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-[13px] text-muted sm:px-6">
          <p>© {new Date().getFullYear()} KinestetiKa MotionEdu — Motion Learning untuk SMP.</p>
          <div className="flex gap-5">
            <Link href="/dashboard" className="transition hover:text-fg">
              Dashboard
            </Link>
            <Link href="/play" className="transition hover:text-fg">
              Mode Main
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
