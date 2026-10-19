# Product Requirements Document: KinestetiKa: MotionEdu
**Version:** 1.0.0  
**Status:** Draft  
**Category:** EdTech - Interactive Motion Learning Tools  
**App Type:** AI App

---

## 1. Product Overview
Membuat game edukasi dengan sensor motion tracking, untuk membuat soal interaktif yang dapat dimainkan di smartboard, berupa 3D dan 2D game

**Mode game yang tersedia:**
- **Pose Quiz 2D** (`pose-quiz-2d`): empat kartu jawaban, masing-masing dipetakan ke satu gerakan tubuh. Siswa menahan pose ±0.9 detik untuk mengunci jawaban.
- **Motion Catch 3D** (`motion-catch-3d`): karakter 3D digerakkan dengan condong badan. Bola jawaban berjatuhan — tangkap bola yang benar.
- **Ambil & Tempatkan 3D** (`answer-slot-3d`): soal tampil, bola jawaban berjatuhan untuk **diambil** (berdiri di bawahnya), lalu dibawa ke **Tempat Jawaban** dan dilepaskan dengan mengangkat kedua tangan.
- **Tangkap & Makan** (`catch-eat-2d`): kamera langsung tanpa avatar. Jawaban melayang dengan warna diseragamkan; siswa **memegang** bola dengan telapak tangan lalu **membawanya ke mulut** untuk memakannya. Salah pegang? Kibaskan tangan untuk melepas. Benar 👑 mahkota, salah 💣 bom (dengan efek suara).
- **Panahan** (`archery-2d`): kamera langsung tanpa avatar. Telapak tangan menjadi penanda bidik; **tahan** bidikan di dalam target sampai busur penuh, panah dilepas otomatis dari bahu menuju target yang dikunci.

## 2. Product Goals & Success Metrics
Tujuan utama dari KinestetiKa: MotionEdu adalah Meningkatkan retensi pembelajaran melalui pembelajaran kinestetik dengan mengubah respons fisik menjadi jawaban interaktif pada konten pendidikan berbasis 3D dan 2D.
- **KPI 1:** User engagement rate > 20%.
- **KPI 2:** System uptime 99.9%.

## 3. User Persona & Journey
**Target Pengguna:** Sekolah Menengah Pertama (SMP) dan pusat pelatihan inklusif yang membutuhkan metode pembelajaran aktif bagi siswa usia 12-15 tahun dengan gaya belajar kinestetik.
- **Persona:** Pengguna yang membutuhkan kemudahan dalam konteks EdTech - Interactive Motion Learning Tools.
- **Journey:** Discovery → Registration → Core Action (Social Login) → Goal Achievement.

## 4. Problem Statement
Banyak pengguna menghadapi kesulitan dalam mengelola kebutuhan mereka terkait EdTech - Interactive Motion Learning Tools. KinestetiKa: MotionEdu hadir untuk memecahkan masalah tersebut dengan fitur-fitur inovatif yang fokus pada efisiensi dan skalabilitas.

## 5. Feature List & Prioritization
Berikut adalah fitur-fitur utama yang akan diimplementasikan:
- **Social Login (P0)**: Fitur inti untuk mengelola social login.
- **Create (P0)**: Fitur inti untuk mengelola create.
- **Read (P0)**: Fitur inti untuk mengelola read.
- **Update (P0)**: Fitur inti untuk mengelola update.
- **Delete (P0)**: Fitur inti untuk mengelola delete.
- **Media Library (P0)**: Fitur inti untuk mengelola media library.
- **Recommendation System (P0)**: Fitur inti untuk mengelola recommendation system.

