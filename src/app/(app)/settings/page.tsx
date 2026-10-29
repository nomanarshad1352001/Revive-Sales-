"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  Cloud,
  Database,
  GitBranch,
  KeyRound,
  Lock,
  RotateCcw,
  Server,
  Settings2,
  ShieldCheck,
  ShieldHalf,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, Button, Card, CardHeader, Chip, Field } from "@/components/ui";
import { roleLabel, useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const COSTS = [
  { item: "Hosting — Vercel", pilot: "$0–20/mo", scale: "$20–60/mo", note: "Hobby tier covers pilot; Pro for team seats & crons" },
  { item: "Database — Supabase (Postgres + PostGIS)", pilot: "$0–25/mo", scale: "$25–100/mo", note: "PostGIS included; geographic queries native" },
  { item: "Maps — Mapbox or Google Maps", pilot: "$0–40/mo", scale: "$50–300/mo", note: "Free tier covers field volumes; grows with tile loads & geocoding" },
  { item: "AI API — Claude (server-side)", pilot: "$15–60/mo", scale: "$100–400/mo", note: "Per-rep extraction, briefs, assistant; your personal Claude plan is not used by the app" },
  { item: "Voice transcription", pilot: "$0–15/mo", scale: "$30–100/mo", note: "Web Speech free in-browser; Whisper/Deepgram for production accuracy" },
  { item: "Email — Microsoft Graph", pilot: "$0", scale: "$0", note: "Included with existing Microsoft 365; needs IT app registration" },
  { item: "Prospect data enrichment", pilot: "$0", scale: "$50–150/mo", note: "Optional Places API / licensed directories; free sources cover pilot" },
];

const STACK = [
  { label: "Frontend", value: "Next.js 16 · React 19 · TypeScript", icon: GitBranch },
  { label: "Styling", value: "Tailwind CSS 4 + design-system primitives", icon: BadgeCheck },
  { label: "Backend/DB (production)", value: "Supabase Postgres + PostGIS", icon: Database },
  { label: "Auth (production)", value: "Supabase Auth / RBAC policies", icon: Lock },
  { label: "Email", value: "Microsoft Graph API (IT-approved)", icon: Server },
  { label: "Maps", value: "Mapbox GL / Google Maps Platform", icon: Cloud },
  { label: "AI", value: "Server-side Claude API routes", icon: KeyRound },
  { label: "Dev & repo", value: "Claude Code + GitHub + review & CI", icon: GitBranch },
];

const SECURITY = [
  "Authentication foundation in place (demo-grade local auth here; Supabase Auth in production)",
  "Role-based access control across RSM / ASM / TM / ADMIN views & actions",
  "No API keys or secrets in frontend code — none exist in this build by design",
  "Server-side secret storage pattern ready via environment variables only",
  "Audit logging for email, syncs, and sequence stop conditions",
  "Input validation on all add/edit forms (accounts, contacts, products, targets)",
  "CSV export paths for backup & recovery in the demo build; Supabase PITR/backups in production",
  "Test and production datasets fully separated (demo data is clearly labeled)",
];

const MILESTONES = [
  { id: "M1", name: "Project foundation", items: "Structure, navigation, design system, auth foundation, preview environment" },
  { id: "M2", name: "Core sales application", items: "Dashboard, accounts, contacts, sample data, search/filters, visit logging, activity tracking" },
  { id: "M3", name: "Territory & routing", items: "Market records, Coverage Radar with days-since-visit math, map, assignment, route builder + saving" },
  { id: "M4", name: "AI workflows", items: "Prospect radar architecture, portfolio gap intel, pre-call briefs, voice-note extraction, email drafting" },
  { id: "M5", name: "Integration preparation", items: "Nuvue assessment (no public API found → CSV bridge + documented path), Outlook/Graph assessment, simulated connectors" },
  { id: "M6", name: "Management & handoff", items: "Pipeline & forecast views, scorecards, reports, settings & product library, demo dataset reset" },
];

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
        <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">System Settings &amp; Delivery Notes</h1>
        <p className="mt-1 text-[0.88rem] text-[var(--ink-2)]">Runtime-configurable behavior, architecture, costs, security posture, and delivery milestones — no code changes needed by managers.</p>
      </div>

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
          <CardHeader title="Role Targets" sub="Daily activity objectives per role" action={<ShieldHalf size={16} className="text-[var(--ink-3)]" />} />
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
          </div>
        </Card>
      </div>

      {/* Danger zone demo reset */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--danger-soft)] text-[var(--danger)]"><RotateCcw size={17} /></span>
            <div>
              <p className="text-[0.9rem] font-bold">Reset demo dataset</p>
              <p className="text-[0.74rem] font-semibold text-[var(--ink-2)]">Restores all 54 seed accounts, users, activities, targets and clears routes/sequences you've created.</p>
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

      {/* Architecture (Section 17) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Production Architecture" sub="Section 17 — maintainable, not over-engineered" action={<Server size={16} className="text-[var(--ink-3)]" />} />
          <ul className="space-y-2 px-5 pb-5">
            {STACK.map((s) => (
              <li key={s.label} className="flex items-center gap-3 rounded-xl bg-[var(--surface-2)] px-3.5 py-2.5">
                <s.icon size={15} className="shrink-0 text-[var(--brand)]" />
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">{s.label}</p>
                  <p className="truncate text-[0.82rem] font-bold">{s.value}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Estimated Ongoing Costs" sub="Pilot → scaled (per month, 5–8 reps)" action={<Wallet size={16} className="text-[var(--ink-3)]" />} />
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[430px] text-left">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  <th className="py-2 pr-3 text-[0.64rem] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Service</th>
                  <th className="py-2 pr-3 text-[0.64rem] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Pilot</th>
                  <th className="py-2 pr-3 text-[0.64rem] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Scaled</th>
                  <th className="py-2 text-[0.64rem] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">Notes</th>
                </tr>
              </thead>
              <tbody>
                {COSTS.map((c) => (
                  <tr key={c.item} className="border-b border-[var(--line-2)] last:border-none">
                    <td className="py-2.5 pr-3 text-[0.76rem] font-bold">{c.item}</td>
                    <td className="py-2.5 pr-3 text-[0.78rem] font-extrabold tabular-nums text-[var(--brand-deep)]">{c.pilot}</td>
                    <td className="py-2.5 pr-3 text-[0.78rem] font-extrabold tabular-nums">{c.scale}</td>
                    <td className="py-2.5 text-[0.68rem] font-semibold leading-snug text-[var(--ink-3)]">{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 rounded-xl bg-[var(--brand-softer)] px-4 py-3 text-[0.76rem] font-semibold text-[var(--brand-deep)]">
              Typical pilot burn: <span className="font-extrabold">$25–150/month</span>. No unnecessary subscriptions — free tiers cover pilot volume; Microsoft Graph rides the existing M365 subscription.
            </div>
          </div>
        </Card>
      </div>

      {/* Security (Section 18) */}
      <Card>
        <CardHeader title="Security & Company Data Posture" sub="Section 18 — safeguards mapped to this build and production" action={<ShieldCheck size={16} className="text-[var(--brand)]" />} />
        <div className="grid grid-cols-1 gap-2 px-5 pb-5 md:grid-cols-2">
          {SECURITY.map((s) => (
            <div key={s} className="flex items-start gap-2.5 rounded-xl bg-[var(--surface-2)] px-3.5 py-2.5 text-[0.78rem] font-semibold leading-snug text-[var(--ink-2)]">
              <Lock size={12} className="mt-0.5 shrink-0 text-[var(--brand)]" /> {s}
            </div>
          ))}
        </div>
        <p className="px-5 pb-5 text-[0.72rem] leading-relaxed text-[var(--ink-3)]">
          This prototype uses fictional practice records by design. Production deployment with real CRM data, accounts, or credentials requires explicit company authorization — no personal passwords are ever requested by this application.
        </p>
      </Card>

      {/* Milestones (Section 19) */}
      <Card>
        <CardHeader title="Delivery Milestones — Functional First Release" sub="Everything delivered in this build, tested end-to-end" action={<BadgeCheck size={16} className="text-[var(--brand)]" />} />
        <div className="grid grid-cols-1 gap-2.5 px-5 pb-5 md:grid-cols-2 xl:grid-cols-3">
          {MILESTONES.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center justify-between">
                <p className="font-display text-[0.95rem] font-semibold">{m.id} · {m.name}</p>
                <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[0.6rem] font-extrabold uppercase text-[var(--brand-deep)]">Delivered</span>
              </div>
              <p className="mt-1.5 text-[0.72rem] leading-relaxed text-[var(--ink-2)]">{m.items}</p>
            </motion.div>
          ))}
        </div>
        <p className="px-5 pb-5 text-[0.72rem] leading-relaxed text-[var(--ink-3)]">
          Next-phase add-ons (priced separately): live Supabase data layer, Nuvue API sync when credentials are issued, Microsoft Graph live sending after IT consent, LLM API behind the assistant, and full iOS-native field app.
        </p>
      </Card>
    </div>
  );
}
