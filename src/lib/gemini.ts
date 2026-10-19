/**
 * Klien Gemini API (generateContent) untuk membuat soal pilihan ganda.
 * Dipanggil langsung dari browser — API key diambil dari pengaturan lokal
 * (lihat aiSettings.ts), bukan dari environment variable server.
 */

import { loadGeminiSettings } from "./aiSettings";

/** Satu soal mentah hasil AI, sebelum dipetakan ke gerakan. */
export interface GeneratedQuestion {
  prompt: string;
  options: string[];
  /** Index opsi yang benar (0-3). */
  correctIndex: number;
  hint?: string;
}

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Batas wajar agar hasil tidak meledak. */
const MAX_PROMPT_LEN = 300;
const MAX_OPTION_LEN = 80;

function readableHttpError(status: number, body: unknown): string {
  const msg =
    typeof body === "object" && body && "error" in body
      ? String((body as { error?: { message?: string } }).error?.message ?? "")
      : "";
  if (status === 400 && /api key not valid/i.test(msg))
    return "API key tidak valid. Salin ulang dari Google AI Studio.";
  if (status === 403) return "API key ditolak. Pastikan key aktif dan bisa mengakses Gemini API.";
  if (status === 404)
    return "Model tidak ditemukan. Coba pilih model lain di Pengaturan (beberapa model legacy dibatasi).";
  if (status === 429)
    return "Kuota harian free tier habis atau terlalu banyak permintaan. Coba lagi nanti atau pilih model lain.";
  return msg ? `Gemini API: ${msg}` : `Gemini API error HTTP ${status}.`;
}

async function callGenerate(
  model: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* body bukan JSON */
  }
  if (!res.ok) throw new Error(readableHttpError(res.status, json));
  return json as Record<string, unknown>;
}

/** Ambil teks pertama dari respons generateContent. */
function firstText(json: Record<string, unknown>): string {
  const candidates = json.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined;
  const text = candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("Gemini mengembalikan respons kosong. Coba lagi.");
  return text;
}

/** JSON dari model kadang dibungkus ```json … ``` — buang bungkusnya. */
function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

/** Uji koneksi ringan: kirim prompt mini, kembalikan balasan model. */
export async function testGeminiConnection(): Promise<{ model: string; reply: string }> {
  const { apiKey, model } = loadGeminiSettings();
  if (!apiKey.trim()) throw new Error("API key belum diisi. Isi dulu di Pengaturan.");
  const json = await callGenerate(model, apiKey, {
    contents: [{ role: "user", parts: [{ text: "Balas dengan satu kata saja: siap" }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 16 },
  });
  return { model, reply: firstText(json).trim() };
}

/**
 * Hasilkan soal pilihan ganda (4 opsi) dari topik tertentu.
 * @throws Error dengan pesan yang bisa langsung ditampilkan ke guru.
 */
export async function generateQuestions(opts: {
  topic: string;
  count: number;
  subjectLabel: string;
  grade: string;
}): Promise<GeneratedQuestion[]> {
  const { apiKey, model } = loadGeminiSettings();
  if (!apiKey.trim()) throw new Error("API key belum diisi. Isi dulu di Pengaturan → Gemini AI.");
  const { topic, count, subjectLabel, grade } = opts;

  const prompt = [
    "Anda adalah guru SMP Indonesia yang membuat soal pilihan ganda untuk game kuis kinestetik.",
    `Mata pelajaran: ${subjectLabel}. Kelas/jenjang: ${grade}.`,
    `Topik materi: ${topic}.`,
    `Buat tepat ${count} soal pilihan ganda yang berbeda.`,
    "Ketentuan setiap soal:",
    "- prompt: kalimat pertanyaan yang jelas dan singkat (maksimal 25 kata).",
    "- options: tepat 4 opsi jawaban, singkat (maksimal 6 kata), satu jawaban benar.",
    "- correctIndex: index 0-3 dari opsi yang benar.",
    "- hint: petunjuk singkat satu kalimat.",
    "Soal harus faktual dan benar secara keilmuan, bahasa Indonesia, gaya bahasa siswa SMP.",
    'Balas HANYA dengan JSON valid berformat: {"questions":[{"prompt":"...","options":["...","...","...","..."],"correctIndex":0,"hint":"..."}]}',
  ].join("\n");

  const json = await callGenerate(model, apiKey, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  });

  const parsed = JSON.parse(stripFences(firstText(json))) as { questions?: unknown };
  const list = Array.isArray(parsed.questions) ? parsed.questions : Array.isArray(parsed) ? parsed : null;
  if (!list) throw new Error("Format respons AI tidak sesuai. Coba generate ulang.");

  const out: GeneratedQuestion[] = [];
  for (const raw of list) {
    const q = raw as Partial<GeneratedQuestion> & { hint?: string };
    if (typeof q?.prompt !== "string" || !Array.isArray(q.options)) continue;
    const options = q.options.filter((o): o is string => typeof o === "string" && o.trim().length > 0);
    if (options.length < 4) continue;
    const idx = Number.isInteger(q.correctIndex) ? (q.correctIndex as number) : 0;
    out.push({
      prompt: q.prompt.trim().slice(0, MAX_PROMPT_LEN),
      options: options.slice(0, 4).map((o) => o.trim().slice(0, MAX_OPTION_LEN)),
      correctIndex: Math.min(3, Math.max(0, idx)),
      ...(typeof q.hint === "string" && q.hint.trim() ? { hint: q.hint.trim().slice(0, MAX_PROMPT_LEN) } : {}),
    });
    if (out.length >= count) break;
  }
  if (out.length === 0) throw new Error("AI tidak menghasilkan soal yang valid. Coba generate ulang.");
  return out;
}
