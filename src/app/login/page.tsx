"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Field";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuthStore } from "@/store/useAuthStore";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center" />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const cloudEnabled = useAuthStore((s) => s.cloudEnabled);
  const loginGoogle = useAuthStore((s) => s.loginGoogle);
  const loginEmail = useAuthStore((s) => s.loginEmail);
  const registerEmail = useAuthStore((s) => s.registerEmail);
  const becomeGuest = useAuthStore((s) => s.becomeGuest);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.includes("@")) return setLocalError("Masukkan alamat email yang valid.");
    if (password.length < 6) return setLocalError("Kata sandi minimal 6 karakter.");
    const ok =
      mode === "login"
        ? await loginEmail(email, password)
        : await registerEmail(name.trim(), email, password);
    if (ok) router.push(next);
  };

  if (!cloudEnabled) {
    return (
      <LocalLoginView
        onGuest={() => {
          becomeGuest();
          router.push(next);
        }}
      />
    );
  }

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <Badge tone={cloudEnabled ? "ok" : "warn"}>
              {cloudEnabled ? "Firebase terhubung" : "Mode Tamu ( lokal )"}
            </Badge>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
              {mode === "login" ? "Selamat datang kembali" : "Buat akun guru"}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {mode === "login"
                ? "Masuk untuk menyinkronkan bank soal ke Firebase."
                : "Daftarkan akun untuk menyimpan soal di cloud Firestore."}
            </p>
          </div>

          <Card>
            <CardBody className="space-y-4">
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                disabled={!cloudEnabled || busy}
                onClick={async () => {
                  const ok = await loginGoogle();
                  if (ok) router.push(next);
                }}
              >
                <span className="text-base">G</span> Lanjutkan dengan Google
              </Button>

              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[11px] font-semibold tracking-widest text-muted uppercase">
                  atau email
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <form onSubmit={submit} className="space-y-3.5">
                {mode === "register" ? (
                  <Field label="Nama guru">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="cth. Ibu Sari"
                      autoComplete="name"
                    />
                  </Field>
                ) : null}

                <Field label="Email">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guru@sekolah.sch.id"
                    autoComplete="email"
                  />
                </Field>

                <Field label="Kata sandi" hint="Minimal 6 karakter.">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </Field>

                {(localError || error) && (
                  <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
                    {localError ?? error}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={!cloudEnabled || busy}>
                  {busy
                    ? "Memproses…"
                    : mode === "login"
                      ? "Masuk"
                      : "Daftar & Masuk"}
                </Button>
              </form>

              <p className="text-center text-[13px] text-muted">
                {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="font-semibold text-brand hover:underline"
                >
                  {mode === "login" ? "Daftar di sini" : "Masuk di sini"}
                </button>
              </p>
            </CardBody>
          </Card>

          <Card className="mt-4 border-dashed">
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Ingin langsung mencoba?</p>
                <p className="mt-0.5 text-[13px] text-muted">
                  Masuk sebagai Tamu — semua data tersimpan di perangkat ini.
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  becomeGuest();
                  router.push(next);
                }}
              >
                Lanjut sebagai Tamu →
              </Button>
            </CardBody>
          </Card>

          <p className="mt-6 text-center text-[13px] text-muted">
            <Link href="/" className="hover:text-fg">
              ← Kembali ke beranda
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function LocalLoginView({ onGuest }: { onGuest: () => void }) {
  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-lg">
          <div className="text-center">
            <Badge tone="warn">Firebase nonaktif</Badge>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
              Mode Uji Coba Lokal
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Aplikasi berjalan penuh tanpa Firebase. Semua bank soal, media, dan hasil permainan
              tersimpan di <span className="font-semibold text-fg">localStorage</span> peramban ini —
              tidak ada data yang dikirim ke server.
            </p>
          </div>

          <Card className="mt-8">
            <CardBody className="space-y-4">
              <Button size="xl" className="w-full" onClick={onGuest}>
                ▶ Mulai sebagai Tamu
              </Button>
              <div className="flex flex-wrap justify-center gap-2">
                <Button href="/play" variant="secondary">
                  🎮 Mode Main
                </Button>
                <Button href="/dashboard/sets" variant="ghost">
                  🗂️ Lihat Bank Soal
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card className="mt-4 border-dashed">
            <CardBody className="text-[13px] leading-relaxed text-muted">
              <p className="font-semibold text-fg">Ingin mengaktifkan akun?</p>
              <p className="mt-1.5">
                Salin{" "}
                <code className="rounded bg-soft px-1.5 py-0.5 text-fg">.env.example</code> menjadi{" "}
                <code className="rounded bg-soft px-1.5 py-0.5 text-fg">.env.local</code>, isi
                kredensial Firebase, lalu jalankan ulang{" "}
                <code className="rounded bg-soft px-1.5 py-0.5 text-fg">npm run dev</code>. Login
                Google &amp; email akan otomatis muncul di halaman ini.
              </p>
            </CardBody>
          </Card>

          <p className="mt-6 text-center text-[13px] text-muted">
            <Link href="/" className="hover:text-fg">
              ← Kembali ke beranda
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
