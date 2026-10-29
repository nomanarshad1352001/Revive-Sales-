import type { Account, Activity, Confidence, Product } from "./types";

/**
 * Portfolio Gap Intelligence engine.
 *
 * Distinguishes three evidence classes on every account:
 *  - VERIFIED: publicly advertised services + identified technologies with sources
 *  - INFERRED (competitive): competitor devices identified in public materials
 *  - SUGGESTED (AI): product opportunities, questions, next steps — hypotheses only
 *
 * Core rule: absence from public materials is never treated as proof of absence.
 */

// ─── Competitive equipment taxonomy ─────────────────────────────────────────
export interface EquipmentIntel {
  match: string;
  category: string;
  brand: string;
  label: string;
}

export const EQUIPMENT_MAP: EquipmentIntel[] = [
  { match: "morpheus8", category: "rf-microneedling", brand: "InMode", label: "InMode Morpheus8" },
  { match: "vivace", category: "rf-microneedling", brand: "Cartessa", label: "Vivace RF" },
  { match: "secret rf", category: "rf-microneedling", brand: "Cutera", label: "Secret RF" },
  { match: "coolsculpting", category: "fat-reduction", brand: "Allergan Aesthetics", label: "CoolSculpting" },
  { match: "trusculpt", category: "fat-reduction", brand: "Cutera", label: "truSculpt" },
  { match: "zerona", category: "fat-reduction", brand: "Erchonia", label: "Zerona" },
  { match: "emsculpt", category: "muscle-sculpting", brand: "BTL", label: "BTL Emsculpt" },
  { match: "hydrafacial", category: "hydraderm", brand: "BeautyHealth", label: "HydraFacial" },
  { match: "m22", category: "ipl", brand: "Lumenis", label: "Lumenis M22" },
  { match: "bbl", category: "ipl", brand: "Sciton", label: "Sciton BBL" },
  { match: "harmony", category: "ipl", brand: "Alma", label: "Alma Harmony" },
  { match: "ultrapulse", category: "co2", brand: "Lumenis", label: "Lumenis UltraPulse" },
  { match: "fraxel", category: "co2", brand: "Solta Medical", label: "Fraxel" },
  { match: "fotona", category: "co2", brand: "Fotona", label: "Fotona" },
  { match: "ultherapy", category: "tightening", brand: "Merz Aesthetics", label: "Ultherapy" },
  { match: "thermage", category: "tightening", brand: "Solta Medical", label: "Thermage" },
  { match: "velashape", category: "tightening", brand: "Candela", label: "VelaShape" },
  { match: "picosure", category: "pico", brand: "Cynosure", label: "Cynosure PicoSure" },
  { match: "soprano", category: "laser-hair", brand: "Alma", label: "Alma Soprano" },
  { match: "gentle", category: "laser-hair", brand: "Candela", label: "Candela GentleMax" },
  { match: "elite+", category: "laser-hair", brand: "Cynosure", label: "Cynosure Elite+" },
  { match: "neograft", category: "hair", brand: "Venus Concept", label: "NeoGraft" },
  { match: "artas", category: "hair", brand: "Venus Concept", label: "ARTAS" },
  { match: "lasemd", category: "erbium", brand: "Lutronic", label: "LaseMD Ultra" },
  { match: "gainswave", category: "shockwave", brand: "SoftWave", label: "GAINSWave" },
  { match: "inbody", category: "analytics", brand: "InBody", label: "InBody Analyzer" },
];

export function identifyEquipment(account: Account): EquipmentIntel[] {
  const found: EquipmentIntel[] = [];
  const seen = new Set<string>();
  for (const e of account.equipment) {
    const low = e.toLowerCase();
    const hit = EQUIPMENT_MAP.find((m) => low.includes(m.match));
    if (hit && !seen.has(hit.match)) {
      seen.add(hit.match);
      found.push(hit);
    }
  }
  return found;
}

// ─── Gap analysis ────────────────────────────────────────────────────────────
export type OpportunitySignal = "gap" | "replacement" | "expansion";

export interface ProductOpportunity {
  product: Product;
  confidence: Confidence;
  signal: OpportunitySignal;
  relevance: number;
  rationale: string;
  basis: string[];       // verified signals the hypothesis rests on
  caution: string;       // absence-of-evidence disclaimer
  discoveryQuestions: string[];
  nextSteps: string[];
}

function stageNextSteps(stage: Account["stage"], product: Product): string[] {
  switch (stage) {
    case "prospect":
      return [`Open with one discovery question on a walk-in or call — do not pitch pricing yet`, `Log any equipment reaction as an account note`];
    case "contacted":
      return [`Send a one-page ${product.name} overview tied to their advertised services`, `Propose a 20-minute on-site conversation`];
    case "meeting":
      return [`Leave the ${product.name} clinical economics one-pager after the meeting`, `Agree on a date for a device walk-through before you leave`];
    case "demo":
      return [`Confirm demo logistics: room, power, staff availability, and who evaluates`, `Prepare a utilization model using their appointment book volume`];
    case "proposal":
      return [`Offer trade-in or financing terms for the ${product.name} proposal`, `Set a decision date in writing`];
    case "negotiation":
      return [`Anchor final ${product.name} value on training, warranty and support — not price`, `Loop in the RSM for closing support if stalled >14 days`];
    case "won":
      return [`Coordinate install + training dates`, `Schedule a 30-day utilization review for case-study material`];
    case "lost":
      return [`Diarize a re-approach in 11–12 months aligned to competitor contract expiry`, `Note the losing reason in CRM for portfolio review`];
  }
}

