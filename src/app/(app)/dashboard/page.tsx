"use client";

import { motion } from "framer-motion";
import {
  AlarmClock,
  ArrowRight,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Flame,
  Globe,
  Handshake,
  MapPin,
  Phone,
  Plus,
  Radar,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LogActivityModal } from "@/components/forms";
import TerritoryMap from "@/components/TerritoryMap";
import { Avatar, Button, Card, CardHeader, Chip, PriorityBadge, StageBadge, StatCard } from "@/components/ui";
import { SpecialtyDonut, StageBars } from "@/components/viz";
import { MARKETS } from "@/lib/geo";
import { roleLabel, useAppStore } from "@/lib/store";
import { cn, fmtMoney, relTime } from "@/lib/utils";
import type { Account, Activity } from "@/lib/types";

const ACT_ICONS: Record<Activity["type"], typeof Phone> = {
  call: Phone,
  visit: MapPin,
  email: ChevronRight,
  demo: Video,
  meeting: Handshake,
  note: ClipboardList,
};

export default function DashboardPage() {
  const router = useRouter();
  const accounts = useAppStore((s) => s.accounts);
  const activities = useAppStore((s) => s.activities);
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const user = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));

  const isLeader = user?.role === "RSM" || user?.role === "ADMIN";
  const myAccounts = useMemo(
    () => (isLeader ? accounts : accounts.filter((a) => a.ownerId === user?.id)),
    [accounts, isLeader, user?.id]
  );

  const [logOpen, setLogOpen] = useState(false);

  const stats = useMemo(() => {
    const active = myAccounts.filter((a) => a.stage !== "won" && a.stage !== "lost");
    const pipeline = active.reduce((s, a) => s + a.opportunity, 0);
    const weekEnd = Date.now() + 7 * 86_400_000;
    const meetings = tasks.filter((t) => !t.done && t.dueAt < weekEnd && (t.type === "demo" || t.type === "meeting")).length
      + activities.filter((a) => a.at > Date.now() - 7 * 86_400_000 && (a.type === "meeting" || a.type === "demo")).length;
    const due = tasks.filter((t) => !t.done && t.dueAt <= Date.now() + 86_400_000).length;
    const overdue = tasks.filter((t) => !t.done && t.dueAt < Date.now()).length;
    return { total: myAccounts.length, active: active.length, pipeline, meetings, due, overdue };
  }, [myAccounts, tasks, activities]);

  const coldAccounts = useMemo(
    () =>
      myAccounts
        .filter((a) => a.stage !== "won" && a.stage !== "lost")
        .map((a) => ({ a, days: a.lastContactAt ? (Date.now() - a.lastContactAt) / 86_400_000 : 999 }))
        .filter((x) => x.days > 14)
        .sort((x, y) => y.days - x.days)
        .slice(0, 5),
    [myAccounts]
  );

  const coverage = useMemo(() => {
    const counted = new Map<string, number>();
    for (const a of accounts) counted.set(`${a.city}|${a.state}`, (counted.get(`${a.city}|${a.state}`) ?? 0) + 1);
    const gaps = MARKETS.map((m) => ({ ...m, n: counted.get(`${m.city}|${m.state}`) ?? 0 }));
    return { covered: gaps.filter((g) => g.n > 0).length, total: gaps.length, gaps: gaps.filter((g) => g.n === 0).slice(0, 7) };
  }, [accounts]);

  const dueTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.done)
        .filter((t) => isLeader || t.userId === user?.id)
        .sort((a, b) => a.dueAt - b.dueAt)
        .slice(0, 6),
    [tasks, isLeader, user?.id]
  );

  const recent = useMemo(
    () =>
      activities
        .filter((a) => isLeader || a.userId === user?.id)
        .slice(0, 7),
    [activities, isLeader, user?.id]
  );

  const findOwner = (a: Account) => users.find((u) => u.id === a.ownerId);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-display mt-1 text-[clamp(1.7rem,3vw,2.4rem)] font-semibold leading-tight">
            {greeting}, {user?.name.split(" ")[0]}.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-1 text-[0.9rem] text-[var(--ink-2)]">
            {roleLabel(user?.role ?? "TM")} · {user?.territory} —{" "}
            <span className="font-bold text-[var(--ink)]">{stats.due} follow-ups</span> need attention,{" "}
            <span className="font-bold text-[var(--ink)]">{fmtMoney(stats.pipeline)}</span> in open pipeline.
          </motion.p>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push("/accounts?new=1")}>
            <Plus size={16} /> Add Account
          </Button>
          <Button onClick={() => setLogOpen(true)}>
            <ClipboardList size={16} /> Log Activity
          </Button>
        </motion.div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Tracked accounts" value={stats.total} icon={<Radar size={19} />} delta={`${stats.active} actively in play`} deltaTone="up" />
        <StatCard label="Open pipeline" value={stats.pipeline} icon={<CircleDollarSign size={19} />} format={fmtMoney} delta="Capital equipment value" deltaTone="up" delay={0.06} />
        <StatCard label="Follow-ups due" value={stats.due} icon={<AlarmClock size={19} />} delta={stats.overdue > 0 ? `${stats.overdue} overdue` : "All caught up"} deltaTone={stats.overdue > 0 ? "down" : "up"} delay={0.12} />
        <StatCard label="Demos & meetings" value={stats.meetings} icon={<CalendarClock size={19} />} delta="This week & next 7 days" deltaTone="warn" delay={0.18} />
      </div>

      {/* Map + right rail */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title="Territory Command Map"
            sub="All tracked practices across Texas & Oklahoma — dot size marks priority, pulsing dots are A-priority pursuits"
            action={<Chip tone="brand"><Flame size={11} /> {myAccounts.filter((a) => a.priority === "A").length} hot accounts</Chip>}
          />
          <div className="px-3 pb-4">
            <TerritoryMap accounts={myAccounts} mode="priority" onSelect={(a) => router.push(`/accounts/${a.id}`)} />
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Coverage Radar"
              sub={`${coverage.covered} of ${coverage.total} target markets covered`}
              action={<Globe size={17} className="text-[var(--ink-3)]" />}
            />
            <div className="px-5 pb-4">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--line-2)]">
                <motion.div
                  className="h-full rounded-full bg-[var(--brand)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(coverage.covered / coverage.total) * 100}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="mt-4 space-y-2">
                {coverage.gaps.map((g) => (
                  <div key={g.city} className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-2)] px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--amber)]" />
                    <span className="flex-1 text-[0.82rem] font-bold">{g.city}, {g.state}</span>
                    <span className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--amber)]">No coverage</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[0.7rem] leading-relaxed text-[var(--ink-3)]">
                Markets with zero tracked accounts. Feed these into Prospect Radar research sweeps.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Account Mix" sub="Specialty distribution of the book" />
            <SpecialtyDonut accounts={myAccounts} />
          </Card>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Cold accounts */}
        <Card>
          <CardHeader
            title="Going Cold"
            sub="No contact in 14+ days"
            action={<Link href="/accounts" className="inline-flex items-center gap-1 text-[0.75rem] font-bold text-[var(--brand)] hover:underline">All accounts <ArrowRight size={13} /></Link>}
          />
          <div className="space-y-1 px-3 pb-4">
            {coldAccounts.length === 0 && (
              <p className="px-2 pb-3 text-[0.82rem] font-semibold text-[var(--brand)]">Every open account has been touched within 14 days. Excellent coverage.</p>
            )}
            {coldAccounts.map(({ a, days }) => (
              <button
                key={a.id}
                onClick={() => router.push(`/accounts/${a.id}`)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)]"
              >
                <Avatar name={a.name} size={32} color={findOwner(a)?.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.84rem] font-bold">{a.name}</span>
                  <span className="block truncate text-[0.7rem] font-semibold text-[var(--ink-2)]">{a.city}, {a.state} · {stageBadgeShort(a)}</span>
                </span>
                <span className={cn("shrink-0 rounded-lg px-2 py-1 text-[0.68rem] font-extrabold", days > 60 ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--gold-soft)] text-[#8a6a33]")}>
                  {days > 200 ? "Never" : `${Math.floor(days)}d silent`}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Follow-ups */}
        <Card>
          <CardHeader title="Follow-up Radar" sub="Next scheduled actions" />
          <div className="space-y-1 px-3 pb-4">
            {dueTasks.length === 0 && <p className="px-2 pb-3 text-[0.82rem] font-semibold text-[var(--ink-2)]">No open follow-ups. Schedule a few from any account page.</p>}
            {dueTasks.map((t) => {
              const a = accounts.find((x) => x.id === t.accountId);
              const overdue = t.dueAt < Date.now();
              return (
                <Link
                  key={t.id}
                  href={`/accounts/${t.accountId}`}
                  className="flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
                >
                  <span className={cn("mt-1 grid h-2.5 w-2.5 shrink-0 place-items-center rounded-full", overdue ? "bg-[var(--danger)]" : "bg-[var(--gold)]")} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.82rem] font-bold leading-snug">{t.title}</span>
                    <span className="block text-[0.7rem] font-semibold text-[var(--ink-2)]">{a?.name} · {a?.city}</span>
                  </span>
                  <span className={cn("shrink-0 rounded-lg px-2 py-1 text-[0.66rem] font-extrabold", overdue ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--surface-2)] text-[var(--ink-2)]")}>
                    {overdue ? "Overdue" : relTime(t.dueAt).replace("in ", "in ")}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Pipeline by stage */}
        <Card>
          <CardHeader
            title="Pipeline by Stage"
            sub={`${fmtMoney(stats.pipeline)} across ${stats.active} open accounts`}
            action={<Link href="/pipeline" className="inline-flex items-center gap-1 text-[0.75rem] font-bold text-[var(--brand)] hover:underline">Board <ArrowRight size={13} /></Link>}
          />
          <StageBars accounts={myAccounts} />
        </Card>
      </div>

      {/* Activity feed */}
      <Card>
        <CardHeader
          title="Recent Field Activity"
          sub={isLeader ? "Region-wide activity stream" : "Your latest logged activity"}
          action={<Link href="/activities" className="inline-flex items-center gap-1 text-[0.75rem] font-bold text-[var(--brand)] hover:underline">Full log <ArrowRight size={13} /></Link>}
        />
        <div className="grid grid-cols-1 gap-1 px-3 pb-4 lg:grid-cols-2">
          {recent.map((act) => (
            <ActivityRow key={act.id} act={act} account={accounts.find((a) => a.id === act.accountId)} users={users} />
          ))}
        </div>
      </Card>

      <LogActivityModal open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}

function stageBadgeShort(a: Account) {
  return a.stage.replace(/^\w/, (c) => c.toUpperCase());
}

export function ActivityRow({ act, account, users }: { act: Activity; account?: Account; users: { id: string; name: string; color: string }[] }) {
  const who = users.find((u) => u.id === act.userId);
  const Icon = ACT_ICONS[act.type];
  return (
    <div className="flex items-start gap-3 rounded-xl px-2.5 py-3 transition-colors hover:bg-[var(--surface-2)]">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-softer)] text-[var(--brand-deep)]">
        <Icon size={14} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.83rem] leading-snug text-[var(--ink)]">
          <Link href={account ? `/accounts/${account.id}` : "#"} className="font-bold hover:text-[var(--brand)] hover:underline">{account?.name ?? "Unknown account"}</Link>
          <span className="text-[var(--ink-2)]"> — {act.summary}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--ink-3)]">{act.type}</span>
          <span className="text-[0.68rem] text-[var(--ink-3)]">·</span>
          <span className="text-[0.68rem] font-semibold text-[var(--ink-3)]">{relTime(act.at)}</span>
          {who && (
            <>
              <span className="text-[0.68rem] text-[var(--ink-3)]">·</span>
              <span className="text-[0.68rem] font-semibold text-[var(--ink-2)]">{who.name}</span>
            </>
          )}
          {act.outcome && <Chip tone="brand">{act.outcome}</Chip>}
        </div>
      </div>
    </div>
  );
}
