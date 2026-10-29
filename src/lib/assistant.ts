import { haversineMiles, MARKETS, optimizeOrder, routeMileage, START_POINTS } from "./geo";
import { gapAnalysis } from "./intel";
import type { Account, Activity, Product, Role, Task, User } from "./types";

/**
 * AI Sales Assistant (Section 15) — demo inference engine.
 * Deterministic, runs entirely on real application records in the workspace.
 * An LLM API provider can replace `respond()` later behind the same contract.
 *
 * Rules honored:
 *  - Answers only from stored application data (accounts, activities, tasks…).
 *  - Discloses uncertainty and demo-data caveats explicitly.
 *  - Never sends email, never mutates records directly — actionable results are
 *    presented as Review cards the user confirms.
 */

export interface AssistantCard {
  kind: "accounts" | "markets" | "reps" | "deals" | "route-preview" | "email-candidates";
  title: string;
  sub?: string;
  rows: Record<string, unknown>[];
}

export interface AssistantReply {
  text: string;
  cards: AssistantCard[];
}

interface Ctx {
  accounts: Account[];
  activities: Activity[];
  tasks: Task[];
  users: User[];
  products: Product[];
  me: User | null;
  targets: Record<Role, { meetings: number; dropIns: number; calls: number }>;
}

const CITIES = [...new Set([...MARKETS.map((m) => m.city), ...START_POINTS.map((s) => s.label.replace(" HQ", ""))])];

function findCity(t: string): string | null {
  const lower = t.toLowerCase();
  const sorted = [...CITIES].sort((a, b) => b.length - a.length);
  for (const c of sorted) if (lower.includes(c.toLowerCase())) return c;
  return null;
}

function findProduct(t: string, products: Product[]): Product | null {
  const lower = t.toLowerCase();
  for (const p of products) {
    if (p.status !== "active") continue;
    if (lower.includes(p.name.toLowerCase())) return p;
    if (p.id === "p_avira" && /\bavira|rf micro/.test(lower)) return p;
    if (p.id === "p_fraclight" && /\bipl|photofacial|fraclight/.test(lower)) return p;
    if (p.id === "p_iblaze" && /\bco2|i?blaze/.test(lower)) return p;
    if (p.id === "p_colormax" && /colormax|pico|tattoo/.test(lower)) return p;
    if (p.id === "p_retraction" && /retraction|tighten/.test(lower)) return p;
    if (p.id === "p_emulsify" && /emulsify|fat|contour/.test(lower)) return p;
    if (p.id === "p_hydrash" && /hydra/.test(lower)) return p;
  }
  return null;
}

