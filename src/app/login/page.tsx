"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, KeyRound, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shell";
import TerritoryMap from "@/components/TerritoryMap";
import { useAppStore, useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const ROLE_CARDS: {
  role: Role;
  name: string;
  email: string;
  blurb: string;
  accent: string;
}[] = [
  {
    role: "RSM",
    name: "Elena Vasquez",
    email: "elena.vasquez@reviveregen.com",
    blurb: "Regional Sales Manager — full TX & OK oversight, team performance, forecasts.",
    accent: "#0C6B4F",
  },
  {
    role: "ASM",
    name: "Marcus Webb",
    email: "marcus.webb@reviveregen.com",
    blurb: "Area Sales Manager — North Texas accounts, routes, demos & pipeline.",
    accent: "#27698F",
  },
  {
    role: "TM",
    name: "Dalton Reed",
    email: "dalton.reed@reviveregen.com",
    blurb: "Territory Manager — Oklahoma field prospecting, visits & follow-ups.",
    accent: "#6B4FA1",
  },
  {
    role: "ADMIN",
    name: "Riley Chen",
    email: "admin@reviveregen.com",
    blurb: "Administrator — users, roles, product content & system configuration.",
    accent: "#B97A1A",
  },
];

const FEATURES = [
  "Territory map of 54 tracked practices across TX & OK",
  "Pipeline intelligence for capital-equipment deals",
  "Follow-up radar — never let a hot account go cold",
];

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const login = useAppStore((s) => s.login);
  const authed = useAppStore((s) => s.currentUserId !== null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [picked, setPicked] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && authed) router.replace("/dashboard");
  }, [hydrated, authed, router]);

  function pick(card: (typeof ROLE_CARDS)[number]) {
    setPicked(card.role);
    setEmail(card.email);
    setPassword("demo1234");
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(email, password);
    if (ok) {
      router.push("/dashboard");
    } else {
      setError("Those credentials don't match an active user. Pick a role card to autofill a demo login.");
    }
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      {/* ── Brand panel ── */}
      <div className="relative hidden w-[46%] overflow-hidden bg-[var(--brand-deep)] lg:block">
        <div className="contour-bg absolute inset-0" />
        <div className="topo-lines" />
        <div className="relative flex h-full flex-col p-10 xl:p-14">
          <Logo light />

          <div className="mt-16 max-w-md">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[#9fd4bd]"
            >
              AI Sales Command Center
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7 }}
              className="font-display mt-4 text-[clamp(2.2rem,3.4vw,3.4rem)] font-medium leading-[1.05] text-white"
            >
              Command every territory,
              <br />
              <span className="text-[#cfe8db]">from Amarillo to Tulsa.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
              className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-white/70"
            >
              One workspace for prospect radar, field routing, pipeline and follow-up across Texas &amp; Oklahoma — built for aesthetic capital-equipment sales.
            </motion.p>
          </div>

          <div className="relative mt-auto pt-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/15 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-white/60">
                  Live territory overview
                </span>
                <span className="inline-flex items-center gap-1.5 text-[0.66rem] font-bold text-[#9fd4bd]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9fd4bd]" /> 54 accounts
                </span>
              </div>
              <MapPreview />
            </motion.div>

            <ul className="mt-6 space-y-2.5">
              {FEATURES.map((f, i) => (
                <motion.li
                  key={f}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="flex items-center gap-2.5 text-[0.82rem] font-semibold text-white/80"
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white/12">
                    <Check size={12} strokeWidth={3} className="text-[#9fd4bd]" />
                  </span>
                  {f}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="relative flex flex-1 items-center justify-center px-5 py-10">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[var(--brand)] via-[var(--gold)] to-[var(--brand)] lg:hidden" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[480px]"
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[var(--brand)]">Welcome back</p>
          <h2 className="font-display mt-2 text-[2rem] font-semibold leading-tight text-[var(--ink)]">
            Sign in to your command center
          </h2>
          <p className="mt-2 text-[0.88rem] leading-relaxed text-[var(--ink-2)]">
            Pick a role to <span className="font-bold text-[var(--ink)]">autofill demo credentials</span> and enter — your saved work persists on this device between sessions.
          </p>

          {/* Role cards */}
          <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ROLE_CARDS.map((c, i) => (
              <motion.button
                key={c.role}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.07 }}
                onClick={() => pick(c)}
                className={cn(
                  "group relative rounded-2xl border bg-[var(--surface)] p-4 text-left transition-all duration-200",
                  picked === c.role
                    ? "border-[var(--brand)] shadow-[0_10px_25px_-12px_rgba(12,107,79,0.45)] ring-2 ring-[var(--brand)]"
                    : "border-[var(--line)] hover:border-[#cfc9b8] hover:shadow-[0_10px_25px_-14px_rgba(23,38,31,0.3)]"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-lg px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-white"
                    style={{ background: c.accent }}
                  >
                    {c.role}
                  </span>
                  {picked === c.role ? (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--brand)] text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="h-5 w-5 rounded-full border-2 border-[var(--line)] transition-colors group-hover:border-[var(--brand)]" />
                  )}
                </div>
                <p className="mt-2.5 text-[0.92rem] font-bold text-[var(--ink)]">{c.name}</p>
                <p className="mt-0.5 text-[0.73rem] leading-snug text-[var(--ink-2)]">{c.blurb}</p>
              </motion.button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={submit} className="mt-6 space-y-3.5">
            <label className="block">
              <span className="mb-1.5 block text-[0.75rem] font-bold text-[var(--ink-2)]">Work email</span>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
                <input
                  className="field pl-10"
                  type="email"
                  required
                  placeholder="you@reviveregen.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.75rem] font-bold text-[var(--ink-2)]">Password</span>
              <div className="relative">
                <KeyRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
                <input
                  className="field pl-10"
                  type="password"
                  required
                  placeholder="demo1234"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </label>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-[0.8rem] font-semibold text-[var(--danger)]">
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] py-3.5 text-[0.92rem] font-bold text-white shadow-[0_10px_25px_-8px_rgba(12,107,79,0.6)] transition-all hover:bg-[var(--brand-deep)] active:scale-[0.99]"
            >
              Enter Command Center
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-[var(--gold-soft)] px-4 py-3">
            <Sparkles size={15} className="mt-0.5 shrink-0 text-[#a8843a]" />
            <p className="text-[0.75rem] leading-relaxed text-[#7d6030]">
              <span className="font-bold">Demo build:</span> all four roles share password <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[0.7rem] font-bold">demo1234</code> — autofilled when you select a role card. Data is stored locally and can be reset anytime from the user menu.
            </p>
          </div>

          <p className="mt-6 flex items-center gap-2 text-[0.7rem] font-semibold text-[var(--ink-3)]">
            <ShieldCheck size={13} /> Revive Regenerative · Internal field-sales platform · Confidential
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function MapPreview() {
  const accounts = useAppStore((s) => s.accounts);
  return <TerritoryMap accounts={accounts} compact mode="priority" />;
}