export function gapAnalysis(account: Account, products: Product[]): ProductOpportunity[] {
  const haystack = [account.specialty, account.category, ...account.services, ...account.tags].join(" ").toLowerCase();
  const identified = identifyEquipment(account);
  const identifiedCats = new Set(identified.map((i) => i.category));

  const out: ProductOpportunity[] = [];
  for (const product of products) {
    if (product.status !== "active") continue; // AgeJET / TensaMax never suggested
    const hits = product.fitKeywords.filter((k) => haystack.includes(k));
    if (hits.length === 0) continue;

    const incumbents = identified.filter((i) => i.category === product.deviceCategory);
    const hasIncumbent = incumbents.length > 0;

    let signal: OpportunitySignal;
    if (hasIncumbent && hits.length >= 2) signal = "replacement";
    else if (hasIncumbent) signal = "replacement";
    else if (hits.length >= 3) signal = "gap";
    else signal = "expansion";

    const basis: string[] = [];
    if (hits.length) basis.push(`Advertised signals: ${[...new Set(hits)].slice(0, 4).join(", ")}`);
    if (hasIncumbent) basis.push(`Identified platform: ${incumbents.map((i) => i.label).join(", ")}`);
    basis.push(`Research: ${account.source}`);

    const caution = hasIncumbent
      ? `Incumbent platform presence is drawn from public materials only — confirm age, service contract status and utilization in conversation before positioning a replacement.`
      : `No ${product.category.toLowerCase()} platform appears in this practice's public materials. That is an opening to ask — not evidence the practice lacks the capability. Verify before positioning.`;

    const rationale = hasIncumbent
      ? `Practice runs ${incumbents[0].label} (${incumbents[0].brand}) in the ${product.category} category — a displacement conversation for ${product.name} if utilization or service costs disappoint.`
      : `Advertised services (${[...new Set(hits)].slice(0, 3).join(", ")}) align with ${product.name}'s ${product.category} category, with no comparable platform identified in public materials.`;

    const warm = ["meeting", "demo", "proposal", "negotiation"].includes(account.stage);
    const confidence: Confidence =
      hits.length >= 3 && (warm || account.confidence === "high") ? "high"
      : hits.length >= 2 ? "medium"
      : "low";

    out.push({
      product,
      confidence,
      signal,
      relevance: hits.length,
      rationale,
      basis,
      caution,
      discoveryQuestions: product.discoveryQuestions,
      nextSteps: stageNextSteps(account.stage, product),
    });
  }

  out.sort((a, b) => b.relevance - a.relevance || b.product.price - a.product.price);
  return out.slice(0, 4);
}

// ─── Research freshness ─────────────────────────────────────────────────────
export function researchFreshness(account: Account) {
  const days = Math.floor((Date.now() - account.researchedAt) / 86_400_000);
  if (days <= 14) return { days, label: "Fresh", tone: "fresh" as const };
  if (days <= 45) return { days, label: "Aging", tone: "aging" as const };
  return { days, label: "Stale — re-verify", tone: "stale" as const };
}

// ─── 30-second pre-call briefing ────────────────────────────────────────────
export interface Briefing {
  who: { name: string; title: string }[];
  verifiedServices: string[];
  verifiedTech: string[];
  openingMove: string;
  hypotheses: { productName: string; line: string }[];
  ask: string[];
  lastTouch: string;
  disclaimer: string;
}

export function buildBriefing(
  account: Account,
  products: Product[],
  latest?: Activity
): Briefing {
  const opps = gapAnalysis(account, products).slice(0, 2);
  const tech = identifyEquipment(account).slice(0, 3).map((i) => i.label);

  let openingMove: string;
  switch (account.stage) {
    case "prospect":
      openingMove = `Cold walk-in: 2-minute intro, leave a card, confirm who owns capital decisions. Goal is a name and a callback window — not a pitch.`;
      break;
    case "contacted":
      openingMove = `Warm re-contact: reference the last touch, ask for 20 minutes on-site. Convert the contact into a sit-down.`;
      break;
    case "meeting":
      openingMove = `Confirm the meeting's single objective before you walk in; leave with a booked walk-through or demo date.`;
      break;
    case "demo":
      openingMove = `Demo day: confirm room + staff availability on arrival; open by asking what a successful demo must show them.`;
      break;
    case "proposal":
      openingMove = `Visit to unblock the proposal: trade-in math, financing sheet, and a written decision date.`;
      break;
    case "negotiation":
      openingMove = `Closing posture: hold value on training, warranty and support. Escalate pricing concessions to the RSM.`;
      break;
    default:
      openingMove = `Relationship maintenance: short value-add visit, capture utilization feedback, log a note.`;
  }

  const days = account.lastContactAt ? Math.floor((Date.now() - account.lastContactAt) / 86_400_000) : null;
  const lastTouch = latest
    ? `${days === null ? "Never" : days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} ago`} — ${latest.summary}`
    : days === null
      ? "No contact logged yet — this is a first touch."
      : `${days} days since last contact.`;

  return {
    who: account.decisionMakers,
    verifiedServices: account.services.slice(0, 4),
    verifiedTech: tech,
    openingMove,
    hypotheses: opps.map((o) => ({
      productName: o.product.name,
      line: o.signal === "replacement"
        ? `Possible displacement — they run competing ${o.product.category} hardware. Probe satisfaction & service costs.`
        : `${o.product.category} opening — services match, but no platform identified publicly. Ask; don't assume.`,
    })),
    ask: opps.length
      ? opps.flatMap((o) => o.discoveryQuestions.slice(0, 1)).slice(0, 2)
      : ["What does your ideal next piece of equipment need to do for the practice?"],
    lastTouch,
    disclaimer:
      "Hypotheses are AI-flagged from public signals only — they are not verified facts about the practice. Confirm everything by asking.",
  };
}
