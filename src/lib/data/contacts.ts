import type { Account, Contact, ContactPreference, ContactRole } from "../types";
import { SEED_PRODUCTS } from "./products";
import { daysAgo } from "../utils";

const PREFS: ContactPreference[] = ["call", "email", "text", "in-person"];

function interestsFor(account: Account): string[] {
  const haystack = [account.specialty, account.category, ...account.services, ...account.tags].join(" ").toLowerCase();
  return SEED_PRODUCTS.filter((p) => p.status === "active")
    .map((p) => ({ p, s: p.fitKeywords.filter((k) => haystack.includes(k)).length }))
    .filter((x) => x.s > 1)
    .sort((a, b) => b.s - a.s)
    .slice(0, 2)
    .map((x) => x.p.id);
}

export function buildContacts(accounts: Account[]): Contact[] {
  const out: Contact[] = [];
  accounts.forEach((a, ai) => {
    a.decisionMakers.forEach((dm, di) => {
      out.push({
        id: `c_${String(ai * 2 + di + 1).padStart(3, "0")}`,
        accountId: a.id,
        name: dm.name,
        title: dm.title,
        role: di === 0 ? "decision-maker" : (dm.title.toLowerCase().includes("owner") ? "champion" : "influencer"),
        email: dm.name.toLowerCase().replace(/[^a-z ]/g, "").trim().replace(/\s+/g, ".") + "@" + a.website,
        phone: a.phone,
        interests: interestsFor(a),
        preference: PREFS[(ai + di) % PREFS.length],
        notes: di === 0 ? "Primary point of contact for the account." : "Involved in purchase evaluation.",
        lastContactAt: a.lastContactAt ? a.lastContactAt - di * 2 * 86_400_000 : null,
      });
    });
  });
  return out;
}
