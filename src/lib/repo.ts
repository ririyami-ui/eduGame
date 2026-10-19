import { firestore } from "@/lib/firebase";
import { SEED_MEDIA, SEED_SETS } from "@/lib/seed";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import type { GameResult, MediaAsset, QuestionSet } from "@/types";

export interface DataRepo {
  kind: "local" | "cloud";
  listSets(): Promise<QuestionSet[]>;
  saveSet(set: QuestionSet): Promise<void>;
  removeSet(id: string): Promise<void>;
  listMedia(): Promise<MediaAsset[]>;
  saveMedia(m: MediaAsset): Promise<void>;
  removeMedia(id: string): Promise<void>;
  listResults(): Promise<GameResult[]>;
  recordResult(r: GameResult): Promise<void>;
}

const LS_KEY = "kinestetika:v1";

/** Naikkan angka ini saat isi SEED_SETS berubah, agar seed demo diperbarui otomatis. */
const SEED_VERSION = 3;

interface LocalBlob {
  sets: QuestionSet[];
  media: MediaAsset[];
  results: GameResult[];
  seedVersion?: number;
}

function readLocal(): LocalBlob {
  if (typeof window === "undefined") return { sets: [], media: [], results: [] };
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return { sets: [], media: [], results: [] };
    const parsed = JSON.parse(raw) as Partial<LocalBlob>;
    return {
      sets: parsed.sets ?? [],
      media: parsed.media ?? [],
      results: parsed.results ?? [],
    };
  } catch {
    return { sets: [], media: [], results: [] };
  }
}

function writeLocal(blob: LocalBlob) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(blob));
}

export function localRepo(): DataRepo {
  return {
    kind: "local",
    async listSets() {
      return readLocal().sets;
    },
    async saveSet(set) {
      const blob = readLocal();
      const i = blob.sets.findIndex((s) => s.id === set.id);
      if (i >= 0) blob.sets[i] = set;
      else blob.sets.unshift(set);
      writeLocal(blob);
    },
    async removeSet(id) {
      const blob = readLocal();
      blob.sets = blob.sets.filter((s) => s.id !== id);
      writeLocal(blob);
    },
    async listMedia() {
      return readLocal().media;
    },
    async saveMedia(m) {
      const blob = readLocal();
      const i = blob.media.findIndex((x) => x.id === m.id);
      if (i >= 0) blob.media[i] = m;
      else blob.media.unshift(m);
      writeLocal(blob);
    },
    async removeMedia(id) {
      const blob = readLocal();
      blob.media = blob.media.filter((m) => m.id !== id);
      writeLocal(blob);
    },
    async listResults() {
      return readLocal().results;
    },
    async recordResult(r) {
      const blob = readLocal();
      blob.results.unshift(r);
      blob.results = blob.results.slice(0, 200);
      writeLocal(blob);
    },
  };
}

export function cloudRepo(ownerId: string): DataRepo {
  const db = firestore!;
  const setsCol = collection(db, "sets");
  const mediaCol = collection(db, "media");
  const resultsCol = collection(db, "results");

  return {
    kind: "cloud",
    async listSets() {
      const snap = await getDocs(query(setsCol, where("ownerId", "==", ownerId)));
      return snap.docs.map((d) => d.data() as QuestionSet);
    },
    async saveSet(set) {
      await setDoc(doc(db, "sets", set.id), set);
    },
    async removeSet(id) {
      await deleteDoc(doc(db, "sets", id));
    },
    async listMedia() {
      const snap = await getDocs(query(mediaCol, where("ownerId", "==", ownerId)));
      return snap.docs.map((d) => d.data() as MediaAsset);
    },
    async saveMedia(m) {
      await setDoc(doc(db, "media", m.id), m);
    },
    async removeMedia(id) {
      await deleteDoc(doc(db, "media", id));
    },
    async listResults() {
      const snap = await getDocs(query(resultsCol, where("ownerId", "==", ownerId)));
      return snap.docs.map((d) => d.data() as GameResult);
    },
    async recordResult(r) {
      await setDoc(doc(db, "results", r.id), r);
    },
  };
}

/** Seed awal: dijalankan sekali untuk data lokal (mode Tamu). */
export async function ensureSeed(): Promise<void> {
  if (typeof window === "undefined") return;
  const blob = readLocal();

  // Belum ada data sama sekali → tulis seed lengkap.
  if (blob.sets.length === 0) {
    blob.sets = SEED_SETS.map((s) => ({ ...s, ownerId: "guest", ownerName: "KinestetiKa Demo" }));
    blob.media = SEED_MEDIA.map((m) => ({ ...m, ownerId: "guest" }));
    blob.seedVersion = SEED_VERSION;
    writeLocal(blob);
    return;
  }

  // Data sudah ada. Jika versi seed berubah, tambahkan set demo yang belum ada
  // (dicocokkan berdasarkan judul), tanpa menyentuh set buatan/pengeditan guru.
  if ((blob.seedVersion ?? 1) >= SEED_VERSION) return;
  const ownedByUser = new Set(
    blob.sets.filter((s) => s.ownerId !== "guest").map((s) => s.title),
  );
  const existingTitles = new Set(blob.sets.map((s) => s.title));
  const additions = SEED_SETS.filter(
    (s) => !existingTitles.has(s.title) && !ownedByUser.has(s.title),
  ).map((s) => ({ ...s, ownerId: "guest", ownerName: "KinestetiKa Demo" }));
  if (additions.length > 0) blob.sets = [...additions, ...blob.sets];
  blob.seedVersion = SEED_VERSION;
  writeLocal(blob);
}
