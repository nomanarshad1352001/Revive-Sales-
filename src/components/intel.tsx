"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  CircleHelp,
  Cpu,
  FlaskConical,
  Footprints,
  Printer,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";
import { Button, Card, CardHeader, Chip } from "@/components/ui";
import { buildBriefing, gapAnalysis, identifyEquipment, researchFreshness, type ProductOpportunity } from "@/lib/intel";
import { useAppStore } from "@/lib/store";
import type { Account } from "@/lib/types";
import { cn, fmtMoney } from "@/lib/utils";

export const SIGNAL_META: Record<ProductOpportunity["signal"], { label: string; cls: string }> = {
  gap: { label: "Gap — no comparable platform identified", cls: "bg-[var(--brand-soft)] text-[var(--brand-deep)] ring-[#bcd4c8]" },
  replacement: { label: "Replacement — competing platform on-site", cls: "bg-[var(--gold-soft)] text-[#8a6a33] ring-[#e6d5b5]" },
  expansion: { label: "Expansion — adjacent service growth", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
};

const CONF_CLS: Record<string, string> = {
  high: "bg-[var(--brand-soft)] text-[var(--brand-deep)]",
  medium: "bg-[var(--gold-soft)] text-[#8a6a33]",
  low: "bg-slate-100 text-slate-600",
};

/* ─── Verified-facts strip ──────────────────────────────────────────── */
export function VerifiedFacts({ account }: { account: Account }) {
  const tech = useMemo(() => identifyEquipment(account), [account]);
  const freshness = researchFreshness(account);
  const markResearched = useAppStore((s) => s.markResearched);
  return (
    <div className="rounded-xl border border-[#c8dfd4] bg-[var(--brand-softer)] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-[var(--brand-deep)]">
          <BadgeCheck size={13} /> Verified from public materials
        </p>
        <button
          onClick={() => markResearched(account.id)}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.66rem] font-bold transition-colors",
            freshness.tone === "fresh"
              ? "bg-white/70 text-[var(--brand-deep)] hover:bg-white"
              : freshness.tone === "aging"
                ? "bg-[var(--gold-soft)] text-[#8a6a33] hover:bg-[#efe2c8]"
                : "bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[#f6e0da]"
          )}
          title="Mark public research as just refreshed"
        >
          <RefreshCw size={10} /> Research {freshness.label.toLowerCase()} · {freshness.days}d
        </button>
      </div>
      <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[0.66rem] font-bold uppercase tracking-wide text-[var(--ink-3)]">Advertised treatments</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {account.services.map((s) => (
              <span key={s} className="rounded-md bg-white px-1.5 py-0.5 text-[0.68rem] font-bold text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line-2)]">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[0.66rem] font-bold uppercase tracking-wide text-[var(--ink-3)]">
            Identified technologies {tech.length > 0 && <span className="normal-case text-[var(--ink-3)]">({tech.length})</span>}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tech.length === 0 && <span className="text-[0.72rem] font-semibold text-[var(--ink-2)]">None identified in public materials</span>}
            {tech.map((t) => (
              <span key={t.match} className="rounded-md bg-white px-1.5 py-0.5 text-[0.68rem] font-bold text-[var(--brand-deep)] ring-1 ring-inset ring-[#c8dfd4]" title={t.brand}>
                <Cpu size={9} className="mr-1 inline -mt-0.5" />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[0.66rem] leading-relaxed text-[#4f7263]">
        Source: {account.source} · Confidence: {account.confidence} · These are website/listing facts, not assessments of clinical capability.
      </p>
    </div>
  );
}

/* ─── AI opportunity card ───────────────────────────────────────────── */
export function OpportunityCard({ opp, index }: { opp: ProductOpportunity; index: number }) {
  const meta = SIGNAL_META[opp.signal];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-xl border border-[#e6d5b5] bg-[#fbf7ef] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--gold)] text-white">
            <Sparkles size={12} />
          </span>
          <div>
            <p className="text-[0.88rem] font-extrabold leading-tight">{opp.product.name}</p>
            <p className="text-[0.64rem] font-bold uppercase tracking-wide text-[#9a7a45]">{opp.product.category} · {fmtMoney(opp.product.price)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[0.62rem] font-extrabold uppercase", CONF_CLS[opp.confidence])}>
            {opp.confidence} confidence
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[0.62rem] font-extrabold ring-1 ring-inset", meta.cls)}>
            {meta.label}
          </span>
        </div>
      </div>

      <p className="mt-2.5 text-[0.8rem] leading-relaxed text-[var(--ink)]">{opp.rationale}</p>

      <div className="mt-2.5 rounded-lg bg-white/70 px-3 py-2 ring-1 ring-inset ring-[#efe3c9]">
        <p className="text-[0.64rem] font-extrabold uppercase tracking-wide text-[#9a7a45]">Supporting signals</p>
        <ul className="mt-1 space-y-0.5">
          {opp.basis.map((b) => (
            <li key={b} className="text-[0.72rem] font-semibold text-[var(--ink-2)]">· {b}</li>
          ))}
        </ul>
      </div>

      <div className="mt-2 flex items-start gap-2 rounded-lg bg-[#fdf0e8] px-3 py-2">
        <AlertTriangle size={12} className="mt-0.5 shrink-0 text-[#b4541e]" />
        <p className="text-[0.7rem] leading-relaxed text-[#8a4a22]">{opp.caution}</p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <p className="flex items-center gap-1.5 text-[0.66rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">
            <CircleHelp size={11} /> Suggested discovery questions
          </p>
          <ol className="mt-1.5 space-y-1.5">
            {opp.discoveryQuestions.slice(0, 3).map((q, i) => (
              <li key={q} className="flex items-start gap-1.5 text-[0.76rem] leading-snug text-[var(--ink-2)]">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--gold)] text-[0.58rem] font-extrabold text-white">{i + 1}</span>
                {q}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[0.66rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">
            <Footprints size={11} /> Suggested next steps
          </p>
          <ol className="mt-1.5 space-y-1.5">
            {opp.nextSteps.map((s) => (
              <li key={s} className="flex items-start gap-1.5 text-[0.76rem] leading-snug text-[var(--ink-2)]">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className="mt-3 border-t border-dashed border-[#e0cfae] pt-2 text-[0.62rem] font-semibold text-[#9a7a45]">
        AI-assisted hypothesis — distinguish from verified facts. Confirm by asking before positioning.
      </p>
    </motion.div>
  );
}

/* ─── Portfolio gap section wrapper ─────────────────────────────────── */
export function PortfolioGapSection({ account }: { account: Account }) {
  const products = useAppStore((s) => s.products);
  const opps = useMemo(() => gapAnalysis(account, products), [account, products]);
  return (
    <Card>
      <CardHeader
        title="Portfolio Gap Intelligence"
        sub="Product opportunities inferred from public signals — clearly separated from verified facts"
        action={<Chip tone="gold"><FlaskConical size={11} /> {opps.length} hypotheses</Chip>}
      />
      <div className="space-y-3 px-5 pb-5">
        <VerifiedFacts account={account} />
        {opps.length === 0 && (
          <p className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[0.8rem] font-semibold text-[var(--ink-2)]">
            Not enough public signals to form a hypothesis. Capture advertised services and equipment through field research first.
          </p>
        )}
        {opps.map((o, i) => (
          <OpportunityCard key={o.product.id} opp={o} index={i} />
        ))}
      </div>
    </Card>
  );
}

/* ─── 30-second pre-call briefing ───────────────────────────────────── */
export function PreCallBrief({ account, onClose }: { account: Account; onClose: () => void }) {
  const products = useAppStore((s) => s.products);
  const latest = useAppStore((s) => s.activities.find((a) => a.accountId === account.id));
  const owner = useAppStore((s) => s.users.find((u) => u.id === account.ownerId));
  const brief = useMemo(() => buildBriefing(account, products, latest), [account, products, latest]);

  return (
    <div className="print-area">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-[0.66rem] font-extrabold uppercase tracking-[0.18em] text-[var(--brand)]">
            <Sparkles size={12} /> 30-second pre-call brief
          </p>
          <h3 className="font-display mt-1 text-2xl font-semibold leading-tight">{account.name}</h3>
          <p className="mt-0.5 text-[0.8rem] font-semibold text-[var(--ink-2)]">
            {account.city}, {account.state} · {account.specialty} · Rep: {owner?.name ?? "—"}
          </p>
        </div>
        <Button variant="secondary" className="no-print !py-2 !text-[0.75rem]" onClick={() => window.print()}>
          <Printer size={13} /> Print
        </Button>
      </div>

      <div className="mt-4 space-y-4 text-[0.85rem]">
        <section>
          <h4 className="text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">Talk to</h4>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {brief.who.length === 0 && <p className="text-[var(--ink-2)]">No contact identified — ask the front desk who owns equipment decisions.</p>}
            {brief.who.map((w) => (
              <span key={w.name} className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 font-bold ring-1 ring-inset ring-[var(--line)]">
                {w.name} <span className="font-semibold text-[var(--ink-3)]">· {w.title}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-[var(--brand-softer)] p-3.5 ring-1 ring-inset ring-[#d8e9e0]">
          <h4 className="flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-[var(--brand-deep)]">
            <BadgeCheck size={12} /> Verified public signals
          </h4>
          <p className="mt-1.5 leading-relaxed">
            Advertising: <span className="font-bold">{brief.verifiedServices.join(", ") || "—"}</span>
            {brief.verifiedTech.length > 0 && (
              <> · Running: <span className="font-bold">{brief.verifiedTech.join(", ")}</span></>
            )}
          </p>
        </section>

        <section>
          <h4 className="text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">Opening move</h4>
          <p className="mt-1.5 font-semibold leading-relaxed">{brief.openingMove}</p>
        </section>

        {brief.hypotheses.length > 0 && (
          <section className="rounded-xl bg-[#fbf7ef] p-3.5 ring-1 ring-inset ring-[#efe3c9]">
            <h4 className="flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-[#9a7a45]">
              <Sparkles size={12} /> Opportunity hypotheses (unverified)
            </h4>
            <ul className="mt-1.5 space-y-1.5">
              {brief.hypotheses.map((h) => (
                <li key={h.productName} className="leading-snug">
                  <span className="font-bold">{h.productName}:</span> <span className="text-[var(--ink-2)]">{h.line}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h4 className="text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">Ask before pitching</h4>
          <ol className="mt-1.5 space-y-1">
            {brief.ask.map((q, i) => (
              <li key={q} className="flex items-start gap-2 leading-snug">
                <span className="grid h-4.5 w-4.5 mt-0.5 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-[0.6rem] font-extrabold text-white">{i + 1}</span>
                <span className="font-semibold">{q}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-[var(--line-2)] pt-3">
          <h4 className="text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">Last touch</h4>
          <p className="mt-1 text-[0.8rem] font-semibold text-[var(--ink-2)]">{brief.lastTouch}</p>
          <p className="mt-2 flex items-start gap-1.5 text-[0.66rem] leading-relaxed text-[var(--ink-3)]">
            <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {brief.disclaimer}
          </p>
        </section>
      </div>

      <div className="no-print mt-5 flex justify-end">
        <Button onClick={onClose}>Walk in prepared</Button>
      </div>
    </div>
  );
}
