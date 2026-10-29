"use client";

import { CalendarPlus, ChevronRight, ClipboardList, Filter, MapPin, MousePointerClick, Phone, Video } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LogActivityModal } from "@/components/forms";
import { Avatar, Button, Card, CardHeader, Chip, EmptyState } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { cn, fmtDate, relTime } from "@/lib/utils";
import type { ActivityType } from "@/lib/types";

const TYPE_META: Record<ActivityType, { label: string; color: string; icon: typeof Phone }> = {
  call: { label: "Calls", color: "#27698F", icon: Phone },
  visit: { label: "Visits", color: "#0C6B4F", icon: MapPin },
  email: { label: "Emails", color: "#B97A1A", icon: ChevronRight },
  demo: { label: "Demos", color: "#6B4FA1", icon: Video },
  meeting: { label: "Meetings", color: "#B4541E", icon: CalendarPlus },
  note: { label: "Notes", color: "#647A6E", icon: ClipboardList },
};

export default function ActivitiesPage() {
  const activities = useAppStore((s) => s.activities);
  const accounts = useAppStore((s) => s.accounts);
  const users = useAppStore((s) => s.users);
  const tasks = useAppStore((s) => s.tasks);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const user = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const isLeader = user?.role === "RSM" || user?.role === "ADMIN";

  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
  const [userFilter, setUserFilter] = useState<string>(isLeader ? "all" : (user?.id ?? "all"));
  const [logOpen, setLogOpen] = useState(false);

  const rows = useMemo(
    () =>
      activities
        .filter((a) => typeFilter === "all" || a.type === typeFilter)
        .filter((a) => userFilter === "all" || a.userId === userFilter)
        .sort((a, b) => b.at - a.at),
    [activities, typeFilter, userFilter]
  );

  const counts = useMemo(() => {
    const map = new Map<ActivityType, number>();
    for (const a of activities) map.set(a.type, (map.get(a.type) ?? 0) + 1);
    return map;
  }, [activities]);

  const openTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.done)
        .filter((t) => userFilter === "all" || t.userId === userFilter)
        .sort((a, b) => a.dueAt - b.dueAt),
    [tasks, userFilter]
  );

  const weekStart = Date.now() - 7 * 86_400_000;
  const thisWeek = activities.filter((a) => a.at >= weekStart && (userFilter === "all" || a.userId === userFilter));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Visit Notes</p>
          <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">Visit Notes &amp; Activity</h1>
          <p className="mt-1 text-[0.88rem] text-[var(--ink-2)]">
            <span className="font-bold text-[var(--ink)]">{thisWeek.length}</span> touchpoints in the last 7 days · every call, visit, email and demo in one place
          </p>
        </div>
        <Button onClick={() => setLogOpen(true)}>
          <ClipboardList size={16} /> Log Activity
        </Button>
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill active={typeFilter === "all"} onClick={() => setTypeFilter("all")} label="All" count={activities.length} />
        {(Object.keys(TYPE_META) as ActivityType[]).map((t) => {
          const meta = TYPE_META[t];
          const Icon = meta.icon;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? "all" : t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[0.78rem] font-bold ring-1 ring-inset transition-all",
                typeFilter === t ? "text-white" : "bg-[var(--surface)] text-[var(--ink-2)] ring-[var(--line)] hover:bg-[var(--surface-2)]"
              )}
              style={typeFilter === t ? { background: meta.color, boxShadow: `0 6px 14px -6px ${meta.color}66` } : undefined}
            >
              <Icon size={13} strokeWidth={2.4} />
              {meta.label}
              <span className={cn("rounded-md px-1 text-[0.68rem]", typeFilter === t ? "bg-white/25" : "bg-[var(--surface-2)]")}>
                {counts.get(t) ?? 0}
              </span>
            </button>
          );
        })}
        <select className="field ml-auto w-auto" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
          <option value="all">Everyone</option>
          {users.filter((u) => u.active && u.role !== "ADMIN").map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Feed */}
        <Card className="xl:col-span-2">
          <CardHeader title="Activity Feed" sub={`${rows.length} records`} />
          <div className="divide-y divide-[var(--line-2)] px-2 pb-3">
            {rows.length === 0 && (
              <EmptyState icon={<ClipboardList size={20} />} title="No matching activity" sub="Adjust filters or log a new touchpoint." />
            )}
            {rows.map((act) => {
              const meta = TYPE_META[act.type];
              const Icon = meta.icon;
              const acc = accounts.find((a) => a.id === act.accountId);
              const who = users.find((u) => u.id === act.userId);
              return (
                <div key={act.id} className="flex items-start gap-3 px-3 py-3.5 transition-colors hover:bg-[var(--surface-2)]">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: meta.color }}>
                    <Icon size={15} strokeWidth={2.3} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.86rem] leading-snug">
                      <Link href={acc ? `/accounts/${acc.id}` : "#"} className="font-bold hover:text-[var(--brand)] hover:underline">
                        {acc?.name ?? "Unknown"}
                      </Link>
                      <span className="text-[var(--ink-2)]"> — {act.summary}</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[0.66rem] font-extrabold uppercase tracking-wider" style={{ color: meta.color }}>{meta.label.slice(0, -1)}</span>
                      <span className="text-[0.68rem] font-semibold text-[var(--ink-3)]">{fmtDate(act.at)} · {relTime(act.at)}</span>
                      {who && (
                        <span className="inline-flex items-center gap-1.5">
                          <Avatar name={who.name} color={who.color} size={16} />
                          <span className="text-[0.68rem] font-bold text-[var(--ink-2)]">{who.name}</span>
                        </span>
                      )}
                      {act.outcome && <Chip tone="brand">{act.outcome}</Chip>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Follow-up queue */}
        <Card className="h-fit">
          <CardHeader title="Follow-up Queue" sub="Click an item to mark it done" />
          <div className="space-y-1.5 px-3 pb-4">
            {openTasks.length === 0 && <p className="px-2 pb-3 text-[0.82rem] text-[var(--ink-2)]">Queue is clear.</p>}
            {openTasks.map((t) => {
              const acc = accounts.find((a) => a.id === t.accountId);
              const who = users.find((u) => u.id === t.userId);
              const overdue = t.dueAt < Date.now();
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTask(t.id)}
                  className="group flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)]"
                >
                  <span className={cn(
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-colors group-hover:border-[var(--brand)]",
                    overdue ? "border-[var(--danger)]" : "border-[var(--line)]"
                  )}>
                    <MousePointerClick size={10} className="opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.8rem] font-bold leading-snug">{t.title}</span>
                    <span className="block text-[0.68rem] font-semibold text-[var(--ink-2)]">
                      <Link href={acc ? `/accounts/${acc.id}` : "#"} onClick={(e) => e.stopPropagation()} className="hover:text-[var(--brand)] hover:underline">{acc?.name}</Link>
                      {who && <> · {who.name.split(" ")[0]}</>}
                    </span>
                  </span>
                  <span className={cn("shrink-0 rounded-lg px-2 py-1 text-[0.64rem] font-extrabold", overdue ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--surface-2)] text-[var(--ink-2)]")}>
                    {overdue ? "Overdue" : fmtDate(t.dueAt)}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <LogActivityModal open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}

function FilterPill({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[0.78rem] font-bold ring-1 ring-inset transition-all",
        active ? "bg-[var(--ink)] text-white shadow-sm" : "bg-[var(--surface)] text-[var(--ink-2)] ring-[var(--line)] hover:bg-[var(--surface-2)]"
      )}
    >
      {label}
      <span className={cn("rounded-md px-1 text-[0.68rem]", active ? "bg-white/20" : "bg-[var(--surface-2)]")}>{count}</span>
    </button>
  );
}
