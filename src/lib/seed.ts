import type { MediaAsset, PoseAction, Question, QuestionSet, Subject } from "@/types";

const P = {
  both: "raise_both_hands",
  left: "raise_left_hand",
  right: "raise_right_hand",
  squat: "squat",
  jump: "jump",
  leanL: "lean_left",
  leanR: "lean_right",
  tpose: "t_pose",
  kickL: "kick_left",
  kickR: "kick_right",
} as const;

let seq = 0;
const sid = (p: string) => `${p}-${(++seq).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function makeQuestion(
  prompt: string,
  correct: string,
  wrong: [string, string, string],
  poses: [PoseAction, PoseAction, PoseAction, PoseAction],
  hint?: string,
): Question {
  const texts = [correct, ...wrong];
  return {
    id: sid("q"),
    prompt,
    hint,
    options: texts.map((text, i) => ({
      id: sid("o"),
      text,
      pose: poses[i],
      isCorrect: i === 0,
    })),
  };
}

function makeSet(input: {
  title: string;
  subject: Subject;
  grade: string;
  description: string;
  mode: QuestionSet["mode"];
  questions: Question[];
}): QuestionSet {
  const now = Date.now();
  return {
    id: sid("set"),
    ownerId: "guest",
    ownerName: "KinestetiKa Demo",
    title: input.title,
    subject: input.subject,
    grade: input.grade,
    description: input.description,
    mode: input.mode,
    questions: input.questions,
    isPublic: true,
    plays: Math.floor(Math.random() * 40) + 6,
    avgScore: 60 + Math.floor(Math.random() * 30),
    createdAt: now,
    updatedAt: now,
  };
}

export const SEED_SETS: QuestionSet[] = [
  makeSet({
    title: "Pangkat, Akar & Bilangan Bulat",
    subject: "math",
    grade: "VII",
    description:
      "Kuasai operasi pangkat dan akar lewat gerakan. Angkat tangan kiri/kanan untuk memilih jawaban, jongkok untuk opsi keempat.",
    mode: "pose-quiz-2d",
    questions: [
      makeQuestion("Berapa nilai dari 7² ?", "49", ["14", "21", "56"], [P.both, P.left, P.right, P.squat]),
      makeQuestion("Berapa hasil dari √144 ?", "12", ["14", "10", "16"], [P.left, P.both, P.squat, P.right]),
      makeQuestion("Nilai dari 3³ adalah…", "27", ["9", "81", "18"], [P.right, P.squat, P.both, P.left]),
      makeQuestion("Hasil dari 5² + 2² adalah…", "29", ["25", "21", "49"], [P.both, P.left, P.right, P.squat]),
      makeQuestion("Bilangan terbesar: −3, −8, 0, −1", "0", ["−1", "−3", "−8"], [P.squat, P.right, P.left, P.both]),
      makeQuestion("Hasil dari (−4) × (−6) adalah…", "24", ["−24", "10", "−10"], [P.left, P.both, P.right, P.squat]),
    ],
  }),
  makeSet({
    title: "Sistem Pernapasan & Peredaran Darah",
    subject: "science",
    grade: "VIII",
    description:
      "Kuis IPA tentang organ peredaran darah dan pernapasan manusia. Tahan gerakan 1 detik untuk mengunci jawaban.",
    mode: "pose-quiz-2d",
    questions: [
      makeQuestion(
        "Organ tempat pertukaran oksigen dan karbon dioksida adalah…",
        "Alveolus",
        ["Trakea", "Bronkus", "Diafragma"],
        [P.both, P.left, P.right, P.squat],
      ),
      makeQuestion("Gas yang dihirup manusia saat bernapas adalah…", "Oksigen", ["Karbon dioksida", "Nitrogen", "Hidrogen"], [P.left, P.both, P.right, P.squat]),
      makeQuestion("Protein pengangkut oksigen dalam darah disebut…", "Hemoglobin", ["Plasma", "Trombosit", "Leukosit"], [P.right, P.left, P.both, P.squat]),
      makeQuestion("Katup yang memisahkan atrium dan ventrikel disebut…", "Katup atrioventrikuler", ["Katup semilunar", "Septum", "Aorta"], [P.both, P.squat, P.left, P.right]),
      makeQuestion("Unit terkecil dari sistem saraf adalah…", "Neuron", ["Sel darah merah", "Alveolus", "Nefron"], [P.squat, P.right, P.left, P.both]),
    ],
  }),
  makeSet({
    title: "English Vocabulary — Daily Life",
    subject: "english",
    grade: "VIII",
    description:
      "Perbaya kosakata bahasa Inggris sehari-hari. Cocok untuk ice-breaking di awal pelajaran.",
    mode: "pose-quiz-2d",
    questions: [
      makeQuestion('Apa arti kata "teacher"?', "Guru", ["Murid", "Sekolah", "Buku"], [P.both, P.left, P.right, P.squat]),
      makeQuestion('"I usually ___ to school at 6 a.m."', "go", ["goes", "going", "gone"], [P.left, P.right, P.both, P.squat]),
      makeQuestion("Pilih kata benda (noun) yang benar:", "Library", ["Quickly", "Beautiful", "Run"], [P.right, P.squat, P.left, P.both]),
      makeQuestion('Lawan kata dari "expensive" adalah…', "Cheap", ["Costly", "Pricey", "Rich"], [P.both, P.left, P.squat, P.right]),
    ],
  }),
  makeSet({
    title: "Demokrasi & Kewarganegaraan",
    subject: "pancasila",
    grade: "IX",
    description:
      "Mode 2D. Uji pemahaman siswa tentang demokrasi, Pancasila, dan hak kewarganegaraan.",
    mode: "pose-quiz-2d",
    questions: [
      makeQuestion("Dasar negara Indonesia adalah…", "Pancasila", ["UUD 1945", "Bhinneka Tunggal Ika", "NKRI"], [P.both, P.left, P.right, P.squat]),
      makeQuestion("Sila ke-4 Pancasila berkaitan dengan…", "Musyawarah untuk mufakat", ["Keadilan sosial", "Ketuhanan Yang Maha Esa", "Persatuan Indonesia"], [P.left, P.both, P.squat, P.right]),
      makeQuestion("Salah satu hak warga negara dalam UUD 1945 adalah…", "Hak untuk mendapatkan pendidikan", ["Hak memilih agama negara", "Hak menolak membayar pajak", "Hak menghapus hukum"], [P.right, P.left, P.both, P.squat]),
      makeQuestion("Lembaga legislatif tertinggi menurut UUD 1945 adalah…", "MPR", ["DPR", "MA", "MK"], [P.squat, P.both, P.left, P.right]),
    ],
  }),
  makeSet({
    title: "Operasi Hitung Cepat — Mode 3D",
    subject: "math",
    grade: "VII",
    description:
      "Game 3D MotionCatch: bola jawaban berjatuhan. Geser badan ke kiri/kanan untuk menggerakkan karakter, angkat kedua tangan untuk melompat.",
    mode: "motion-catch-3d",
    questions: [
      makeQuestion("6 × 7 = ?", "42", ["36", "48", "56"], [P.both, P.left, P.right, P.squat]),
      makeQuestion("9 × 8 = ?", "72", ["63", "81", "74"], [P.left, P.both, P.right, P.squat]),
      makeQuestion("144 ÷ 12 = ?", "12", ["11", "14", "16"], [P.right, P.left, P.both, P.squat]),
      makeQuestion("15 + 27 = ?", "42", ["32", "52", "41"], [P.both, P.right, P.left, P.squat]),
      makeQuestion("100 − 37 = ?", "63", ["67", "73", "53"], [P.squat, P.left, P.both, P.right]),
      makeQuestion("5² − 3² = ?", "16", ["10", "34", "4"], [P.left, P.right, P.squat, P.both]),
    ],
  }),
  makeSet({
    title: "Ambil & Tempatkan — Bangun Datar",
    subject: "math",
    grade: "VII",
    description:
      "Game 3D Ambil & Tempatkan: bola jawaban berjatuhan. Tangkap bola yang kamu pilih, bawa ke Tempat Jawaban di sebelah kiri, lalu angkat kedua tangan untuk meletakkannya.",
    mode: "answer-slot-3d",
    questions: [
      makeQuestion("Luas persegi dengan sisi 8 cm adalah…", "64 cm²", ["32 cm²", "16 cm²", "24 cm²"], [P.both, P.left, P.right, P.squat]),
      makeQuestion("Keliling persegi panjang 10 × 4 cm adalah…", "28 cm", ["40 cm", "14 cm", "20 cm"], [P.left, P.both, P.right, P.squat]),
      makeQuestion("Banyak sisi pada segienam adalah…", "6", ["5", "8", "4"], [P.right, P.squat, P.left, P.both]),
      makeQuestion("Luas segitiga dengan alas 12 dan tinggi 5 adalah…", "30 cm²", ["60 cm²", "17 cm²", "34 cm²"], [P.both, P.right, P.left, P.squat]),
      makeQuestion("Jumlah sudut dalam segitiga adalah…", "180°", ["360°", "90°", "270°"], [P.squat, P.left, P.both, P.right]),
    ],
  }),
  makeSet({
    title: "Tangkap & Makan — Buah & Sayur",
    subject: "science",
    grade: "VII",
    description:
      "Game kamera langsung Tangkap & Makan: jawaban melayang-layang di layar. Arahkan tangan ke bola jawaban untuk memegangnya, lalu bawa ke mulut untuk memakannya. Benar dapat 👑 mahkota, salah kena 💣 bom.",
    mode: "catch-eat-2d",
    questions: [
      makeQuestion(
        "Buah yang kaya vitamin C adalah…",
        "Jeruk",
        ["Pisang", "Apel", "Mangga"],
        [P.both, P.left, P.right, P.squat],
        "Ingat warna oranye dan rasanya segar.",
      ),
      makeQuestion("Sayur berwarna oranye yang kaya beta-karoten adalah…", "Wortel", ["Bayam", "Kangkung", "Sawi"], [P.left, P.both, P.right, P.squat], "Sering dibuat jus untuk kesehatan mata."),
      makeQuestion("Buah yang mengandung banyak air dan sering dimakan saat cuaca panas adalah…", "Semangka", ["Durian", "Kelengkeng", "Salak"], [P.right, P.left, P.both, P.squat], "Dagingnya merah muda, kulitnya hijau bergaris."),
      makeQuestion("Sayur yang daunnya dipakai untuk sayur bening adalah…", "Bayam", ["Wortel", "Kentang", "Bawang"], [P.both, P.squat, P.left, P.right], "Popeye suka sayur ini supaya kuat."),
      makeQuestion("Buah yang disebut 'raja dari semua buah' adalah…", "Durian", ["Manggis", "Rambutan", "Pepaya"], [P.squat, P.right, P.left, P.both], "Kulitnya berduri dan aromanya kuat."),
      makeQuestion("Bagian tumbuhan yang biasa dimakan dari kentang adalah…", "Umbi", ["Buah", "Daun", "Bunga"], [P.left, P.right, P.squat, P.both], "Tumbuh di dalam tanah."),
      makeQuestion("Buah yang baik untuk pencernaan karena mengandung banyak serat adalah…", "Pepaya", ["Anggur", "Leci", "Jeruk"], [P.right, P.both, P.left, P.squat], "Buah lunak berwarna oranye kemerahan."),
      makeQuestion("Sayur yang biasa dipakai untuk sup adalah…", "Wortel", ["Kangkung", "Bayam", "Selada"], [P.both, P.left, P.right, P.squat], "Berbentuk batang runcing berwarna oranye."),
    ],
  }),
  makeSet({
    title: "Panahan — Sistem Gerak Manusia",
    subject: "science",
    grade: "VIII",
    description:
      "Game kamera langsung Panahan: jawaban melayang di layar. Bidik jawaban dengan tangan, tahan sampai busur penuh lalu panah dilepas otomatis. Benar dapat 👑 mahkota, salah kena 💣 bom.",
    mode: "archery-2d",
    questions: [
      makeQuestion("Tulang terpanjang pada tubuh manusia adalah…", "Tulang paha", ["Tulang kering", "Tulang lengan atas", "Tulang betis"], [P.both, P.left, P.right, P.squat], "Terhubung ke sendi panggul."),
      makeQuestion("Otot yang berfungsi menekuk lengan disebut…", "Bisep", ["Trisep", "Kuadrisep", "Deltoid"], [P.left, P.both, P.right, P.squat], "Otot di bagian depan lengan atas."),
      makeQuestion("Sendi yang menghubungkan tulang panggul dengan tulang paha adalah…", "Sendi panggul", ["Sendi lutut", "Sendi siku", "Sendi bahu"], [P.right, P.left, P.both, P.squat], "Sendi putar yang menahan berat badan."),
      makeQuestion("Gerak melompat dilakukan dengan bantuan otot…", "Kuadrisep", ["Bisep", "Deltoid", "Trisep"], [P.both, P.squat, P.left, P.right], "Otot di bagian depan paha."),
      makeQuestion("Rangkaian tulang yang melindungi jantung dan paru-paru adalah…", "Tulang rusuk", ["Tulang selangka", "Tulang panggul", "Tulang hasta"], [P.squat, P.right, P.left, P.both], "Berbentuk melengkung membentuk rongga dada."),
      makeQuestion("Sendi pada siku yang hanya bisa melipat disebut…", "Sendi engsel", ["Sendi putar", "Sendi pelana", "Sendi mati"], [P.left, P.right, P.both, P.squat], "Mirip engsel pintu."),
      makeQuestion("Cairan pelumas yang ada di dalam sendi disebut…", "Cairan sinovial", ["Cairan limfe", "Plasma darah", "Getah bening"], [P.right, P.both, P.left, P.squat], "Membuat gerak sendi tidak seret."),
      makeQuestion("Bagian ujung paling bawah dari tulang belakang adalah…", "Tulang ekor", ["Tulang sakrum", "Tulang leher", "Tulang dada"], [P.both, P.left, P.squat, P.right], "Sisa ekor pada manusia."),
    ],
  }),
];

const svgThumb = (title: string, c1: string, c2: string) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='280'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs>
<rect width='480' height='280' fill='url(#g)'/>
<circle cx='380' cy='70' r='90' fill='rgba(255,255,255,0.12)'/>
<text x='32' y='160' font-family='monospace' font-size='30' fill='white' font-weight='700'>${title}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const SEED_MEDIA: MediaAsset[] = [
  {
    id: sid("media"),
    ownerId: "guest",
    name: "Poster Gerak Dasar",
    url: svgThumb("GERAK DASAR", "#6366f1", "#0ea5e9"),
    type: "image",
    tags: ["poster", "pose", "warmup"],
    createdAt: Date.now(),
  },
  {
    id: sid("media"),
    ownerId: "guest",
    name: "Backdrop Smartboard",
    url: svgThumb("SMARTBOARD", "#8b5cf6", "#ec4899"),
    type: "image",
    tags: ["backdrop", "kelas"],
    createdAt: Date.now(),
  },
  {
    id: sid("media"),
    ownerId: "guest",
    name: "Ilustrasi IPA",
    url: svgThumb("IPA SMP", "#059669", "#84cc16"),
    type: "image",
    tags: ["ipa", "sains"],
    createdAt: Date.now(),
  },
];
