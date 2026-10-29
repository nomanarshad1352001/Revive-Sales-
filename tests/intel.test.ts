import { describe, expect, it } from "vitest";
import { buildAccounts } from "@/lib/data/accounts";
import { SEED_PRODUCTS } from "@/lib/data/products";
import { buildBriefing, gapAnalysis, identifyEquipment } from "@/lib/intel";

const accounts = buildAccounts();
const products = SEED_PRODUCTS;

describe("portfolio gap intelligence", () => {
  it("detects competitor platforms from identified equipment", () => {
    const alamo = accounts.find((a) => a.name.includes("Alamo Heights"))!;
    const tech = identifyEquipment(alamo);
    expect(tech.some((t) => t.brand === "InMode")).toBe(true);
    expect(tech.some((t) => t.category === "rf-microneedling")).toBe(true);
  });

  it("flags replacement signal when a competing platform exists in the same category", () => {
    const alamo = accounts.find((a) => a.name.includes("Alamo Heights"))!;
    const opps = gapAnalysis(alamo, products);
    const avira = opps.find((o) => o.product.id === "p_avira");
    expect(avira).toBeDefined();
    expect(avira!.signal).toBe("replacement");
  });

  it("uses absence-of-evidence language for gap hypotheses", () => {
    const katy = accounts.find((a) => a.name.includes("Katy Slim"))!;
    const opps = gapAnalysis(katy, products);
    const gaps = opps.filter((o) => o.signal === "gap");
    for (const g of gaps) {
      expect(g.caution).toMatch(/verify|confirm|not evidence|absence/i);
      expect(g.caution.toLowerCase()).not.toMatch(/definitely lacks/);
      expect(g.caution.toLowerCase()).not.toMatch(/does not have/);
    }
    expect(gaps.length).toBeGreaterThan(0);
  });

  it("never recommends discontinued products", () => {
    for (const a of accounts) {
      const opps = gapAnalysis(a, products);
      expect(opps.some((o) => o.product.id === "p_agejet")).toBe(false);
      expect(opps.some((o) => o.product.id === "p_tensamax")).toBe(false);
    }
  });

  it("briefings distinguish hypotheses from verified facts", () => {
    const a = accounts[0];
    const brief = buildBriefing(a, products);
    expect(brief.disclaimer).toMatch(/not verified|confirm/i);
    expect(brief.verifiedServices.length).toBeGreaterThan(0);
  });
});
