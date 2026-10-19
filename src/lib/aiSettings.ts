/**
 * Pengaturan Gemini AI untuk pembuat soal otomatis.
 * Disimpan di localStorage browser (kunci API tidak dikirim ke server kita —
 * dipakai langsung dari browser ke endpoint Gemini).
 */

export interface GeminiSettings {
  /** API key dari https://aistudio.google.com/apikey */
  apiKey: string;
  /** Id model Gemini (endpoint) */
  model: string;
}

const STORAGE_KEY = "motionedu.gemini";

/**
 * Model Gemini ber-tier gratis untuk menghasilkan teks (pilihan ganda).
 * Sumber: https://ai.google.dev/gemini-api/docs/pricing (kolom "Free of charge")
 * dan https://ai.google.dev/gemini-api/docs/models (Oktober 2026).
 */
export const GEMINI_MODELS: { id: string; label: string; note: string }[] = [
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    note: "Flash terbaru & paling pintar — rekomendasi.",
  },
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    note: "Flash generasi sebelumnya, cepat & stabil.",
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite",
    note: "Tercepat & paling hemat kuota harian.",
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite",
    note: "Ringan, cocok untuk volume soal banyak.",
  },
  {
    id: "gemini-3-flash-preview",
    label: "Gemini 3 Flash (preview)",
    note: "Preview — bisa berubah sewaktu-waktu.",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash (legacy)",
    note: "Akses terbatas untuk akun yang pernah memakainya.",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite (legacy)",
    note: "Akses terbatas untuk akun yang pernah memakainya.",
  },
];

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export function loadGeminiSettings(): GeminiSettings {
  if (typeof window === "undefined") {
    return { apiKey: "", model: DEFAULT_GEMINI_MODEL };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { apiKey: "", model: DEFAULT_GEMINI_MODEL };
    const parsed = JSON.parse(raw) as Partial<GeminiSettings>;
    const known = GEMINI_MODELS.some((m) => m.id === parsed.model);
    return {
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model: known ? (parsed.model as string) : DEFAULT_GEMINI_MODEL,
    };
  } catch {
    return { apiKey: "", model: DEFAULT_GEMINI_MODEL };
  }
}

export function saveGeminiSettings(s: GeminiSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function isGeminiConfigured(): boolean {
  return loadGeminiSettings().apiKey.trim().length > 0;
}
