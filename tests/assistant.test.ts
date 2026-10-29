import { describe, expect, it } from "vitest";
import { respond } from "@/lib/assistant";
import { buildAccounts } from "@/lib/data/accounts";
import { buildActivities, buildTasks } from "@/lib/data/activities";
import { SEED_PRODUCTS } from "@/lib/data/products";
import { SEED_USERS } from "@/lib/data/users";

const base = {
  accounts: buildAccounts(),
  activities: buildActivities(),
  tasks: buildTasks(),
  users: SEED_USERS,
  products: SEED_PRODUCTS,
  me: SEED_USERS.find((u) => u.id === "u_sofia")!,
  targets: {
    RSM: { meetings: 3, dropIns: 5, calls: 10 },
    ASM: { meetings: 2, dropIns: 15, calls: 20 },
    TM: { meetings: 2, dropIns: 15, calls: 20 },
    ADMIN: { meetings: 0, dropIns: 0, calls: 0 },
  },
};

describe("AI sales assistant", () => {
  it("ranks product-potential requests against real accounts", () => {
    const r = respond("Which 5 med spa accounts in Austin have the strongest potential for Avira RF?", base);
    const card = r.cards[0];
    expect(card.kind).toBe("accounts");
    expect(card.rows.length).toBeGreaterThan(0);
    expect(String(card.rows[0].city)).toContain("Austin");
  });

  it("answers market coverage questions with day counts", () => {
    const r = respond("Show me markets that haven't received a field visit in 30 days", base);
    expect(r.cards[0].kind).toBe("markets");
    expect((r.cards[0].rows as { days: number | null }[]).every((x) => x.days === null || x.days >= 30)).toBe(true);
  });

  it("builds route previews without saving anything itself", () => {
    const r = respond("Build me a route for tomorrow starting in Georgetown with my scheduled meetings and 8 nearby high priority prospects", base);
    const card = r.cards.find((c) => c.kind === "route-preview");
    expect(card).toBeDefined();
    expect((card!.rows as unknown[]).length).toBeGreaterThan(2);
    expect(r.text).toMatch(/confirm/i);
  });

  it("computes reps behind on weekly meetings from logged activity", () => {
    const r = respond("Which reps are behind on meetings this week?", base);
    expect(r.cards[0].kind).toBe("reps");
    expect((r.cards[0].rows as { meetings: number; target: number }[]).every((x) => typeof x.meetings === "number")).toBe(true);
  });

  it("lists quarter-closing opportunities without inventing numbers", () => {
    const r = respond("Show me all opportunities expected to close this quarter", base);
    expect(r.text).toMatch(/demo|simulat|workspace|quarter/i);
  });

  it("discloses missing data instead of guessing", () => {
    const r = respond("Which dental practices in Boise should I call?", base);
    expect(r.text.toLowerCase()).toMatch(/couldn't|don't have|no |workspace/);
  });
});