## 6. Detailed User Stories
- Sebagai **Sekolah Menengah Pertama (SMP) dan pusat pelatihan inklusif yang membutuhkan metode pembelajaran aktif bagi siswa usia 12-15 tahun dengan gaya belajar kinestetik.**, saya ingin menggunakan fitur **Social Login** agar bisa mengelola social login dengan efisien dan tanpa hambatan.
- Sebagai **Sekolah Menengah Pertama (SMP) dan pusat pelatihan inklusif yang membutuhkan metode pembelajaran aktif bagi siswa usia 12-15 tahun dengan gaya belajar kinestetik.**, saya ingin menggunakan fitur **Create** agar bisa mengelola create dengan efisien dan tanpa hambatan.
- Sebagai **Sekolah Menengah Pertama (SMP) dan pusat pelatihan inklusif yang membutuhkan metode pembelajaran aktif bagi siswa usia 12-15 tahun dengan gaya belajar kinestetik.**, saya ingin menggunakan fitur **Read** agar bisa mengelola read dengan efisien dan tanpa hambatan.
- Sebagai **Sekolah Menengah Pertama (SMP) dan pusat pelatihan inklusif yang membutuhkan metode pembelajaran aktif bagi siswa usia 12-15 tahun dengan gaya belajar kinestetik.**, saya ingin menggunakan fitur **Update** agar bisa mengelola update dengan efisien dan tanpa hambatan.
- Sebagai **Sekolah Menengah Pertama (SMP) dan pusat pelatihan inklusif yang membutuhkan metode pembelajaran aktif bagi siswa usia 12-15 tahun dengan gaya belajar kinestetik.**, saya ingin menggunakan fitur **Delete** agar bisa mengelola delete dengan efisien dan tanpa hambatan.
- Sebagai **Sekolah Menengah Pertama (SMP) dan pusat pelatihan inklusif yang membutuhkan metode pembelajaran aktif bagi siswa usia 12-15 tahun dengan gaya belajar kinestetik.**, saya ingin menggunakan fitur **Media Library** agar bisa mengelola media library dengan efisien dan tanpa hambatan.
- Sebagai **Sekolah Menengah Pertama (SMP) dan pusat pelatihan inklusif yang membutuhkan metode pembelajaran aktif bagi siswa usia 12-15 tahun dengan gaya belajar kinestetik.**, saya ingin menggunakan fitur **Recommendation System** agar bisa mengelola recommendation system dengan efisien dan tanpa hambatan.
- Sebagai **Admin**, saya ingin memantau penggunaan aplikasi untuk memastikan performa sistem.

## 7. Functional Requirements
- Sistem harus mendukung autentikasi via Firebase.
- Antarmuka harus responsif dan dibangun menggunakan Next.js.
- Data harus disimpan secara aman di Firestore.

## 8. Non-Functional Requirements
- **Performance:** First Contentful Paint < 1.5s.
- **Accessibility:** Mendukung standar WCAG 2.1 AA.
- **Security:** Enkripsi data at-rest dan in-transit.

## 9. UI/UX & Design System
- **Styling:** Menggunakan **Tailwind CSS** dengan pendekatan Utility-first.
- **Theme:** Mendukung Dark/Light mode dengan aksen warna brand.
- **Components:** Menggunakan library komponen reusable untuk konsistensi.

## 10. Technical Architecture
### Frontend Architecture
- **Framework:** Next.js (App Router)
- **State Management:** Zustand dengan persistensi.
- **Data Fetching:** TanStack Query untuk caching dan sinkronisasi server state.

### Backend Service
- **Platform:** Firebase
- **Database:** Firestore
- **Hosting:** Vercel

## 11. Database Design & Types
**Engine:** Firestore
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
}
```

## 12. Security Rules
```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /projects/{projectId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```



## 12. SEO & Metadata
- **Static Metadata:** Title dan Description untuk setiap halaman utama.
- **Dynamic SEO:** Open Graph tags untuk sharing di media sosial.
- **Sitemap:** Otomatis dihasilkan untuk indexing mesin pencari.

## 13. App Folder Structure
```plaintext
src/
├── app/
│   ├── (auth)/         # Auth pages (login, register)
│   ├── dashboard/      # Main dashboard
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Landing page
├── components/
│   ├── ui/             # Reusable UI components
│   ├── layout/         # Navbar, Footer
│   └── forms/          # Feature-specific forms
├── lib/
│   └── db.ts           # DB config (e.g., firebase/prisma)
├── store/              # State management (Zustand)
└── types/              # TypeScript definitions
```

## 14. Work Planning (Roadmap)
```plaintext
Phase 1: Setup & Core
- Initialize project: Next.js + Firebase
- Setup database schema & Auth boilerplate
- Build basic UI layout & navigation

Phase 2: Feature Development
- Implement core features:
  * Social Login
  * Create
  * Read
  * Update
  * Delete
  * Media Library
  * Recommendation System
- Develop CRUD interfaces & state management
- Integrate API/Data flow

Phase 3: Polish & Testing
- Refine UI/UX (Tailwind styling)
- Perform unit testing & data validation
- Error handling & loading states

Phase 4: Deployment
- Prepare for Vercel
- Final environment config & production build
```

## 15. AI Agent Instructions
- Ikuti struktur folder di atas.
- Gunakan Tailwind CSS untuk semua styling.
- Pastikan semua fungsi memiliki tipe data TypeScript yang jelas.

---
*Dokumen ini dihasilkan secara otomatis oleh PRD Builder AI.*
  