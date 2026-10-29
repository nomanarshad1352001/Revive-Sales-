"use client";

import { motion } from "framer-motion";
import { ArrowRight, CircleOff, Compass, Crosshair, DollarSign, Globe, PhoneOff, Plus, Radar, SearchCheck, Sparkles, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AccountModal, LogActivityModal } from "@/components/forms";
import { Avatar, Button, Card, CardHeader, Chip, PriorityBadge, StageBadge, StatCard } from "@/components/ui";
import { MARKETS } from "@/lib/geo";
import { gapAnalysis } from "@/lib/intel";
import { useAppStore } from "@/lib/store";
import { cn, fmtMoney, relTime } from "@/lib/utils";

export default function RadarPage() {
  const router = useRouter();
  const accounts = useAppStore((s) => s.accounts);
  const products = useAppStore((s) => s.products);
  const users = useAppStore((s) => s.users);
  const settings = useAppStore((s) => s.settings);

  const [addOpen, setAddOpen] = useState(false);
  const [prefs, setPrefs] = useState<{ city?: string; state?: "TX" | "OK" }>({});
  const [logAccountId, setLogAccountId] = useState<string | null>(null);

  const prospects = useMemo(() => accounts.filter((a) => !["won", "lost"].includes(a.stage)), [accounts]);
  const unknowns = useMemo(() => {
    const counted = new Map<string, number>();
    for (const a of accounts) counted.set(`${a.city}|${a.state}`, (counted.get(`${a.city}|${a.state}`) ?? 0) + 1);
    return MARKETS.filter((m) => !counted.get(`${m.city}|${m.state}`));
  }, [accounts]);

  const uncontacted = useMemo(
    () => prospects.filter((a) => !a.lastContactAt).sort((a, b) => b.opportunity - a.opportunity),
    [prospects]
  );

  const silent = useMemo(
    () =>
      prospects
        .filter((a) => a.lastContactAt && Date.now() - a.lastContactAt > settings.coverageThresholdDays * 86_400_000)
        .sort((a, b) => b.opportunity - a.opportunity)
        .slice(0, 8),
    [prospects, settings.coverageThresholdDays]
  );

  const topOpportunities = useMemo(
    () =>
      prospects
        .map((a) => {
          const opps = gapAnalysis(a, products);
          const best = opps[0];
          const score = (best ? best.relevance + (best.signal === "gap" ? 2 : 1) : 0) + (a.priority === "A" ? 3 : a.priority === "B" ? 1.5 : 0);
          return { a, best, score };
        })
        .filter((x) => x.best)
        .sort((x, y) => y.score - x.score)
        .slice(0, 8),
    [prospects, products]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Section 4 · AI Prospect Radar</p>
          <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">Prospect Radar</h1>
          <p className="mt-1 max-w-2xl text-[0.88rem] text-[var(--ink-2)]">
            Every prospect record here is a <span className="font-bold">demo workspace record</span> added by reps — newly discovered prospects are created through the same add flow and clearly sourced. No scraping of restricted platforms.
          </p>
        </div>
        <Button onClick={() => { setPrefs({}); setAddOpen(true); }}>
          <Plus size={16} /> Add prospect
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Prospects in play" value={prospects.length} icon={<Radar size={19} />} delta="Open accounts, not won/lost" deltaTone="up" />
        <StatCard label="Never contacted" value={uncontacted.length} icon={<PhoneOff size={19} />} delta="Zero logged touch" deltaTone={uncontacted.length ? "warn" : "up"} delay={0.06} />
        <StatCard label="Silent beyond threshold" value={silent.length} icon={<CircleOff size={19} />} delta={`>${settings.coverageThresholdDays}d without contact`} deltaTone="down" delay={0.12} />
        <StatCard label="Unexplored markets" value={unknowns.length} icon={<Globe size={19} />} delta="Target markets with zero accounts" deltaTone="warn" delay={0.18} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* AI opportunity radar */}
        <Card className="xl:col-span-2">
          <CardHeader title="Highest-Potential Radar" sub="Accounts scored by product-fit × priority — ranked hypotheses" action={<Sparkles size={16} className="text-[var(--gold)]" />} />
          <div className="space-y-1.5 px-3 pb-4">
            {topOpportunities.map(({ a, best, score }, i) => (
              <motion.button
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => router.push(`/accounts/${a.id}`)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--brand-softer)]"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--ink)] text-[0.68rem] font-extrabold text-white">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.85rem] font-bold">{a.name}</span>
                  <span className="block truncate text-[0.7rem] font-semibold text-[var(--ink-2)]">
                    {a.city}, {a.state} · {a.specialty} · fit: <span className="text-[var(--brand-deep)]">{best!.product.name}</span> ({SIGNAL_SHORT[best!.signal]})
                  </span>
                </span>
                <PriorityBadge priority={a.priority} size="sm" />
                <span className="w-14 text-right text-[0.8rem] font-extrabold tabular-nums">{fmtMoney(a.opportunity)}</span>
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--line-2)]">
                  <span className="block h-full rounded-full bg-[var(--gold)]" style={{ width: `${Math.min(100, score * 12)}%` }} />
                </span>
              </motion.button>
            ))}
          </div>
        </Card>

        {/* Uncontacted lane */}
        <Card>
          <CardHeader title="First-Touch Queue" sub="No logged contact yet" />
          <div className="space-y-1.5 px-3 pb-4">
            {uncontacted.length === 0 && <p className="px-2 pb-3 text-[0.82rem] font-semibold text-[var(--brand)]">Every prospect has been touched. Strong coverage.</p>}
            {uncontacted.slice(0, 7).map((a) => (
              <div key={a.id} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-[var(--surface-2)]">
                <Avatar name={a.name} size={30} color={users.find((u) => u.id === a.ownerId)?.color} />
                <div className="min-w-0 flex-1">
                  <button onClick={() => router.push(`/accounts/${a.id}`)} className="block truncate text-[0.84rem] font-bold hover:text-[var(--brand)]">{a.name}</button>
                  <p className="text-[0.68rem] font-semibold text-[var(--ink-2)]">{a.city}, {a.state} · {a.specialty}</p>
                </div>
                <button
                  onClick={() => setLogAccountId(a.id)}
                  className="rounded-lg bg-[var(--brand)] px-2.5 py-1.5 text-[0.66rem] font-extrabold text-white hover:bg-[var(--brand-deep)]"
                >
                  Log first touch
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Coverage sweep + silent */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Unexplored Markets"
            sub={`${unknowns.length} target markets have zero accounts — start a research sweep`}
            action={<Crosshair size={16} className="text-[var(--ink-3)]" />}
          />
          <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2">
            {unknowns.slice(0, 10).map((m) => (
              <div key={`${m.city}|${m.state}`} className="flex items-center gap-2.5 rounded-xl border border-dashed border-[var(--line)] px-3 py-2.5">
                <Compass size={14} className="shrink-0 text-[var(--ink-3)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.82rem] font-bold">{m.city}, {m.state}</p>
                  <p className="text-[0.66rem] font-semibold text-[var(--ink-3)]">0 accounts · research sweep candidate</p>
                </div>
                <button
                  onClick={() => { setPrefs({ city: m.city, state: m.state }); setAddOpen(true); }}
                  className="rounded-lg bg-[var(--surface-2)] px-2 py-1.5 text-[0.66rem] font-extrabold text-[var(--brand-deep)] ring-1 ring-inset ring-[var(--line)] hover:bg-[var(--brand-softer)]"
                >
                  + Seed prospect
                </button>
              </div>
            ))}
          </div>
          <p className="px-5 pb-4 text-[0.68rem] leading-relaxed text-[var(--ink-3)]">
            Prospects created here are demo workspace records. Production discovery uses authorized sources only: practice websites, state licensing registries, professional directories (ASPS/AAD members), and opt-in business listings.
          </p>
        </Card>

        <Card>
          <CardHeader title="Silent but Valuable" sub={`Past the ${settings.coverageThresholdDays}-day contact threshold`} action={<TrendingUp size={16} className="text-[var(--ink-3)]" />} />
          <div className="space-y-1.5 px-3 pb-4">
            {silent.map((a) => (
              <button key={a.id} onClick={() => router.push(`/accounts/${a.id}`)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)]">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--danger-soft)] text-[var(--danger)]"><CircleOff size={14} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.84rem] font-bold">{a.name}</span>
                  <span className="block text-[0.68rem] font-semibold text-[var(--ink-2)]">{a.city}, {a.state} · last contact {relTime(a.lastContactAt)}</span>
                </span>
                <StageBadge stage={a.stage} size="sm" />
                <span className="text-[0.78rem] font-extrabold tabular-nums">{fmtMoney(a.opportunity)}</span>
              </button>
            ))}
            {silent.length === 0 && <p className="px-2 pb-3 text-[0.82rem] font-semibold text-[var(--ink-2)]">No silent accounts at the current threshold.</p>}
          </div>
        </Card>
      </div>

      {/* Data-source compliance panel */}
      <Card>
        <CardHeader title="Prospect Data Sources — What's Authorized" sub="Cost & compliance reality for discovery" action={<SearchCheck size={16} className="text-[var(--ink-3)]" />} />
        <div className="grid grid-cols-1 gap-2.5 px-5 pb-5 md:grid-cols-3">
          {[
            {
              icon: SearchCheck,
              tone: "brand" as const,
              t: "Free & authorized (available today)",
              items: ["Practice websites & published physician bios", "State medical-board & licensing registries", "Professional directories — ASPS, AAD, ISHRS", "Public business registries & filings", "Practice-owned social pages & press releases"],
            },
            {
              icon: DollarSign,
              tone: "gold" as const,
              t: "Paid enrichment (optional, budget-gated)",
              items: ["Google Places API for structured business data", "Licensed B2B contact databases (opt-in/auto-consent)", "Practice management / specialty census data", "Est. $50–150/mo for pilot volumes"],
            },
            {
              icon: CircleOff,
              tone: "danger" as const,
              t: "Prohibited / not used",
              items: ["Google Maps scraping (violates ToS)", "LinkedIn scraping (violates ToS)", "Purchased personal-email lists without consent", "Any data source marked robots/anti-scrape"],
            },
          ].map((x) => (
            <div key={x.t} className={cn("rounded-xl p-4 ring-1 ring-inset", x.tone === "brand" && "bg-[var(--brand-softer)] ring-[#d8e9e0]", x.tone === "gold" && "bg-[var(--gold-soft)] ring-[#e6d5b5]", x.tone === "danger" && "bg-[var(--danger-soft)] ring-[#ecc9c2]")}>
              <p className="flex items-center gap-1.5 text-[0.74rem] font-extrabold uppercase tracking-wide">
                <x.icon size={13} /> {x.t}
              </p>
              <ul className="mt-2 space-y-1">
                {x.items.map((i) => (
                  <li key={i} className="text-[0.76rem] font-semibold leading-snug text-[var(--ink-2)]">· {i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <AccountModal open={addOpen} onClose={() => setAddOpen(false)} preset={prefs} />
      <LogActivityModal open={!!logAccountId} onClose={() => setLogAccountId(null)} accountId={logAccountId ?? undefined} defaultType="call" />
    </div>
  );
}

const SIGNAL_SHORT: Record<"gap" | "replacement" | "expansion", string> = {
  gap: "no comparable platform identified",
  replacement: "competing platform present",
  expansion: "adjacent growth angle",
};
