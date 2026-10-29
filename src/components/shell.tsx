"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity as ActivityIcon,
  Bot,
  ChevronDown,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Mail,
  Map,
  MapPin,
  Mic,
  NotebookPen,
  Package,
  Plug,
  Radar,
  RotateCcw,
  Route as RouteIcon,
  Search,
  SearchCheck,
  Settings2,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { MARKETS } from "@/lib/geo";
import { roleLabel, useAppStore, useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui";
import VoiceVisitModal from "./voice";

const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: "Command",
    items: [
      { href: "/dashboard", label: "Command Dashboard", icon: LayoutDashboard },
      { href: "/assistant", label: "AI Assistant", icon: Bot },
    ],
  },
  {
    label: "Field",
    items: [
      { href: "/radar", label: "Prospect Radar", icon: SearchCheck },
      { href: "/coverage", label: "Territory Coverage", icon: Map },
      { href: "/routes", label: "Smart Routes", icon: RouteIcon },
      { href: "/activities", label: "Visit Notes", icon: NotebookPen },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/accounts", label: "Accounts", icon: Radar },
      { href: "/contacts", label: "Contacts", icon: Users },
      { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
      { href: "/email", label: "Email Concierge", icon: Mail },
      { href: "/scorecard", label: "Team Scorecards", icon: Trophy },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/products", label: "Product Library", icon: Package },
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/team", label: "Team & Territory", icon: Users },
      { href: "/settings", label: "Settings", icon: Settings2 },
    ],
  },
];

export function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "relative grid h-10 w-10 place-items-center rounded-xl",
          light ? "bg-white/12 ring-1 ring-white/25" : "bg-[var(--brand)] shadow-[0_8px_18px_-6px_rgba(12,107,79,0.55)]"
        )}
      >
        <Radar size={20} className={light ? "text-white" : "text-white"} />
        <span className={cn("absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2", light ? "border-[#0a3f2e] bg-[var(--gold)]" : "border-white bg-[var(--gold)]")} />
      </span>
      <span className="leading-tight">
        <span className={cn("font-display block text-[1.05rem] font-semibold tracking-tight", light ? "text-white" : "text-[var(--ink)]")}>
          Revive <span className={light ? "text-[#9fd4bd]" : "text-[var(--brand)]"}>Sales Command</span>
        </span>
        <span className={cn("block text-[0.62rem] font-bold uppercase tracking-[0.22em]", light ? "text-white/60" : "text-[var(--ink-3)]")}>
          Texas · Oklahoma
        </span>
      </span>
    </div>
  );
}

function useTodayTasksBadge() {
  const tasks = useAppStore((s) => s.tasks);
  return useMemo(() => tasks.filter((t) => !t.done && t.dueAt <= Date.now() + 2 * 86_400_000).length, [tasks]);
}

function Sidebar() {
  const pathname = usePathname();
  const dueCount = useTodayTasksBadge();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[var(--line)] bg-[var(--surface)] px-5 py-6 lg:flex">
      <div className="px-1">
        <Logo />
      </div>

      <nav className="mt-6 flex-1 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[var(--ink-3)]">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={cn("nav-link", active && "active")}>
                    <Icon size={17} strokeWidth={2.2} />
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/activities" && dueCount > 0 && (
                      <span className="rounded-full bg-[var(--danger-soft)] px-1.5 py-0.5 text-[0.65rem] font-bold text-[var(--danger)]">
                        {dueCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 rounded-2xl bg-[var(--brand-soft)] p-4">
        <div className="flex items-center gap-2 text-[var(--brand-deep)]">
          <MapPin size={15} strokeWidth={2.4} />
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em]">Region</p>
        </div>
        <p className="mt-1.5 text-[0.8rem] font-semibold leading-snug text-[var(--brand-deep)]">
          TX &amp; OK Combined Region
        </p>
        <p className="text-[0.7rem] text-[#3f6b58]">{MARKETS.length} target markets · 2 states</p>
      </div>
    </aside>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const user = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const logout = useAppStore((s) => s.logout);
  const resetDemo = useAppStore((s) => s.resetDemo);

  if (!user) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-3 transition-colors hover:bg-[var(--surface-2)]"
      >
        <Avatar name={user.name} color={user.color} size={34} />
        <span className="hidden text-left sm:block">
          <span className="block text-[0.82rem] font-bold leading-tight text-[var(--ink)]">{user.name}</span>
          <span className="block text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]">{roleLabel(user.role)}</span>
        </span>
        <ChevronDown size={14} className={cn("text-[var(--ink-3)] transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.16 }}
              className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-xl"
            >
              <div className="rounded-xl bg-[var(--surface-2)] p-3">
                <p className="text-sm font-bold">{user.name}</p>
                <p className="text-[0.72rem] text-[var(--ink-2)]">{user.title}</p>
                <p className="mt-1 text-[0.72rem] font-semibold text-[var(--brand)]">{user.territory}</p>
              </div>
              <button
                className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[0.83rem] font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
                onClick={() => {
                  resetDemo();
                  setOpen(false);
                }}
              >
                <RotateCcw size={15} /> Reset demo dataset
              </button>
              <button
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[0.83rem] font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
              >
                <LogOut size={15} /> Sign out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Topbar({ onDictate }: { onDictate: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center gap-4 border-b border-[var(--line)] bg-[rgba(246,244,238,0.85)] px-5 backdrop-blur-md lg:pl-8">
      <div className="lg:hidden">
        <MobileNavButton />
      </div>
      <button
        onClick={onDictate}
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-3.5 py-2 text-[0.78rem] font-bold text-white transition-all hover:bg-[var(--brand)] active:scale-[0.98] md:order-2"
        title="Dictate a field visit (voice logging)"
      >
        <Mic size={14} /> <span className="hidden sm:inline">Dictate Visit</span>
      </button>
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
        <input
          placeholder="Quick search — press / to jump to Accounts"
          className="field pl-10"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const el = e.target as HTMLInputElement;
              window.location.href = `/accounts?q=${encodeURIComponent(el.value)}`;
            }
          }}
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden items-center gap-2 rounded-full bg-[var(--surface)] px-3 py-1.5 text-[0.72rem] font-bold text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)] md:inline-flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand)]" />
          Demo environment · data saved locally
        </span>
        <UserMenu />
      </div>
    </header>
  );
}

function MobileNavButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-xl ring-1 ring-inset ring-[var(--line)] text-[var(--ink-2)]"
        aria-label="Open navigation"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="14" y2="17" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-[270px] bg-[var(--surface)] p-5"
            >
              <Logo />
              <nav className="mt-6 space-y-3 overflow-y-auto">
                {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} className={cn("nav-link", pathname.startsWith(item.href) && "active")}>
                      <Icon size={17} strokeWidth={2.2} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const authed = useAppStore((s) => s.currentUserId !== null);
  const [dictateOpen, setDictateOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !authed) router.replace("/login");
  }, [hydrated, authed, router]);

  if (!hydrated || !authed) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-5">
          <Logo />
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[var(--brand)] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[248px]">
        <Topbar onDictate={() => setDictateOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <VoiceVisitModal open={dictateOpen} onClose={() => setDictateOpen(false)} />
    </div>
  );
}
