import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kinestetika.app"),
  title: {
    default: "KinestetiKa — MotionEdu",
    template: "%s · KinestetiKa MotionEdu",
  },
  description:
    "Game edukasi berbasis motion tracking untuk kelas SMP. Ubah gerakan tubuh siswa menjadi jawaban interaktif di smartboard — mode 2D dan 3D.",
  keywords: [
    "motion tracking",
    "edtech",
    "SMP",
    "kinestetik",
    "smartboard",
    "MediaPipe",
    "game edukasi",
  ],
  openGraph: {
    type: "website",
    title: "KinestetiKa — MotionEdu",
    description:
      "Belajar sambil bergerak. Quiz kinestetik 2D & 3D untuk siswa SMP.",
    siteName: "KinestetiKa MotionEdu",
  },
  twitter: {
    card: "summary_large_image",
    title: "KinestetiKa — MotionEdu",
    description: "Belajar sambil bergerak. Quiz kinestetik 2D & 3D untuk SMP.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05070f" },
    { media: "(prefers-color-scheme: light)", color: "#f3f6fc" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body className={`${body.variable} ${display.variable} font-body antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
