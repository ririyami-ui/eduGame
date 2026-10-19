"use client";

import { create } from "zustand";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FbUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, firestore, isFirebaseConfigured } from "@/lib/firebase";
import type { Role, UserProfile } from "@/types";

const GUEST_LS = "kinestetika:guest";
const THEME_LS = "kinestetika:theme";

function guestProfile(): UserProfile {
  return {
    uid: "guest",
    email: null,
    displayName: "Tamu (Local)",
    photoURL: null,
    role: "teacher",
    createdAt: Date.now(),
  };
}

async function upsertProfile(u: FbUser, role: Role = "teacher"): Promise<UserProfile> {
  if (!firestore) return { ...guestProfile(), uid: u.uid };
  const ref = doc(firestore, "users", u.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as UserProfile;
  const profile: UserProfile = {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName ?? u.email?.split("@")[0] ?? "Pengguna",
    photoURL: u.photoURL,
    role,
    createdAt: Date.now(),
  };
  await setDoc(ref, profile);
  return profile;
}

interface AuthStore {
  user: UserProfile | null;
  theme: "dark" | "light";
  busy: boolean;
  error: string | null;
  cloudEnabled: boolean;
  init(): Promise<void>;
  setTheme(theme: "dark" | "light"): void;
  loginGoogle(): Promise<boolean>;
  loginEmail(email: string, password: string): Promise<boolean>;
  registerEmail(name: string, email: string, password: string): Promise<boolean>;
  logout(): Promise<void>;
  becomeGuest(): void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  theme: "dark",
  busy: false,
  error: null,
  cloudEnabled: isFirebaseConfigured,

  async init() {
    const applyTheme = (t: "dark" | "light") => {
      const root = document.documentElement;
      root.classList.toggle("light", t === "light");
      root.classList.toggle("dark", t === "dark");
      window.localStorage.setItem(THEME_LS, t);
      set({ theme: t });
    };

    const stored = window.localStorage.getItem(THEME_LS);
    const prefersLight =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(stored === "light" || stored === "dark" ? stored : prefersLight ? "light" : "dark");

    if (!isFirebaseConfigured || !auth) {
      set({ user: guestProfile() });
      return;
    }

    await new Promise<void>((resolve) => {
      const unsub = onAuthStateChanged(auth!, async (u) => {
        try {
          if (u) set({ user: await upsertProfile(u) });
          else set({ user: guestProfile() });
        } catch (err) {
          console.error("[auth] upsert gagal", err);
          set({ user: guestProfile() });
        } finally {
          unsub();
          resolve();
        }
      });
    });
  },

  setTheme(theme) {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_LS, theme);
    set({ theme });
  },

  async loginGoogle() {
    if (!isFirebaseConfigured || !auth) {
      set({ error: "Firebase belum dikonfigurasi. Jalankan aplikasi dalam mode Tamu." });
      return false;
    }
    set({ busy: true, error: null });
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      set({ user: await upsertProfile(cred.user), busy: false });
      await useDataReload();
      return true;
    } catch (err) {
      set({ busy: false, error: humanError(err) });
      return false;
    }
  },

  async loginEmail(email, password) {
    if (!isFirebaseConfigured || !auth) {
      set({ error: "Firebase belum dikonfigurasi. Jalankan aplikasi dalam mode Tamu." });
      return false;
    }
    set({ busy: true, error: null });
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      set({ user: await upsertProfile(cred.user), busy: false });
      await useDataReload();
      return true;
    } catch (err) {
      set({ busy: false, error: humanError(err) });
      return false;
    }
  },

  async registerEmail(name, email, password) {
    if (!isFirebaseConfigured || !auth) {
      set({ error: "Firebase belum dikonfigurasi. Jalankan aplikasi dalam mode Tamu." });
      return false;
    }
    set({ busy: true, error: null });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      set({ user: await upsertProfile({ ...cred.user, displayName: name }), busy: false });
      await useDataReload();
      return true;
    } catch (err) {
      set({ busy: false, error: humanError(err) });
      return false;
    }
  },

  async logout() {
    if (auth && isFirebaseConfigured) {
      try {
        await signOut(auth);
      } catch {
        /* noop */
      }
    }
    set({ user: guestProfile() });
    await useDataReload();
  },

  becomeGuest() {
    set({ user: guestProfile() });
    void useDataReload();
  },
}));

function humanError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Email atau kata sandi salah.",
    "auth/user-not-found": "Akun tidak ditemukan.",
    "auth/wrong-password": "Kata sandi salah.",
    "auth/email-already-in-use": "Email sudah terdaftar.",
    "auth/weak-password": "Kata sandi minimal 6 karakter.",
    "auth/popup-closed-by-user": "Jendela login ditutup.",
    "auth/unauthorized-domain": "Domain ini belum diizinkan di Firebase Console.",
    "auth/operation-not-allowed": "Metode login belum diaktifkan di Firebase Console.",
  };
  if (map[code]) return map[code];
  return err instanceof Error ? err.message : "Terjadi kesalahan saat autentikasi.";
}

async function useDataReload() {
  const { useDataStore } = await import("@/store/useDataStore");
  await useDataStore.getState().loadAll();
}

export { guestProfile, GUEST_LS, THEME_LS };
