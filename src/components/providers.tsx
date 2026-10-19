"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useDataStore } from "@/store/useDataStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  const initAuth = useAuthStore((s) => s.init);
  const loadAll = useDataStore((s) => s.loadAll);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initAuth();
      await loadAll();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [initAuth, loadAll]);

  return <QueryClientProvider client={client}>{ready ? children : <BootScreen />}</QueryClientProvider>;
}

function BootScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-2xl bg-brand/25 blur-xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-elev text-2xl">
          🧍
        </div>
      </div>
      <p className="font-display text-sm tracking-[0.25em] text-muted uppercase">
        Menyiapkan MotionEdu…
      </p>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-soft">
        <div className="h-full w-1/3 animate-[slide_1.1s_ease-in-out_infinite] rounded-full bg-brand" />
      </div>
      <style>{`@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}