function findSpecialty(t: string): { label: string; test: (a: Account) => boolean } | null {
  const lower = t.toLowerCase();
  const map: [RegExp, string, (a: Account) => boolean][] = [
    [/plastic/, "Plastic Surgery", (a) => /Plastic/.test(a.specialty)],
    [/dermatolog|derm\b/, "Dermatology", (a) => /Dermatolog/.test(a.specialty)],
    [/med\s?spa|medical\s?spa/, "Medical Spa", (a) => /Med(ical)? Spa/.test(a.specialty)],
    [/glp|weight\s?loss/, "Weight Loss / GLP-1", (a) => /GLP-1|Weight/.test(a.specialty)],
    [/laser/, "Laser Clinic", (a) => /Laser/.test(a.specialty)],
    [/hair/, "Hair Restoration", (a) => /Hair/.test(a.specialty)],
    [/women|ob-?gyn/, "Women's Health", (a) => /Women|OB-GYN/.test(a.specialty)],
    [/men'?s/, "Men's Health", (a) => /Men'?s/.test(a.specialty)],
    [/longevity|anti-?aging|functional/, "Longevity / Anti-aging", (a) => /Longevity|Anti-Aging|Functional/.test(a.specialty)],
  ];
  for (const [re, label, test] of map) if (re.test(lower)) return { label, test };
  return null;
}

function findNumber(t: string, fallback: number): number {
  const m = t.match(/\b(\d{1,2})\b/);
  return m ? Math.min(25, Math.max(1, parseInt(m[1], 10))) : fallback;
}

function findDays(t: string): number | null {
  const m = t.match(/\b(\d{2,3})\s*(?:\+|\s)?days?\b/);
  return m ? parseInt(m[1], 10) : null;
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function demoCaveat(ctx: Ctx): string {
  return `(Working from the ${ctx.accounts.length} accounts currently stored in this workspace — demo dataset, not live production records.)`;
}

export function greet(ctx: Ctx): AssistantReply {
  return {
    text: `I'm logged against your workspace and can reason over accounts, coverage, routes, pipeline and activity. I never send emails or change records on my own — review cards come back to you for confirmation. ${demoCaveat(ctx)}`,
    cards: [],
  };
}

export function respond(query: string, ctx: Ctx): AssistantReply {
  const t = query.toLowerCase();
  const noData: AssistantReply = {
    text: `I couldn't match that to the records available. Try asking about product potential by specialty and city, markets without visits, rep activity, routes, closing opportunities, or ask me to draft a follow-up. ${demoCaveat(ctx)}`,
    cards: [],
  };

  // ── Route building ──────────────────────────────────────────────────────
  if (/(build|plan|make|create|map)/.test(t) && /\broute\b/.test(t)) {
    const city = findCity(t) ?? "Austin";
    const start = START_POINTS.find((s) => s.label.toLowerCase().includes(city.toLowerCase()));
    let startPt = start ?? { label: city, lat: 0, lng: 0 };
    if (!start) {
      const m = MARKETS.find((x) => x.city.toLowerCase() === city.toLowerCase());
      if (m) startPt = { label: m.city, lat: m.lat, lng: m.lng };
    }
    if (!startPt.lat) return { text: `I couldn't locate "${city}" as a start point. Try a TX/OK market like Austin, Dallas, Houston, Georgetown, or Oklahoma City.`, cards: [] };

    const n = findNumber(t, 10);
    const date = /tomorrow/.test(t) ? tomorrowStr() : tomorrowStr();
    const meetingStops = ctx.tasks.filter(
      (x) =>
        !x.done &&
        (x.userId === ctx.me?.id || !ctx.me) &&
        ["meeting", "demo"].includes(x.type) &&
        new Date(x.dueAt).toDateString() === new Date(date + "T12:00:00").toDateString()
    );
    const anchors: Account[] = meetingStops
      .map((x) => ctx.accounts.find((a) => a.id === x.accountId))
      .filter((a): a is Account => !!a);

    const propPool = ctx.accounts
      .filter((a) => !["won", "lost"].includes(a.stage) && !anchors.some((an) => an.id === a.id))
      .filter((a) => haversineMiles(startPt.lat, startPt.lng, a.lat, a.lng) <= 160)
      .map((a) => {
        const neverVisited = !a.lastVisitAt;
        const dist = haversineMiles(startPt.lat, startPt.lng, a.lat, a.lng);
        const score = (a.priority === "A" ? 6 : a.priority === "B" ? 3 : 1) + (neverVisited ? 2 : 0) + Math.max(0, 160 - dist) / 40;
        return { a, score, dist };
      })
      .sort((x, y) => y.score - x.score)
      .slice(0, n)
      .map((x) => x.a);

    const allStops = [...anchors, ...propPool];
    const order = optimizeOrder(startPt.lat, startPt.lng, allStops.map((a) => ({ id: a.id, lat: a.lat, lng: a.lng })));
    const ordered = order.map((id) => allStops.find((a) => a.id === id)!).filter(Boolean);
    const mileage = routeMileage(startPt.lat, startPt.lng, ordered.map((a) => ({ lat: a.lat, lng: a.lng })));

    return {
      text: `Drafted a field-day plan from ${startPt.label} with ${anchors.length} scheduled anchor meeting${anchors.length === 1 ? "" : "s"} and ${propPool.length} nearby high-priority prospects, ordered for drive efficiency (≈${mileage} road miles). Review the stops and confirm to save — I haven't created anything yet.`,
      cards: [
        {
          kind: "route-preview",
          title: `Proposed route — ${date}`,
          sub: `${startPt.label} start · ${ordered.length} stops · ≈${mileage} mi`,
          rows: ordered.map((a, i) => ({
            n: i + 1,
            accountId: a.id,
            name: a.name,
            city: `${a.city}, ${a.state}`,
            anchor: anchors.some((an) => an.id === a.id),
            priority: a.priority,
            date,
            startLabel: startPt.label,
            startLat: startPt.lat,
            startLng: startPt.lng,
            lat: a.lat,
            lng: a.lng,
            mileage,
          })),
        },
      ],
    };
  }

  // ── Email drafting request ──────────────────────────────────────────────
  if (/(draft|write|compose|prepare)/.test(t) && /(email|follow.?up)/.test(t)) {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const y0 = dayStart.getTime() - 86_400_000;
    const recent = ctx.activities.filter(
      (a) => a.userId === (ctx.me?.id ?? a.userId) && ["visit", "demo", "meeting"].includes(a.type) && a.at >= y0 && a.at <= dayStart.getTime() + 86_400_000
    );
    const candidates = [...new Map(recent.map((a) => [a.accountId, a])).values()]
      .map((a) => ctx.accounts.find((x) => x.id === a.accountId))
      .filter((a): a is Account => !!a)
      .slice(0, 4);
    if (candidates.length === 0) {
      return {
        text: `I checked recent logged field visits and didn't find any in the last two days. When you dictate or log a visit, I can draft the follow-up from it. ${demoCaveat(ctx)}`,
        cards: [],
      };
    }
    return {
      text: `I found ${candidates.length} recent visit${candidates.length === 1 ? "" : "s"}. Pick one and I'll open a follow-up draft in the Email Concierge — you'll review and approve before anything is recorded as sent.`,
      cards: [
        {
          kind: "email-candidates",
          title: "Recent visits",
          rows: candidates.map((a) => ({
            accountId: a.id,
            name: a.name,
            city: `${a.city}, ${a.state}`,
            contact: a.decisionMakers[0]?.name ?? "Primary contact",
            contactEmail: "",
          })),
        },
      ],
    };
  }

  // ── Market coverage question ────────────────────────────────────────────
  if (/(market|cities|city|territor|coverage)/.test(t) && /(visit|cover|neglect|overdue|haven|no field)/.test(t)) {
    const days = findDays(t) ?? 90;
    const rows = MARKETS.map((m) => {
      const accts = ctx.accounts.filter((a) => a.city === m.city && a.state === m.state);
      if (accts.length === 0) return { market: `${m.city}, ${m.state}`, days: null as number | null, accounts: 0, pipeline: 0 };
      const visits = accts.map((a) => a.lastVisitAt).filter((x): x is number => x !== null);
      const last = visits.length ? Math.max(...visits) : null;
      return {
        market: `${m.city}, ${m.state}`,
        days: last ? Math.floor((Date.now() - last) / 86_400_000) : null,
        accounts: accts.length,
        pipeline: accts.reduce((s, a) => s + a.opportunity, 0),
      };
    })
      .filter((r) => r.accounts === 0 ? false : r.days === null || r.days >= days)
      .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999));
    return {
      text: rows.length
        ? `${rows.length} market${rows.length === 1 ? "" : "s"} meet that bar (no verified field visit in ${days}+ days, or never visited). Remember: visits are counted per account, so a market counts as covered only by its freshest logged visit.`
        : `No markets are beyond ${days} days right now — coverage looks current. Try raising the threshold or asking about a specific rep.`,
      cards: rows.length
        ? [{ kind: "markets", title: `Markets ≥ ${days}d without a visit`, rows }]
        : [],
    };
  }

  // ── Reps behind ─────────────────────────────────────────────────────────
  if (/(rep|salesper|team|who)/.test(t) && /(behind|meetings|quota|target|performance|under)/.test(t)) {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
    const t0 = weekStart.getTime();
    const rows = ctx.users
      .filter((u) => u.active && u.role !== "ADMIN")
      .map((u) => {
        const acts = ctx.activities.filter((a) => a.userId === u.id && a.at >= t0);
        const meetings = acts.filter((a) => a.type === "meeting" || a.type === "demo").length;
        const tgt = ctx.targets[u.role as Role] ?? { meetings: 0, dropIns: 0, calls: 0 };
        const behind = tgt.meetings > 0 && meetings < tgt.meetings;
        return { name: u.name, role: u.role, meetings, target: tgt.meetings, calls: acts.filter((a) => a.type === "call").length, visits: acts.filter((a) => a.type === "visit").length, behind };
      });
    const behind = rows.filter((r) => r.behind);
    return {
      text: behind.length
        ? `${behind.length} rep${behind.length === 1 ? " is" : "s are"} behind the weekly meetings target (role-configured). This measures logged activity only.`
        : `Everyone is currently meeting the weekly meetings target. The Scorecards page has the full picture.`,
      cards: rows.length ? [{ kind: "reps", title: "Meetings this week vs target", rows }] : [],
    };
  }

  // ── Closing this quarter ────────────────────────────────────────────────
  if (/(close|closing|forecast)/.test(t) && /(quarter|month|q[1-4])/.test(t)) {
    const now = new Date();
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).getTime();
    const qEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1).getTime();
    const rows = ctx.accounts
      .filter((a) => !["won", "lost"].includes(a.stage) && a.expectedCloseAt && a.expectedCloseAt >= qStart && a.expectedCloseAt < qEnd)
      .sort((a, b) => (a.expectedCloseAt ?? 0) - (b.expectedCloseAt ?? 0));
    const weighted = rows.reduce((s, a) => s + (a.opportunity * (a.probability ?? 10)) / 100, 0);
    return {
      text: rows.length
        ? `${rows.length} open opportunit${rows.length === 1 ? "y expects" : "ies expect"} to close this quarter — worth $${Math.round(weighted / 1000)}K probability-weighted. These are simulated demo values, not company financials.`
        : `No opportunities carry an expected close date inside this quarter — add close dates on the Opportunities tab o                                                                              f Pipeline.`,
      cards: rows.length
        ? [
            {
              kind: "deals",
              title: "Expected to close this quarter",
              rows: rows.map((a) => ({
                accountId: a.id,
                name: a.name,
                stage: a.stage,
                close: a.expectedCloseAt,
                value: a.opportunity,
                prob: a.probability ?? 10,
              })),
            },
          ]
        : [],
    };
  }

  // ── Product potential / specialty accounts ─────────────────────────────
  const product = findProduct(t, ctx.products);
  const specialty = findSpecialty(t);
  const city = findCity(t);

  // Disclose out-of-scope specialties instead of guessing
  if (/dental|dentist|orthodon|chiropract|veterinar|pediatr|podiatr/i.test(t)) {
    return {
      text: `That specialty is outside this workspace's tracked market (medical aesthetics practices — med spas, plastic surgery, dermatology, weight-loss/GLP-1, laser, hair restoration, wellness). I won't guess with unrelated data. ${demoCaveat(ctx)}`,
      cards: [],
    };
  }

  // Disclose unknown geography: "in Boise", "around Phoenix", etc.
  const locM = t.match(/\b(?:in|near|around)\s+([a-z][a-z .]+?)(?:[?.,]|$|\bshould\b|\bhave\b|\bwith\b|\band\b|\bfor\b|\bthat\b)/i);
  if (locM && !city) {
    const phrase = locM[1].trim();
    const generic = /^(texas|oklahoma|tx|ok|my territory|the region|there|here|general)$/.test(phrase);
    if (!generic && phrase.length >= 3 && phrase.length <= 24) {
      return {
        text: `I don't have any accounts in "${phrase}" in this workspace — I cover Texas & Oklahoma markets in this demo. Rather than invent data, use Prospect Radar to research that market first. ${demoCaveat(ctx)}`,
        cards: [],
      };
    }
  }

  if (product || specialty || city || /(accounts|prospects|hot accounts|potential)/.test(t)) {
    const n = findNumber(t, product ? 20 : 8);
    let rows = [...ctx.accounts];
    if (specialty) rows = rows.filter(specialty.test);
    if (city) rows = rows.filter((a) => a.city.toLowerCase() === city.toLowerCase());
    const cityPart = city ? `in ${city}` : "";
    if (product) {
      const scored = rows.map((a) => {
        const opp = gapAnalysis(a, ctx.products).find((o) => o.product.id === product.id);
        const score =
          (opp ? opp.relevance * 2 + (opp.signal === "gap" ? 3 : opp.signal === "replacement" ? 2 : 1) : 0) +
          (a.priority === "A" ? 3 : a.priority === "B" ? 1.5 : 0) +
          (["meeting", "demo", "proposal", "negotiation"].includes(a.stage) ? 1.5 : 0);
        return { a, opp, score };
      });
      rows = scored.filter((s) => s.score > 0).sort((x, y) => y.score - x.score).slice(0, n).map((s) => s.a);
    } else {
      rows = rows
        .filter((a) => !["won", "lost"].includes(a.stage))
        .sort((a, b) => (a.priority === "A" ? 0 : a.priority === "B" ? 1 : 2) - (b.priority === "A" ? 0 : b.priority === "B" ? 1 : 2))
        .slice(0, n);
    }
    if (rows.length === 0) {
      return {
        text: `I don't have matching records — no ${specialty?.label ?? "accounts"}${city ? ` in ${city}` : ""}${product ? ` for ${product.name}` : ""} in this workspace. The Prospect Radar is how new markets get researched and added. ${demoCaveat(ctx)}`,
        cards: [],
      };
    }
    return {
      text: `Top ${Math.min(n, rows.length)} ${specialty ? specialty.label.toLowerCase() : "accounts"}${city ? ` in ${city}` : ""}${product ? ` ranked by ${product.name} potential` : ""}. Scores use advertised services, identified equipment, priority and deal warmth — opportunity language is a hypothesis until verified in person.`,
      cards: [
        {
          kind: "accounts",
          title: product ? `${product.name} potential ranking` : "Account shortlist",
          rows: rows.map((a) => ({
            accountId: a.id,
            name: a.name,
            city: `${a.city}, ${a.state}`,
            specialty: a.specialty,
            priority: a.priority,
            stage: a.stage,
            opportunity: a.opportunity,
            services: a.services.slice(0, 3),
          })),
        },
      ],
    };
  }

  // ── Never contacted ─────────────────────────────────────────────────────
  if (/(never|not yet)/.test(t) && /(contact|touch|call|visit)/.test(t)) {
    const rows = ctx.accounts.filter((a) => !a.lastContactAt && !["won", "lost"].includes(a.stage)).slice(0, 15);
    return {
      text: `${rows.length} accounts have never had any logged contact in the workspace. They're queued in Prospect Radar's uncontacted lane too.`,
      cards: rows.length
        ? [{ kind: "accounts", title: "Never contacted", rows: rows.map((a) => ({ accountId: a.id, name: a.name, city: `${a.city}, ${a.state}`, specialty: a.specialty, priority: a.priority, opportunity: a.opportunity })) }]
        : [],
    };
  }

  return noData;
}

export const QUICK_PROMPTS = [
  "Which 10 plastic surgery practices in Houston have the strongest potential for Avira RF?",
  "Show me markets that haven't received a field visit in 90 days.",
  "Build me a route for tomorrow starting in Georgetown with my scheduled meetings and nearby high-priority prospects.",
  "Which reps are behind on meetings this week?",
  "Draft a follow-up email for the doctor I met yesterday.",
  "Show me all opportunities expected to close this quarter.",
];
