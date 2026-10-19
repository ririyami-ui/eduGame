"use client";

import { create } from "zustand";
import { cloudRepo, ensureSeed, localRepo, type DataRepo } from "@/lib/repo";
import type { GameResult, MediaAsset, QuestionSet } from "@/types";
import { useAuthStore } from "./useAuthStore";

function currentRepo(): DataRepo {
  const uid = useAuthStore.getState().user?.uid;
  if (uid && uid !== "guest") return cloudRepo(uid);
  return localRepo();
}

interface DataStore {
  sets: QuestionSet[];
  media: MediaAsset[];
  results: GameResult[];
  loading: boolean;
  error: string | null;
  source: "local" | "cloud";
  loadAll(): Promise<void>;
  saveSet(set: QuestionSet): Promise<void>;
  deleteSet(id: string): Promise<void>;
  saveMedia(m: MediaAsset): Promise<void>;
  deleteMedia(id: string): Promise<void>;
  recordResult(r: GameResult): Promise<void>;
}

export const useDataStore = create<DataStore>((set, get) => ({
  sets: [],
  media: [],
  results: [],
  loading: false,
  error: null,
  source: "local",

  async loadAll() {
    set({ loading: true, error: null });
    try {
      const repo = currentRepo();
      if (repo.kind === "local") await ensureSeed();
      const [sets, media, results] = await Promise.all([
        repo.listSets(),
        repo.listMedia(),
        repo.listResults(),
      ]);
      sets.sort((a, b) => b.updatedAt - a.updatedAt);
      set({
        sets,
        media,
        results,
        source: repo.kind,
        loading: false,
      });
    } catch (err) {
      console.error("[data] loadAll gagal", err);
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Gagal memuat data.",
      });
    }
  },

  async saveSet(item) {
    const repo = currentRepo();
    await repo.saveSet(item);
    const sets = get().sets;
    const i = sets.findIndex((s) => s.id === item.id);
    const next = i >= 0 ? sets.map((s) => (s.id === item.id ? item : s)) : [item, ...sets];
    next.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ sets: next });
  },

  async deleteSet(id) {
    const repo = currentRepo();
    await repo.removeSet(id);
    set({ sets: get().sets.filter((s) => s.id !== id) });
  },

  async saveMedia(m) {
    const repo = currentRepo();
    await repo.saveMedia(m);
    const media = get().media;
    const i = media.findIndex((x) => x.id === m.id);
    set({ media: i >= 0 ? media.map((x) => (x.id === m.id ? m : x)) : [m, ...media] });
  },

  async deleteMedia(id) {
    const repo = currentRepo();
    await repo.removeMedia(id);
    set({ media: get().media.filter((m) => m.id !== id) });
  },

  async recordResult(r) {
    const repo = currentRepo();
    await repo.recordResult(r);
    set({ results: [r, ...get().results].slice(0, 200) });
  },
}));
