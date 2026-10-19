# eduGame

Aplikasi Game untuk pembelajaran — **KinestetiKa: MotionEdu**. Game edukasi kinestetik untuk smartboard SMP: MediaPipe Pose melacak 33 titik tubuh lewat webcam biasa, lalu gerakan siswa menjadi jawaban soal. Berjalan sepenuhnya di browser, tanpa perangkat keras khusus.

## Mode game

| Mode | Id | Cara main |
|---|---|---|
| Pose Quiz 2D | `pose-quiz-2d` | Tahan pose (angkat tangan, jongkok, miring) untuk mengunci jawaban |
| Motion Catch 3D | `motion-catch-3d` | Condongkan badan menggerakkan karakter 3D, tangkap bola jawaban |
| Ambil & Tempatkan 3D | `answer-slot-3d` | Ambil bola jawaban, bawa ke Tempat Jawaban, angkat tangan untuk meletakkan |
| Tangkap & Makan | `catch-eat-2d` | Pegang bola jawaban dengan telapak, bawa ke mulut untuk memakannya |
| Panahan | `archery-2d` | Bidik target dengan telapak, tahan sampai busur penuh — panah dilepas otomatis |

Semua mode memakai bank soal yang sama (dibuat guru di dashboard) dan punya alur kalibrasi berdiri sebelum mulai.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind 4**
- **MediaPipe Tasks Vision** (Pose Landmarker) — deteksi pose real-time di browser
- **Zustand** + **React Query** — state & data
- **Firebase** (Auth + Firestore) — opsional; tanpa konfigurasi app tetap jalan penuh dalam mode Tamu / Local-First

## Menjalankan

```bash
npm install
cp .env.example .env.local   # opsional: isi config Firebase untuk mode akun/cloud
npm run dev                  # buka http://localhost:3000
```

Skrip lain: `npm run build`, `npm run start`, `npm run typecheck`.

> Mode game butuh webcam + internet (model MediaPipe diunduh dari CDN).

## Struktur

```
src/
├── app/                 # halaman: landing, dashboard (set/media/rekomendasi), play
│   └── play/[id]/       # 3d, 3d-slot, eat, archery
├── components/          # ui, layout, game (CameraStage, PoseIcon), forms
├── hooks/               # usePoseDetector (loop deteksi + overlay)
├── lib/                 # poses (deteksi/kalibrasi), seed, repo, labels, sfx, firebase
├── store/               # zustand: auth & data
└── types/               # GameMode, QuestionSet, Result, dll.
```

Dokumen produk lengkap: [`KinestetiKa_ MotionEdu.md`](./KinestetiKa_ MotionEdu.md).
