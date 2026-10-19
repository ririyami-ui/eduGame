"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODELS,
  loadGeminiSettings,
  saveGeminiSettings,
  type GeminiSettings,
} from "@/lib/aiSettings";
import { testGeminiConnection } from "@/lib/gemini";

type Notice = { tone: "ok" | "danger" | "muted"; text: string } | null;

export default function PengaturanPage() {
  const [settings, setSettings] = useState<GeminiSettings>({ apiKey: "", model: DEFAULT_GEMINI_MODEL });
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    setSettings(loadGeminiSettings());
  }, []);

  const patch = (p: Partial<GeminiSettings>) => setSettings((s) => ({ ...s, ...p }));

  const save = () => {
    saveGeminiSettings({ apiKey: settings.apiKey.trim(), model: settings.model });
    setNotice({ tone: "ok", text: "Pengaturan tersimpan di browser ini." });
  };

  const test = async () => {
    saveGeminiSettings({ apiKey: settings.apiKey.trim(), model: settings.model });
    setTesting(true);
    setNotice(null);
    try {
      const { model, reply } = await testGeminiConnection();
      setNotice({ tone: "ok", text: `Terhubung ke ${model} — balasan: “${reply}”. Siap membuat soal!` });
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : "Gagal menghubungi Gemini." });
    } finally {
      setTesting(false);
    }
  };

  const selected = GEMINI_MODELS.find((m) => m.id === settings.model);

  return (
    <AppShell
      title="Pengaturan"
      subtitle="Konfigurasi fitur AI untuk pembuat soal otomatis. Disimpan lokal di browser ini."
    >
      <div className="max-w-2xl space-y-5">
        {notice ? (
          <div
            className={
              "rounded-xl border px-4 py-3 text-[13px] font-medium " +
              (notice.tone === "ok"
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-danger/30 bg-danger/10 text-danger")
            }
          >
            {notice.tone === "ok" ? "✅ " : "⚠️ "}
            {notice.text}
          </div>
        ) : null}

        <Card>
          <CardHeader
            title="Gemini AI — pembuat soal"
            subtitle="Guru bisa membuat soal pilihan ganda otomatis dari topik materi, langsung di editor bank soal."
          />
          <CardBody className="space-y-4">
            <Field
              label="Gemini API key"
              hint="Dapatkan gratis di aistudio.google.com/apikey. Key hanya disimpan di localStorage browser ini dan dikirim langsung ke Google — tidak lewat server aplikasi."
            >
              <div className="flex gap-2">
                <Input
                  type={showKey ? "text" : "password"}
                  value={settings.apiKey}
                  onChange={(e) => patch({ apiKey: e.target.value })}
                  placeholder="AIza…"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button variant="secondary" size="md" onClick={() => setShowKey((v) => !v)} className="shrink-0">
                  {showKey ? "Sembunyikan" : "Tampilkan"}
                </Button>
              </div>
            </Field>

            <Field
              label="Model Gemini (free tier)"
              hint="Semua model di daftar ini gratis di tier dasar dengan batas kuota harian."
            >
              <Select value={settings.model} onChange={(e) => patch({ model: e.target.value })}>
                {GEMINI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.id}
                  </option>
                ))}
              </Select>
            </Field>

            {selected ? (
              <p className="rounded-xl border border-line bg-soft/40 px-4 py-3 text-[13px] text-muted">
                <span className="font-semibold text-fg">{selected.label}</span> — {selected.note}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button onClick={save}>Simpan</Button>
              <Button variant="secondary" disabled={testing || !settings.apiKey.trim()} onClick={() => void test()}>
                {testing ? "Menguji…" : "Uji koneksi"}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Cara pakai"
            subtitle="Setelah pengaturan tersimpan, fitur AI aktif di editor bank soal."
          />
          <CardBody className="space-y-3 text-[13px] leading-relaxed text-muted">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                Buat API key di{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand underline-offset-2 hover:underline"
                >
                  Google AI Studio
                </a>{" "}
                (butuh akun Google).
              </li>
              <li>Tempelkan key di atas, pilih model, lalu klik “Uji koneksi”.</li>
              <li>
                Buka <span className="font-semibold text-fg">Bank Soal → Buat baru / Edit</span>, isi topik di kartu{" "}
                <span className="font-semibold text-fg">✨ Buat soal dengan AI</span>, lalu generate.
              </li>
            </ol>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge tone="brand">Gratis</Badge>
              <span>
                Tier gratis punya batas permintaan harian. Jika kuota habis, pilih model lain di daftar — atau coba
                lagi esok hari.
              </span>
            </div>
            <Link href="/dashboard/sets" className="inline-block font-semibold text-brand hover:underline">
              → Buka Bank Soal
            </Link>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
