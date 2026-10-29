import { describe, expect, it } from "vitest";
import { buildAccounts } from "@/lib/data/accounts";
import { SEED_PRODUCTS } from "@/lib/data/products";
import { extractVisitNote, parseFollowUpDate } from "@/lib/extract";

const accounts = buildAccounts();
const products = SEED_PRODUCTS;

describe("voice-note extraction engine", () => {
  it("extracts account, contact, product, equipment and next action from the spec example style", () => {
    const note =
      "Just met with Sally at Sugar Land Skin Center. She has an older RF microneedling device, is interested in Avira, and wants information on skin tightening. Her owner makes the final purchasing decision. Follow up next Tuesday and see if we can schedule a demo. Budget is tight this quarter.";
    const ex = extractVisitNote(note, accounts, products);

    expect(ex.accountGuess === "Sugar Land Skin Center" || ex.accountId).toBeTruthy();
    expect(ex.contactName).toBe("Sally");
    expect(ex.productIds).toContain("p_avira");
    expect(ex.productIds).toContain("p_retraction"); // "skin tightening" → Retraction
    expect(ex.equipment.length).toBeGreaterThan(0); // legacy RF device captured
    expect(ex.decisionMakerNote).toBeTruthy();
    expect(ex.nextAction).toBe("Schedule a demo");
    expect(ex.followUpAt).toBeGreaterThan(Date.now());
    expect(ex.objections).toContain("Price / budget concern");
    expect(ex.suggestedBody).toContain("Sally");
    expect(ex.suggestedSubject.length).toBeGreaterThan(5);
  });

  it("never extracts discontinued products", () => {
    const ex = extractVisitNote("They asked about AgeJET and TensaMax pricing for tightening work", accounts, products);
    expect(ex.productIds).not.toContain("p_agejet");
    expect(ex.productIds).not.toContain("p_tensamax");
  });

  it("parses relative follow-up dates", () => {
    expect(parseFollowUpDate("follow up tomorrow").at).toBeGreaterThan(Date.now());
    expect(parseFollowUpDate("check in two weeks").at).toBeGreaterThan(Date.now() + 12 * 86_400_000);
    expect(parseFollowUpDate("follow up in 3 days").at).toBeGreaterThan(Date.now() + 2 * 86_400_000);
    expect(parseFollowUpDate("no date mentioned").at).toBeNull();
  });
});
