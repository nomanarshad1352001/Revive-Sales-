"use client";

import { RotateCcw, Settings2 } from "lucide-react";
import { useState } from "react";
import { Avatar, Button, Card, CardHeader, Field } from "@/components/ui";
import { roleLabel, useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

export default function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateTargets = useAppStore((s) => s.updateTargets);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const canManage = me?.role === "ADMIN" || me?.role === "RSM";
  const [confirmReset, setConfirmReset] = useState(false);

  const rs = settings.reports;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Settings</p>
        <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">Workspace Settings</h1>
        <p className="mt-1 text-[0.88rem] text-[var(--ink-2)]">
          Runtime behavior a manager can tune without calling a developer — thresholds, targets, and report schedule.
        </p>
      </div>

      {/* Profile */}
      {me && (
        <Card>
          <div className="flex flex-wrap items-center gap-4 p-5">
            <Avatar name={me.name} color={me.color} size={52} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[1.1rem] font-semibold">{me.name}</p>
              <p className="text-[0.8rem] font-semibold text-[var(--ink-2)]">{me.title}</p>
              <p className="mt-0.5 text-[0.72rem] font-bold text-[var(--brand)]">{me.territory}</p>
            </div>
            <div className="text-right text-[0.78rem] font-semibold text-[var(--ink-2)]">
              <p>{me.email}</p>
              <p>{me.phone}</p>
              <p className="mt-1 uppercase tracking-wide text-[0.66rem] text-[var(--ink-3)]">{roleLabel(me.role)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Config */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Coverage & Reporting" sub={canManage ? "Editable" : "Managed by RSM/Admin"} action={<Settings2 size={16} className="text-[var(--ink-3)]" />} />
          <div className="space-y-4 px-5 pb-5">
            <div>
              <p className="mb-2 text-[0.72rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">Overdue threshold (days without a logged visit)</p>
              <div className="flex gap-2">
                {[30, 60, 90, 120].map((d) => (
                  <button
                    key={d}
                    disabled={!canManage}
                    onClick={() => updateSettings({ coverageThresholdDays: d })}
                    className={cn("flex-1 rounded-xl py-2.5 text-[0.84rem] font-extrabold transition-all", settings.coverageThresholdDays === d ? "bg-[var(--brand)] text-white" : "bg-[var(--surface-2)] text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)] disabled:opacity-60")}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Daily digest time">
                <input type="time" className="field" disabled={!canManage} value={rs.dailyTime} onChange={(e) => updateSettings({ reports: { ...rs, dailyTime: e.target.value } })} />
              </Field>
              <Field label="Weekly review day">
                <select className="field" disabled={!canManage} value={rs.weeklyDay} onChange={(e) => updateSettings({ reports: { ...rs, weeklyDay: Number(e.target.value) } })}>
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Time zone">
                <select className="field" disabled={!canManage} value={rs.timezone} onChange={(e) => updateSettings({ reports: { ...rs, timezone: e.target.value } })}>
                  {["America/Chicago", "America/New_York", "America/Denver", "America/Los_Angeles"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Role Targets" sub="Daily activity objectives per role" />
          <div className="space-y-3 px-5 pb-5">
            {(Object.keys(settings.targets) as Role[]).filter((r) => r !== "ADMIN").map((role) => {
              const t = settings.targets[role];
              return (
                <div key={role} className="flex flex-wrap items-center gap-2.5 rounded-xl bg-[var(--surface-2)] p-3">
                  <span className="w-14 text-[0.78rem] font-extrabold">{role}</span>
                  <span className="flex-1 text-[0.68rem] font-semibold text-[var(--ink-3)]">{roleLabel(role)}</span>
                  {(["meetings", "dropIns", "calls"] as const).map((k) => (
                    <label key={k} className="flex items-center gap-1.5 text-[0.68rem] font-bold text-[var(--ink-2)]">
                      {k === "meetings" ? "Mtg" : k === "dropIns" ? "Visits" : "Calls"}
                      <input
                        type="number"
                        min={0}
                        max={60}
                        disabled={!canManage}
                        className="field !w-16 !px-2 !py-1.5 !text-[0.78rem] tabular-nums"
                        value={t[k]}
                        onChange={(e) => updateTargets(role, { ...t, [k]: Math.max(0, Number(e.target.value)) })}
                      />
                    </label>
                  ))}
                </div>
              );
            })}
            <p className="text-[0.7rem] font-semibold text-[var(--ink-3)]">Scorecards measure logged activity against these targets — planned route stops never count.</p>
          </div>
        </Card>
      </div>

      {/* Demo dataset */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--danger-soft)] text-[var(--danger)]"><RotateCcw size={17} /></span>
            <div>
              <p className="text-[0.9rem] font-bold">Reset demo dataset</p>
              <p className="text-[0.74rem] font-semibold text-[var(--ink-2)]">Restores seed accounts, users, activity and targets; clears routes, sequences and your edits.</p>
            </div>
          </div>
          {confirmReset ? (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>Keep my data</Button>
              <Button variant="danger" onClick={() => { resetDemo(); setConfirmReset(false); }}>Reset dataset</Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmReset(true)}>Reset…</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
