"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Copy,
  FileText,
  Flame,
  MapPin,
  Printer,
  Settings2,
  Sunrise,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, Button, Card, CardHeader, Chip, Field, Modal } from "@/components/ui";
import { MARKETS } from "@/lib/geo";
import { useAppStore } from "@/lib/store";
import { cn, fmtDate, fmtMoney, relTime, stageMeta } from "@/lib/utils";

const TIMEZONES = ["America/Chicago", "America/New_York", "America/Denver", "America/Los_Angeles"];

export default function ReportsPage() {
  const accounts = useAppStore((s) => s.accounts);
  const activities = useAppStore((s) => s.activities);
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [report, setReport] = useState<"daily" | "weekly" | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const T = settings.coverageThresholdDays;

  // ── Daily digest data (today) ──
  const daily = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const t0 = start.getTime();
    const todays = activities.filter((a) => a.at >= t0);
    const moves = accounts.flatMap((a) =>
      (a.stageHistory ?? []).filter((h) => h.at >= t0).map((h) => ({ account: a, h }))
    );
    const overdueTasks = tasks.filter((t) => !t.done && t.dueAt < Date.now());
    const completedToday = tasks.filter((t) => t.done).length; // approximation w/o completion timestamps
    const byRep = users.filter((u) => u.role !== "ADMIN" && u.active).map((u) => {
      const acts = todays.filter((a) => a.userId === u.id);
      const tgt = settings.targets[u.role];
      return {
        u,
        meetings: acts.filter((a) => a.type === "meeting" || a.type === "demo").length,
        visits: acts.filter((a) => a.type === "visit").length,
        calls: acts.filter((a) => a.type === "call").length,
        emails: acts.filter((a) => a.type === "email").length,
        tgt,
        behind: acts.length === 0,
      };
    });
    const coaching: string[] = [];
    for (const r of byRep) {
      if (r.tgt.calls > 0 && r.calls < Math.min(3, r.tgt.calls)) coaching.push(`${r.u.name.split(" ")[0]}: call volume low today (${r.calls}/${r.tgt.calls} target) — coach on call blocks`);
      if (r.behind) coaching.push(`${r.u.name.split(" ")[0]}: no activity logged today — confirm field day / PTO status`);
    }
    if (moves.some((m) => m.h.stage === "negotiation")) coaching.push("Deals entered negotiation today — prep RSM availability for closing support");
    return { todays, moves, overdueTasks, completedToday, byRep, coaching };
  }, [activities, accounts, tasks, users, settings]);

  // ── Weekly review data ──
  const weekly = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86_400_000;
    const overdueMarkets = MARKETS.map((m) => {
      const accts = accounts.filter((a) => a.city === m.city && a.state === m.state);
      if (accts.length === 0) return null;
      const visits = accts.map((a) => a.lastVisitAt).filter((x): x is number => x !== null);
      const last = visits.length ? Math.max(...visits) : null;
      const days = last ? Math.floor((Date.now() - last) / 86_400_000) : null;
      if (days === null || days > T) return { ...m, accts: accts.length, days, pipeline: accts.reduce((s, a) => s + a.opportunity, 0) };
      return null;
    }).filter(Boolean) as { city: string; state: string; accts: number; days: number | null; pipeline: number }[];

    const hotSilent = accounts
      .filter((a) => a.priority === "A" && !["won", "lost"].includes(a.stage))
      .filter((a) => !a.lastContactAt || Date.now() - a.lastContactAt > 7 * 86_400_000)
      .slice(0, 8);

    const upcoming = tasks
      .filter((t) => !t.done && t.dueAt >= Date.now() && t.dueAt < weekAgo * -1 + Date.now() + 14 * 86_400_000)
      .sort((a, b) => a.dueAt - b.dueAt)
      .slice(0, 10);

    const stalled = accounts
      .filter((a) => ["meeting", "demo", "proposal", "negotiation"].includes(a.stage))
      .filter((a) => !a.lastContactAt || Date.now() - a.lastContactAt > 14 * 86_400_000)
      .slice(0, 8);

    const concentrations = Object.entries(
      accounts.reduce<Record<string, number>>((m, a) => {
        m[`${a.city}, ${a.state}`] = (m[`${a.city}, ${a.state}`] ?? 0) + 1;
        return m;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const priorities = [
      ...overdueMarkets.slice(0, 3).map((m) => `Plan field day in ${m.city}, ${m.state} (${m.accts} accounts, ${m.days === null ? "never visited" : `${m.days}d since last visit`})`),
      ...hotSilent.slice(0, 2).map((a) => `Re-engage A-priority: ${a.name} (${a.city})`),
    ].slice(0, 5);

    return { overdueMarkets, hotSilent, upcoming, stalled, concentrations, priorities };
  }, [accounts, tasks, T]);

  const rs = settings.reports;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Section 14 · Management Reports</p>
          <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">RSM Reports</h1>
          <p className="mt-1 text-[0.88rem] text-[var(--ink-2)]">
            Daily digest at <span className="font-bold">{rs.dailyTime}</span> and weekly territory review every <span className="font-bold">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][rs.weeklyDay]}</span> ({rs.timezone}). Rendered in-app in this build — scheduled email delivery plugs in behind the same generator.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setConfigOpen(true)}>
          <Settings2 size={15} /> Schedule
        </Button>
      </div>

      {/* Generators */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5" lift>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-deep)]"><Clock size={19} /></span>
            <div>
              <h3 className="font-display text-lg font-semibold">Daily Activity Digest</h3>
              <p className="text-[0.76rem] font-semibold text-[var(--ink-2)]">5:30 PM CT · meetings, calls, pipeline moves, coaching flags</p>
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={() => setReport("daily")}>
            <FileText size={15} /> Generate today's digest
          </Button>
        </Card>
        <Card className="p-5" lift>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--gold-soft)] text-[#8a6a33]"><Sunrise size={19} /></span>
            <div>
              <h3 className="font-display text-lg font-semibold">Weekly Territory Review</h3>
              <p className="text-[0.76rem] font-semibold text-[var(--ink-2)]">Monday · overdue markets, stalled deals, field priorities</p>
            </div>
          </div>
          <Button variant="gold" className="mt-4 w-full" onClick={() => setReport("weekly")}>
            <FileText size={15} /> Generate weekly review
          </Button>
        </Card>
      </div>

      {/* Daily digest */}
      {report === "daily" && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader
              title={`Daily Activity Digest — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`}
              sub={`Generated ${rs.dailyTime} ${rs.timezone} (simulated run "now")`}
              action={<ReportActions title="Revive Sales Command — Daily Digest" />}
            />
            <div className="px-5 pb-5">
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-6">
                <DigestStat label="Meetings + demos" v={daily.todays.filter((a) => a.type === "meeting" || a.type === "demo").length} />
                <DigestStat label="Drop-in visits" v={daily.todays.filter((a) => a.type === "visit").length} />
                <DigestStat label="Outbound calls" v={daily.todays.filter((a) => a.type === "call").length} />
                <DigestStat label="Emails logged" v={daily.todays.filter((a) => a.type === "email").length} />
                <DigestStat label="Stage moves" v={daily.moves.length} />
                <DigestStat label="Overdue tasks" v={daily.overdueTasks.length} alert={daily.overdueTasks.length > 0} />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="text-[0.72rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">Rep activity today</h4>
                  <div className="mt-2 space-y-2">
                    {daily.byRep.map((r) => (
                      <div key={r.u.id} className="flex items-center gap-3 rounded-xl bg-[var(--surface-2)] px-3.5 py-2.5">
                        <Avatar name={r.u.name} color={r.u.color} size={30} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.82rem] font-bold">{r.u.name} <span className="font-semibold text-[var(--ink-3)]">· {r.u.role}</span></p>
                          <p className="text-[0.7rem] font-semibold text-[var(--ink-2)]">
                            {r.meetings} mtg/demo · {r.visits} drop-ins · {r.calls} calls · {r.emails} emails
                          </p>
                        </div>
                        {r.behind ? (
                          <span className="rounded-full bg-[var(--danger-soft)] px-2 py-0.5 text-[0.62rem] font-extrabold text-[var(--danger)]">No activity</span>
                        ) : (
                          <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[0.62rem] font-extrabold text-[var(--brand-deep)]">Logged</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[0.72rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">Pipeline changes today</h4>
                    <div className="mt-2 space-y-1.5">
                      {daily.moves.length === 0 && <p className="text-[0.78rem] font-semibold text-[var(--ink-3)]">No stage moves today.</p>}
                      {daily.moves.map(({ account, h }) => (
                        <p key={account.id + h.at} className="rounded-lg bg-[var(--brand-softer)] px-3 py-2 text-[0.78rem] font-semibold text-[var(--brand-deep)]">
                          {account.name} → {stageMeta(h.stage).label} <span className="text-[var(--ink-3)]">({fmtMoney(account.opportunity)}, {relTime(h.at)})</span>
                        </p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="flex items-center gap-1.5 text-[0.72rem] font-extrabold uppercase tracking-wide text-[var(--amber)]"><Flame size={11} /> Coaching opportunities</h4>
                    <ul className="mt-2 space-y-1.5">
                      {daily.coaching.length === 0 && <li className="text-[0.78rem] font-semibold text-[var(--ink-3)]">Full coverage today — no coaching flags.</li>}
                      {daily.coaching.map((c) => (
                        <li key={c} className="rounded-lg bg-[var(--gold-soft)] px-3 py-2 text-[0.78rem] font-semibold text-[#7d6030]">{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Weekly review */}
      {report === "weekly" && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader
              title="Weekly Territory Review — TX & OK"
              sub={`Week of ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}`}
              action={<ReportActions title="Revive Sales Command — Weekly Territory Review" />}
            />
            <div className="grid grid-cols-1 gap-5 px-5 pb-5 lg:grid-cols-2">
              <div className="space-y-4">
                <ReportBlock title={`Markets overdue for coverage (${T}d threshold)`} tone="danger">
                  {weekly.overdueMarkets.map((m) => (
                    <li key={m.city} className="flex items-center justify-between rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[0.78rem] font-semibold text-[#8a2e20]">
                      {m.city}, {m.state} <span>{m.days === null ? "never visited" : `${m.days}d since visit`} · {fmtMoney(m.pipeline)}</span>
                    </li>
                  ))}
                </ReportBlock>
                <ReportBlock title="High-priority accounts quiet 7+ days" tone="amber">
                  {weekly.hotSilent.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-lg bg-[var(--gold-soft)] px-3 py-2 text-[0.78rem] font-semibold text-[#7d6030]">
                      {a.name} <span>{a.city} · {relTime(a.lastContactAt)}</span>
                    </li>
                  ))}
                </ReportBlock>
                <ReportBlock title="Strongest prospect concentrations" tone="brand">
                  {weekly.concentrations.map(([city, n]) => (
                    <li key={city} className="flex items-center justify-between rounded-lg bg-[var(--brand-softer)] px-3 py-2 text-[0.78rem] font-semibold text-[var(--brand-deep)]">
                      <span className="inline-flex items-center gap-1.5"><MapPin size={11} /> {city}</span> <span>{n} accounts</span>
                    </li>
                  ))}
                </ReportBlock>
              </div>
              <div className="space-y-4">
                <ReportBlock title="Upcoming meetings & follow-ups (14d)" tone="neutral">
                  {weekly.upcoming.map((t) => {
                    const a = accounts.find((x) => x.id === t.accountId);
                    return (
                      <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-[0.78rem] font-semibold text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line-2)]">
                        <span className="truncate">{t.title}</span> <span className="shrink-0 tabular-nums">{fmtDate(t.dueAt)}</span>
                      </li>
                    );
                  })}
                </ReportBlock>
                <ReportBlock title="Stalled opportunities (14d+ no contact)" tone="danger">
                  {weekly.stalled.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[0.78rem] font-semibold text-[#8a2e20]">
                      {a.name} · {stageMeta(a.stage).short} <span>{fmtMoney(a.opportunity)}</span>
                    </li>
                  ))}
                </ReportBlock>
                <ReportBlock title="Recommended field priorities" tone="brand">
                  {weekly.priorities.map((p) => (
                    <li key={p} className="flex items-start gap-2 rounded-lg bg-[var(--brand-soft)] px-3 py-2 text-[0.78rem] font-semibold text-[var(--brand-deep)]">
                      <CalendarClock size={12} className="mt-0.5 shrink-0" /> {p}
                    </li>
                  ))}
                </ReportBlock>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Schedule config */}
      <Modal open={configOpen} onClose={() => setConfigOpen(false)} title="Report Schedule">
        <div className="space-y-4">
          <p className="text-[0.82rem] leading-relaxed text-[var(--ink-2)]">
            Schedules and time zones are configurable. In this build, reports render in-app on demand; production wiring calls the same generators on a cron (e.g., Vercel Cron / scheduled function) and delivers via the Outlook/Graph connection once approved.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Daily digest time">
              <input type="time" className="field" value={rs.dailyTime} onChange={(e) => updateSettings({ reports: { ...rs, dailyTime: e.target.value } })} />
            </Field>
            <Field label="Weekly review day">
              <select className="field" value={rs.weeklyDay} onChange={(e) => updateSettings({ reports: { ...rs, weeklyDay: Number(e.target.value) } })}>
                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Time zone">
              <select className="field" value={rs.timezone} onChange={(e) => updateSettings({ reports: { ...rs, timezone: e.target.value } })}>
                {TIMEZONES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setConfigOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DigestStat({ label, v, alert }: { label: string; v: number; alert?: boolean }) {
  return (
    <div className={cn("rounded-xl px-3 py-3 ring-1 ring-inset", alert ? "bg-[var(--danger-soft)] ring-[#ecc9c2]" : "bg-[var(--surface-2)] ring-[var(--line-2)]")}>
      <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{label}</p>
      <p className={cn("font-display mt-1 text-[1.5rem] font-semibold tabular-nums leading-none", alert ? "text-[var(--danger)]" : "text-[var(--ink)]")}>{v}</p>
    </div>
  );
}

function ReportBlock({ title, tone, children }: { title: string; tone: "danger" | "amber" | "brand" | "neutral"; children: React.ReactNode }) {
  const colors = { danger: "text-[var(--danger)]", amber: "text-[#8a6a33]", brand: "text-[var(--brand)]", neutral: "text-[var(--ink-3)]" };
  return (
    <div>
      <h4 className={cn("flex items-center gap-1.5 text-[0.72rem] font-extrabold uppercase tracking-wide", colors[tone])}>
        {(tone === "danger" || tone === "amber") && <AlertTriangle size={11} />} {title}
      </h4>
      <ul className="mt-2 space-y-1.5">{children}</ul>
    </div>
  );
}

function ReportActions({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => navigator.clipboard.writeText(`${title} — generated ${new Date().toISOString()}`)}
        className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-[0.68rem] font-bold text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)] hover:bg-white"
        title="Copy report header"
      >
        <Copy size={11} /> Copy
      </button>
      <button onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-[0.68rem] font-bold text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)] hover:bg-white">
        <Printer size={11} /> Print
      </button>
    </div>
  );
}
