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

## Pembuat soal dengan AI (Gemini)

Guru bisa membuat soal pilihan ganda otomatis dari sebuah topik materi, langsung di editor bank soal:

1. Buka **Dashboard → Pengaturan**, tempel **Gemini API key** (gratis dari [Google AI Studio](https://aistudio.google.com/apikey)), pilih model, lalu klik **Uji koneksi**.
2. Di **Bank Soal → Buat baru / Edit**, isi topik di kartu **✨ Buat soal dengan AI** dan tekan **Generate soal**.
3. Soal hasil AI (pertanyaan + 4 opsi + jawaban benar) langsung masuk ke daftar soal dengan gerakan tubuh yang otomatis dipetakan — tetap bisa diedit sebelum disimpan.

API key **hanya disimpan di `localStorage` browser** dan permintaan dikirim langsung dari browser ke endpoint Gemini (tidak melewati server aplikasi).

Model free tier yang disediakan di pemilih: `gemini-3.8-flash` (default), `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`, serta `gemini-2.5-flash` / `gemini-2.5-flash-lite` (akses legacy). Kuota harian tier gratis terbatas — jika habis, ganti model atau coba lagi esok hari.

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
├── app/                 # halaman: landing, dashboard (set/media/rekomendasi/pengaturan), play
│   └── play/[id]/       # 3d, 3d-slot, eat, archery
├── components/          # ui, layout, game (CameraStage, PoseIcon), forms (SetEditor, AiSoalCard)
├── hooks/               # usePoseDetector (loop deteksi + overlay)
├── lib/                 # poses (deteksi/kalibrasi), seed, repo, labels, sfx, firebase, gemini, aiSettings
├── store/               # zustand: auth & data
└── types/               # GameMode, QuestionSet, Result, dll.
```

Dokumen produk lengkap: [`KinestetiKa_ MotionEdu.md`](./KinestetiKa_ MotionEdu.md).
