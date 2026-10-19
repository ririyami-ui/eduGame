"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { formatTanggal, uid } from "@/lib/utils";
import { useDataStore } from "@/store/useDataStore";
import type { MediaAsset } from "@/types";

const MAX_BYTES = 400 * 1024;

export default function MediaPage() {
  const media = useDataStore((s) => s.media);
  const saveMedia = useDataStore((s) => s.saveMedia);
  const deleteMedia = useDataStore((s) => s.deleteMedia);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<MediaAsset["type"]>("image");
  const [url, setUrl] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<MediaAsset | null>(null);

  const reset = () => {
    setName("");
    setType("image");
    setUrl("");
    setFileError(null);
  };

  const onFile = async (file: File | undefined) => {
    setFileError(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setFileError(
        `Ukuran file ${(file.size / 1024).toFixed(0)} KB melebihi batas 400 KB untuk penyimpanan lokal. Gunakan tautan (URL) instead.`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUrl(String(reader.result ?? ""));
      if (!name) setName(file.name.replace(/\.[^.]+$/, ""));
      setType(file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image");
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    await saveMedia({
      id: uid("media"),
      ownerId: "local",
      name: name.trim(),
      url: url.trim(),
      type,
      tags: [],
      createdAt: Date.now(),
    });
    setOpen(false);
    reset();
  };

  return (
    <AppShell
      title="Media Library"
      subtitle="Kumpulkan gambar, poster, atau backdrop untuk mempercantik layar permainan dan materi."
      action={
        <Button
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          + Tambah media
        </Button>
      }
    >
      {media.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <p className="text-3xl">🎨</p>
            <p className="mt-3 font-display text-base font-semibold">Pustaka media masih kosong</p>
            <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
              Tambahkan gambar dari tautan atau unggah file kecil (maks. 400 KB) untuk mode lokal.
            </p>
            <Button className="mt-5" size="sm" onClick={() => setOpen(true)}>
              + Tambah media pertama
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {media.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              <div className="relative aspect-[16/10] bg-soft">
                {m.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-4xl">
                    {m.type === "video" ? "🎬" : "🎵"}
                  </div>
                )}
                <div className="absolute right-2 top-2">
                  <Badge tone="muted" className="bg-black/60 text-white backdrop-blur">
                    {m.type}
                  </Badge>
                </div>
              </div>
              <CardBody>
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">{formatTanggal(m.createdAt)}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => window.open(m.url, "_blank")}>
                    Buka
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirm(m)}>
                    Hapus
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Tambah media">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nama">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Poster Sistem Pernapasan" />
          </Field>
          <Field label="Jenis">
            <Select value={type} onChange={(e) => setType(e.target.value as MediaAsset["type"])}>
              <option value="image">Gambar</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </Select>
          </Field>
          <Field label="Berkas (maks. 400 KB)" hint="Berkas dikonversi menjadi data URL dan disimpan bersama data lokal.">
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={(e) => void onFile(e.target.files?.[0])}
              className="block w-full text-[13px] text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/15 file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-brand"
            />
          </Field>
          {fileError ? (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
              {fileError}
            </p>
          ) : null}
          <Field label="Atau tempel tautan (URL)">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </Field>

          {url && type === "image" ? (
            <div className="overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Pratinjau" className="max-h-52 w-full object-cover" />
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={!name.trim() || !url.trim()}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Hapus media?">
        <p className="text-sm text-muted">
          <span className="font-semibold text-fg">{confirm?.name}</span> akan dihapus dari pustaka.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (confirm) await deleteMedia(confirm.id);
              setConfirm(null);
            }}
          >
            Ya, hapus
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
