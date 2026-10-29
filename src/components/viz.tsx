"use client";

import { motion } from "framer-motion";
import { fmtMoney, STAGES } from "@/lib/utils";
import type { Account, Stage } from "@/lib/types";

/* ─── Pipeline value by stage ───────────────────────────────────────── */
export function StageBars({ accounts }: { accounts: Account[] }) {
  const data = STAGES.slice(0, 6).map((s) => {
    const rows = accounts.filter((a) => a.stage === s.id);
    return { ...s, count: rows.length, value: rows.reduce((x, a) => x + a.opportunity, 0) };
  });
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3.5 px-5 pb-5">
      {data.map((d, i) => (
        <div key={d.id}>
          <div className="flex items-baseline justify-between text-[0.78rem]">
            <span className="font-bold text-[var(--ink-2)]">{d.label}</span>
            <span className="font-semibold tabular-nums text-[var(--ink)]">
              {fmtMoney(d.value)} <span className="ml-1 text-[var(--ink-3)]">· {d.count}</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--line-2)]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: d.bar }}
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.9, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Specialty mix donut ───────────────────────────────────────────── */
const DONUT_COLORS = ["#0C6B4F", "#27698F", "#C29A5B", "#6B4FA1", "#B4541E", "#8A2E5F", "#2E8A6A", "#8DA398"];

export function SpecialtyDonut({ accounts }: { accounts: Account[] }) {
  const counts = new Map<string, number>();
  for (const a of accounts) {
    const key =
      a.specialty.includes("Med Spa") ? "Med Spa" :
      a.specialty.includes("Dermatology") ? "Dermatology" :
      a.specialty.includes("Plastic") ? "Plastic Surgery" :
      a.specialty.includes("GLP-1") || a.specialty.includes("Weight") ? "Weight Loss / GLP-1" :
      a.specialty.includes("Laser") ? "Laser Clinic" :
      a.specialty.includes("Hair") ? "Hair Restoration" :
      "Wellness & Other";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const R = 56;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex items-center gap-6 px-5 pb-5">
      <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--line-2)" strokeWidth="22" />
        {entries.map(([label, v], i) => {
          const frac = v / total;
          const dash = frac * C;
          const el = (
            <motion.circle
              key={label}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="22"
              initial={{ strokeDasharray: `0 ${C}`, strokeDashoffset: -offset }}
              animate={{ strokeDasharray: `${dash} ${C - dash}`, strokeDashoffset: -offset }}
              transition={{ duration: 0.8, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
            />
          );
          offset += dash;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" transform="rotate(90 70 70)" className="font-display" fontSize="26" fontWeight="600" fill="var(--ink)">
          {total}
        </text>
        <text x="70" y="84" textAnchor="middle" transform="rotate(90 70 70)" fontSize="9" fontWeight="800" letterSpacing="1.5" fill="var(--ink-3)">
          ACCOUNTS
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2">
        {entries.map(([label, v], i) => (
          <li key={label} className="flex items-center gap-2.5 text-[0.8rem]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="flex-1 truncate font-semibold text-[var(--ink-2)]">{label}</span>
            <span className="font-bold tabular-nums text-[var(--ink)]">{v}</span>
            <span className="w-9 text-right text-[0.72rem] tabular-nums text-[var(--ink-3)]">{Math.round((v / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Mini funnel strip ─────────────────────────────────────────────── */
export function StageStepper({ stage, onPick }: { stage: Stage; onPick?: (s: Stage) => void }) {
  const active = STAGES.findIndex((s) => s.id === stage);
  const closed = stage === "won" || stage === "lost";
  const steps: Stage[] = ["prospect", "contacted", "meeting", "demo", "proposal", "negotiation"];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((s) => {
        const m = STAGES.find((x) => x.id === s)!;
        const idx = steps.indexOf(s);
        const done = closed ? true : idx < active;
        const current = !closed && idx === active;
        return (
          <button
            key={s}
            onClick={() => onPick?.(s)}
            disabled={!onPick}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold transition-all ${
              current
                ? "text-white shadow-sm"
                : done
                  ? "bg-[var(--brand-soft)] text-[var(--brand-deep)] hover:bg-[#d8e9e0]"
                  : "bg-[var(--surface-2)] text-[var(--ink-3)] hover:bg-[var(--line-2)]"
            }`}
            style={current ? { background: m.color } : undefined}
          >
            {m.short}
          </button>
        );
      })}
      {closed && (
        <span
          className="ml-1 rounded-full px-2.5 py-1 text-[0.68rem] font-bold text-white"
          style={{ background: stage === "won" ? "#0F7A36" : "#9E3B2B" }}
        >
          {stage === "won" ? "Won" : "Lost"}
        </span>
      )}
    </div>
  );
}
