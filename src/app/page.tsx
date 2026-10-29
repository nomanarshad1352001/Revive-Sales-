"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppStore, useHydrated } from "@/lib/store";

export default function RootPage() {
  const router = useRouter();
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;
    const user = useAppStore.getState().currentUser();
    router.replace(user && user.active ? "/dashboard" : "/login");
  }, [hydrated, router]);

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-[var(--brand)] border-t-transparent" />
        <p className="text-sm tracking-wide text-[var(--ink-2)]">Loading Revive Sales Command…</p>
      </div>
    </div>
  );
}
