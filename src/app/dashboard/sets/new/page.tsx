"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SetEditor } from "@/components/forms/SetEditor";
import { emptySet } from "@/lib/factory";
import { useAuthStore } from "@/store/useAuthStore";
import { useDataStore } from "@/store/useDataStore";

export default function NewSetPage() {
  const user = useAuthStore((s) => s.user);
  const memo = useMemo(
    () => emptySet(user?.uid ?? "guest", user?.displayName ?? "Tamu"),
    [user?.uid, user?.displayName],
  );

  return (
    <AppShell
      title="Buat bank soal baru"
      subtitle="Isi pertanyaan, lalu petakan tiap opsi jawaban ke gerakan tubuh yang akan dilakukan siswa."
    >
      <SetEditor initial={memo} isNew />
    </AppShell>
  );
}
