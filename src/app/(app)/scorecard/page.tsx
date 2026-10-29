"use client";

import { motion } from "framer-motion";
import { CalendarDays, Crown, ShieldAlert, Settings2, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, Button, Card, CardHeader, Field, Modal } from "@/components/ui";
import { roleLabel, useAppStore } from "@/lib/store";
import { cn, fmtMoney } from "@/lib/utils";
import type { Role } from "@/lib/types";

type Period = { id: string; label: string; days: number; workdays: number };
const PERIODS: Period[] = [
  { id: "today", label: "Today", days: 1, workdays: 1 },
  { id: "week", label: "This week", days: 7, workdays: 5 },
  { id: "month", label: "30 days", days: 30, workdays: 22 },
  { id: "quarter", label: "90 days", days: 90, workdays: 66 },
];

export default function ScorecardPage() {
  const users = useAppStore((s) => s.users);
  const accounts = useAppStore((s) => s.accounts);
  const activities = useAppStore((s) => s.activities);
  const tasks = useAppStore((s) => s.tasks);
  const settings = useAppStore((s) => s.settings);
  const updateTargets = useAppStore((s) => s.updateTargets);
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const canManage = me?.role === "RSM" || me?.role === "ADMIN";

  const [period, setPeriod] = useState<Period>(PERIODS[1]);
  const [targetsOpen, setTargetsOpen] = useState<Role | null>(null);

  const reps = users.filter((u) => u.active && u.role !== "ADMIN");

  const scored = useMemo(() => {
    const since = Date.now() - period.days * 86_400_000;
    return reps.map((u) => {
      const acts = activities.filter((a) => a.userId === u.id && a.at >= since);
      const tasksDone = tasks.filter((t) => t.userId === u.id && t.done).length; // done toggles lack timestamp — count all-time completed as proxy is wrong; use open vs all in period approximation
      const tgt = settings.targets[u.role];
      const scale = period.workdays;
      const meetingsDone = acts.filter((a) => a.type === "meeting").length;
      const demos = acts.filter((a) => a.type === "demo").length;
      const visits = acts.filter((a) => a.type === "visit").length;
      const calls = acts.filter((a) => a.type === "call").length;
      const conversations = acts.filter((a) => (a.type === "visit" || a.type === "call") && !!a.outcome).length;
      const newAccounts = accounts.filter((a) => a.ownerId === u.id && a.createdAt >= since).length;
      const moves = accounts
        .filter((a) => a.ownerId === u.id)
        .reduce((s, a) => s + (a.stageHistory ?? []).filter((h) => h.at >= since && h.stage !== "prospect").length, 0);
      const won = accounts.filter((a) => a.ownerId === u.id && a.stage === "won");
      const wonValue = won.reduce((s, a) => s + a.opportunity, 0);
      const openPipeline = accounts.filter((a) => a.ownerId === u.id && !["won", "lost"].includes(a.stage)).reduce((s, a) => s + a.opportunity, 0);
      const openFollowUps = tasks.filter((t) => t.userId === u.id && !t.done).length;
      void tasksDone;
      return {
        u,
        tgt,
        meetingsDone,
        meetingsScore: meetingsDone + demos,
        demos,
        visits,
        calls,
        conversations,
        newAccounts,
        moves,
        wonValue,
        openPipeline,
        openFollowUps,
        targets: {
          meetings: tgt.meetings * scale,
          dropIns: tgt.dropIns * scale,
          calls: tgt.calls * scale,
        },
      };
    });
  }, [reps, activities, tasks, accounts, period, settings]);

  const repOfThePeriod = useMemo(() => {
    let best: string | null = null;
    let bestScore = -1;
    for (const r of scored) {
      const score =
        (r.targets.meetings ? r.meetingsScore / r.targets.meetings : 0) +
        (r.targets.dropIns ? r.visits / r.targets.dropIns : 0) +
        (r.targets.calls ? r.calls / r.targets.calls : 0);
      if (score > bestScore) {
        bestScore = score;
        best = r.u.id;
      }
    }
    return best;
  }, [scored]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Section 13 · Scorecards</p>
          <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">Rep Activity Scorecards</h1>
          <p className="mt-1 text-[0.88rem] text-[var(--ink-2)]">
            Logged activity vs role-configurable daily targets — scaled by workdays in the selected period. Revenue numbers reflect the demo dataset.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-[var(--surface)] p-1 ring-1 ring-inset ring-[var(--line)]">
            {PERIODS.map((p) => (
              <button key={p.id} onClick={() => setPeriod(p)} className={cn("rounded-lg px-3.5 py-2 text-[0.78rem] font-bold transition-all", period.id === p.id ? "bg-[var(--ink)] text-white" : "text-[var(--ink-3)] hover:text-[var(--ink)]")}>
                {p.label}
              </button>
            ))}
          </div>
          {canManage && (
            <Button variant="secondary" onClick={() => setTargetsOpen("TM")}>
              <Settings2 size={15} /> Edit targets
            </Button>
          )}
        </div>
      </div>

      <p className="flex items-center gap-2 rounded-xl bg-[var(--gold-soft)] px-4 py-2.5 text-[0.75rem] font-bold text-[#7d6030] ring-1 ring-inset ring-[#e6d5b5]">
        <ShieldAlert size={13} /> Scores measure verified logged activity only — route plans, sequences and drafts never count toward quota.
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {scored.map((r, i) => {
          const best = r.u.id === repOfThePeriod;
          return (
            <motion.div key={r.u.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className={cn("p-5", best && "ring-2 ring-[var(--gold)]")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <Avatar name={r.u.name} color={r.u.color} size={44} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-[1.1rem] font-semibold">{r.u.name}</h3>
                        {best && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold-soft)] px-2 py-0.5 text-[0.62rem] font-extrabold uppercase text-[#8a6a33] ring-1 ring-inset ring-[#e6d5b5]">
                            <Crown size={10} /> Top cover
                          </span>
                        )}
                      </div>
                      <p className="text-[0.74rem] font-semibold text-[var(--ink-2)]">{r.u.title}</p>
                    </div>
                  </div>
                  <span className="rounded-lg px-2 py-1 text-[0.66rem] font-extrabold uppercase tracking-wide text-white" style={{ background: r.u.color }}>
                    {r.u.role}
                  </span>
                </div>

                {/* Target bars */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <TargetBar label="Meetings+demos" got={r.meetingsScore} tgt={r.targets.meetings} />
                  <TargetBar label="Field drop-ins" got={r.visits} tgt={r.targets.dropIns} />
                  <TargetBar label="Outbound calls" got={r.calls} tgt={r.targets.calls} />
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <Mini label="Conversations" value={String(r.conversations)} />
                  <Mini label="New prospects" value={String(r.newAccounts)} />
                  <Mini label="Stage moves" value={String(r.moves)} />
                  <Mini label="Follow-ups open" value={String(r.openFollowUps)} />
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-4 py-3">
                  <div className="flex items-center gap-2 text-[0.74rem] font-bold text-[var(--ink-2)]">
                    <Trophy size={13} className="text-[var(--gold)]" /> Demo results, not actuals
                  </div>
                  <div className="text-right">
                    <span className="text-[0.84rem] font-extrabold tabular-nums text-[#0F7A36]">{fmtMoney(r.wonValue)} won</span>
                    <span className="mx-2 text-[var(--line)]">|</span>
                    <span className="text-[0.84rem] font-extrabold tabular-nums text-[var(--brand)]">{fmtMoney(r.openPipeline)} open</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <CardHeader title="Target Reference" sub="Defaults per role — manager-editable at runtime" action={<CalendarDays size={15} className="text-[var(--ink-3)]" />} />
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {["Role", "Meetings / day", "Drop-ins / day", "Calls / day", "Applies to"].map((h) => (
                  <th key={h} className="py-2 pr-4 text-[0.64rem] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{h}</th>
                ))}
                {canManage && <th className="py-2" />}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(settings.targets) as Role[]).map((role) => {
                const t = settings.targets[role];
                const applied = users.filter((u) => u.role === role && u.active).length;
                return (
                  <tr key={role} className="border-b border-[var(--line-2)] last:border-none">
                    <td className="py-2.5 pr-4 text-[0.8rem] font-bold">{roleLabel(role)}</td>
                    <td className="py-2.5 pr-4 text-[0.8rem] font-semibold tabular-nums">{t.meetings}</td>
                    <td className="py-2.5 pr-4 text-[0.8rem] font-semibold tabular-nums">{t.dropIns}</td>
                    <td className="py-2.5 pr-4 text-[0.8rem] font-semibold tabular-nums">{t.calls}</td>
                    <td className="py-2.5 pr-4 text-[0.74rem] font-semibold text-[var(--ink-2)]">{applied} user(s)</td>
                    {canManage && (
                      <td className="py-2.5 text-right">
                        <button onClick={() => setTargetsOpen(role)} className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-[0.68rem] font-bold text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)] hover:bg-[var(--brand-softer)] hover:text-[var(--brand-deep)]">
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <RoleTargetsModal role={targetsOpen} onClose={() => setTargetsOpen(null)} onSave={(r, t) => updateTargets(r, t)} />
    </div>
  );
}

function TargetBar({ label, got, tgt }: { label: string; got: number; tgt: number }) {
  const pct = tgt > 0 ? Math.min(100, (got / tgt) * 100) : 100;
  const hit = tgt > 0 && got >= tgt;
  return (
    <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2.5">
      <p className="text-[0.6rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">{label}</p>
      <p className={cn("mt-0.5 text-[1.05rem] font-extrabold tabular-nums leading-none", hit ? "text-[var(--brand)]" : "text-[var(--ink)]")}>
        {got} <span className="text-[0.7rem] font-bold text-[var(--ink-3)]">/ {tgt}</span>
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
        <div className={cn("h-full rounded-full transition-all", hit ? "bg-[var(--brand)]" : pct >= 60 ? "bg-[var(--gold)]" : "bg-[var(--danger)]")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[0.58rem] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{label}</p>
      <p className="mt-0.5 text-[0.95rem] font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function RoleTargetsModal({ role, onClose, onSave }: { role: Role | null; onClose: () => void; onSave: (r: Role, t: { meetings: number; dropIns: number; calls: number }) => void }) {
  const settings = useAppStore((s) => s.settings);
  const current = role ? settings.targets[role] : null;
  const [form, setForm] = useState(current ?? { meetings: 0, dropIns: 0, calls: 0 });
  useMemo(() => setForm(current ?? { meetings: 0, dropIns: 0, calls: 0 }), [current]);
  if (!role || !current) return null;
  return (
    <Modal open onClose={onClose} title={`Daily targets — ${roleLabel(role)}`}>
      <div className="grid grid-cols-3 gap-3">
        {(["meetings", "dropIns", "calls"] as const).map((k) => (
          <Field key={k} label={k === "meetings" ? "Meetings" : k === "dropIns" ? "Drop-ins" : "Calls"}>
            <input type="number" min={0} max={60} className="field" value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: Math.max(0, Number(e.target.value)) }))} />
          </Field>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { onSave(role, form); onClose(); }}>Save</Button>
      </div>
    </Modal>
  );
}
