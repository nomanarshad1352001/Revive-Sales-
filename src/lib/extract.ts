import { EQUIPMENT_MAP } from "./intel";
import type { Account, ActivityType, Product } from "./types";

/**
 * Voice-note extraction engine (Section 9).
 * Local, deterministic NLP-style parsing — no external calls, works offline.
 * Architecture note: the same Extraction shape can be produced by an LLM API
 * later; callers only depend on this interface, not the implementation.
 */

export interface Extraction {
  raw: string;
  accountId: string | null;
  accountGuess: string | null;
  contactName: string | null;
  visitType: ActivityType;
  productIds: string[];
  equipment: string[]; // competitor labels identified
  decisionMakerNote: string | null;
  interest: "high" | "medium" | "low" | "unknown";
  objections: string[];
  nextAction: string | null;
  followUpAt: number | null;
  followUpLabel: string | null;
  suggestedSubject: string;
  suggestedBody: string;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function nextDayOfWeek(dayIndex: number): number {
  const d = new Date();
  const diff = (dayIndex + 7 - d.getDay()) % 7 || 7; // next occurrence, not today
  d.setDate(d.getDate() + diff);
  d.setHours(17, 0, 0, 0);
  return d.getTime();
}

export function parseFollowUpDate(text: string): { at: number | null; label: string | null } {
  const t = text.toLowerCase();
  let m = t.match(/in (\d+|a|an) (day|days|week|weeks|month)/);
  if (m) {
    const n = m[1] === "a" || m[1] === "an" ? 1 : parseInt(m[1], 10);
    const mult = m[2].startsWith("day") ? 1 : m[2].startsWith("week") ? 7 : 30;
    const at = Date.now() + n * mult * 86_400_000;
    return { at, label: `in ${n} ${m[2]}${n > 1 && !m[2].endsWith("s") ? "s" : ""}` };
  }
  m = t.match(/in (?:two|couple(?: of)?) weeks/);
  if (m) return { at: Date.now() + 14 * 86_400_000, label: "in two weeks" };
  for (let i = 0; i < DAY_NAMES.length; i++) {
    const re = new RegExp(`(?:next |this |on |by )?${DAY_NAMES[i]}\\b`);
    if (re.test(t)) return { at: nextDayOfWeek(i), label: `next ${DAY_NAMES[i]}` };
  }
  if (/\btomorrow\b/.test(t)) return { at: Date.now() + 86_400_000, label: "tomorrow" };
  return { at: null, label: null };
}

export function extractVisitNote(text: string, accounts: Account[], products: Product[]): Extraction {
  const lower = text.toLowerCase();

  // ── Account match: name tokens + city ──
  let best: Account | null = null;
  let bestScore = 0;
  let guess: string | null = null;
  for (const a of accounts) {
    const tokens = a.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !["aesthetics", "medical", "clinic", "center", "centre"].includes(w));
    let score = tokens.filter((t) => lower.includes(t)).length * 3;
    if (lower.includes(a.city.toLowerCase())) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  if (bestScore >= 3 && best) guess = best.name;
  const accountId = bestScore >= 4 ? best!.id : null;

  // ── Contact: "met with X" / "spoke to X" / "X said" ──
  let contactName: string | null = null;
  let m = text.match(/(?:met with|spoke with|spoke to|talked (?:to|with)|sat with|saw)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (m) contactName = m[1];
  if (!contactName) {
    m = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:said|wants|is interested|was interested)/m);
    if (m) contactName = m[1];
  }

  // Fallback: if we know the account, contact may be one of its decision makers named in text
  if (!contactName && best) {
    for (const dm of best.decisionMakers) {
      const first = dm.name.replace(/^Dr\.\s+/, "").split(" ")[0];
      if (first && lower.includes(first.toLowerCase())) contactName = first;
    }
  }

  // ── Visit type ──
  let visitType: ActivityType = "visit";
  if (/\bdemo\b|demonstration/.test(lower)) visitType = "demo";
  else if (/\bmeeting\b|sit-?down|lunch/.test(lower)) visitType = "meeting";
  else if (/\bcall|phoned|rang\b/.test(lower) && !/walk|visit|office/.test(lower)) visitType = "call";
  else if (/\bemail(ed)?\b/.test(lower)) visitType = "email";

