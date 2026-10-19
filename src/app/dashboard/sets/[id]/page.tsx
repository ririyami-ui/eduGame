"use client";

import { use } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SetEditor } from "@/components/forms/SetEditor";
import { Card, CardBody } from "@/components/ui/Card";
import { useDataStore } from "@/store/useDataStore";

export default function EditSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sets = useDataStore((s) => s.sets);
  const loading = useDataStore((s) => s.loading);
  const set = sets.find((s) => s.id === id);

  if (loading && !set) {
    return (
      <AppShell title="Memuat…">
        <Card>
          <CardBody className="py-20 text-center text-sm text-muted">Mengambil bank soal…</CardBody>
        </Card>
      </AppShell>
    );
  }

  if (!set) {
    return (
      <AppShell title="Set tidak ditemukan">
        <Card>
          <CardBody className="py-20 text-center">
            <p className="text-3xl">🤔</p>
            <p className="mt-3 font-display text-base font-semibold">
              Bank soal ini tidak ada di perangkat ini
            </p>
            <p className="mt-1.5 text-[13px] text-muted">
              Jika kamu masuk sebagai Tamu, data tersimpan lokal. Coba masuk dengan akun yang sama.
            </p>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit bank soal" subtitle={set.title}>
      <SetEditor initial={set} isNew={false} />
    </AppShell>
  );
}