  // ── Products discussed ──
  const productIds: string[] = [];
  for (const p of products) {
    if (p.status !== "active") continue;
    const names = [p.name.toLowerCase(), ...p.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3)];
    if (p.id === "p_iblaze" && /\bco2\b|fractional/.test(lower)) productIds.push(p.id);
    else if (p.id === "p_avira" && /\bavira|rf micro/.test(lower)) productIds.push(p.id);
    else if (p.id === "p_fraclight" && /\bipl|photofacial|fraclight/.test(lower)) productIds.push(p.id);
    else if (p.id === "p_colormax" && /colormax|pico|tattoo/.test(lower)) productIds.push(p.id);
    else if (p.id === "p_hydrash" && /hydra/.test(lower)) productIds.push(p.id);
    else if (p.id === "p_retraction" && /retraction|skin tightening/.test(lower)) productIds.push(p.id);
    else if (p.id === "p_emulsify" && /emulsify|fat|contouring|sculpt/.test(lower)) productIds.push(p.id);
    else if (names.some((n) => lower.includes(n))) productIds.push(p.id);
  }

  // ── Competitive equipment ──
  const equipment: string[] = [];
  for (const em of EQUIPMENT_MAP) {
    if (lower.includes(em.match)) equipment.push(em.label);
  }
  if (/\brf microneedling device\b|older rf|old rf/.test(lower) && !equipment.length) {
    equipment.push("Legacy RF microneedling device (unbranded)");
  }

  // ── Decision-maker language ──
  let decisionMakerNote: string | null = null;
  m = text.match(/((?:the )?(?:owner|medical director|practice manager|office manager|founder|dr\.?\s+[A-Za-z]+)[^.]*?(?:makes?|decides?|signs|approves?)[^.]*?)(?:\.\s|$|\.)/i);
  if (m) decisionMakerNote = m[1].replace(/\.$/, "").trim();
  else if (/owner makes the final/i.test(text)) decisionMakerNote = "Owner makes the final purchasing decision";

  // ── Interest level ──
  let interest: Extraction["interest"] = "unknown";
  if (/very interested|excited|loved|asked for pricing|wants a demo|eager|ready to move/.test(lower)) interest = "high";
  else if (/interested|curious|open to|asked about|wants information|wants info/.test(lower)) interest = "medium";
  else if (/not interested|no budget|skeptical|brushed us off|declined/.test(lower)) interest = "low";

  // ── Objections ──
  const objections: string[] = [];
  if (/price|expensive|budget|cost concern|too much/.test(lower)) objections.push("Price / budget concern");
  if (/timing|not the right time|later in the year|next quarter/.test(lower)) objections.push("Timing");
  if (/under contract|lease until|warranty with|signed with/.test(lower)) objections.push("Existing vendor contract");
  if (/competitor|inmode|candela|lumenis|sciton|btl/.test(lower)) objections.push("Evaluating competitors");
  if (/space|room for it|electrical|power/.test(lower)) objections.push("Facility constraints");
  if (/staff|training|who would operate/.test(lower)) objections.push("Staffing / training concerns");

  // ── Next action ──
  let nextAction: string | null = null;
  if (/schedule a demo|book a demo|set up a demo/.test(lower)) nextAction = "Schedule a demo";
  else if (/send (?:her|him|them)?\s*(information|info|pricing|a proposal|materials)/.test(lower)) nextAction = "Send information / materials";
  else if (/follow up|check back|check in/.test(lower)) nextAction = "Follow up";
  else if (/call back|call again/.test(lower)) nextAction = "Call back";

  const { at: followUpAt, label: followUpLabel } = parseFollowUpDate(text);

  // ── Suggested email ──
  const productNames = products.filter((p) => productIds.includes(p.id)).map((p) => p.name);
  const firstName = contactName ? contactName.replace(/^Dr\.\s*/i, "").split(" ")[0] : "there";
  const suggestedSubject = productNames.length
    ? `Great meeting you — ${productNames.join(" + ")} next steps`
    : "Thank you for the conversation";
  const suggestedBody = buildSuggestedBody({
    firstName,
    accountName: best?.name ?? "your practice",
    productNames,
    nextAction,
    followUpLabel,
  });

  return {
    raw: text,
    accountId,
    accountGuess: accountId ? null : guess,
    contactName,
    visitType,
    productIds: [...new Set(productIds)],
    equipment: [...new Set(equipment)],
    decisionMakerNote,
    interest,
    objections,
    nextAction,
    followUpAt,
    followUpLabel,
    suggestedSubject,
    suggestedBody,
  };
}

function buildSuggestedBody(p: {
  firstName: string;
  accountName: string;
  productNames: string[];
  nextAction: string | null;
  followUpLabel: string | null;
}) {
  const lines = [
    `Hi ${p.firstName},`,
    ``,
    `Thank you for the time today at ${p.accountName} — I enjoyed learning about the practice and how your team approaches patient care.`,
  ];
  if (p.productNames.length) {
    lines.push(``, `As promised, I've attached the approved information for ${p.productNames.join(" and ")} so you can review the clinical details and practice economics at your convenience.`);
  }
  if (p.nextAction) {
    lines.push(``, `Next step on my side: ${p.nextAction.toLowerCase()}${p.followUpLabel ? ` — I'll reach back out ${p.followUpLabel}` : ""}.`);
  } else if (p.followUpLabel) {
    lines.push(``, `I'll follow up ${p.followUpLabel} to see what questions came up.`);
  } else {
    lines.push(``, `I'll follow up soon to see what questions came up.`);
  }
  lines.push(
    ``,
    `If it's easier, reply with a couple of times that work and I'll make it happen.`,
    ``,
    `Best regards,`,
    `[Your name]`,
    `Revive Regenerative — Field Sales`,
    `[Phone] · [Email]`
  );
  return lines.join("\n");
}
