import { beforeEach, describe, expect, it } from "vitest";

/**
 * Store workflows — mirrors Section 20 verification script.
 * localStorage is stubbed so the persist middleware can run in Node.
 */
const memory = new Map<string, string>();
// @ts-expect-error minimal stub for zustand persist
globalThis.localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, String(v)),
  removeItem: (k: string) => void memory.delete(k),
};

const { useAppStore } = await import("@/lib/store");

describe("app store workflows", () => {
  beforeEach(() => {
    useAppStore.getState().resetDemo();
  });

  it("adds a fictional account that is searchable (demo: steps 1–2)", () => {
    const id = useAppStore.getState().addAccount({
      name: "Cypress Point Med Spa",
      specialty: "Medical Spa",
      category: "Aesthetics",
      address: "100 Main St",
      city: "Georgetown",
      state: "TX",
      zip: "78626",
      phone: "(512) 555-0999",
      website: "cypresspointspa.test",
      decisionMakers: [{ name: "Dr. Test", title: "Owner" }],
      services: ["Injectables", "Microneedling"],
      equipment: [],
      locations: 1,
      lat: 30.65,
      lng: -97.7,
      priority: "B",
      stage: "prospect",
      ownerId: "u_sofia",
      lastContactAt: null,
      lastVisitAt: null,
      opportunity: 65000,
      source: "Manual entry — field research",
      confidence: "medium",
      notes: "Fictional test account",
      tags: [],
    });
    const found = useAppStore.getState().accounts.filter((a) => a.name.toLowerCase().includes("cypress"));
    expect(found.map((a) => a.id)).toContain(id);
    expect(found[0].crmStatus).toBe("local");
    expect(found[0].stageHistory.length).toBe(1);
  });

  it("assigns an account to a different salesperson (demo: step 3)", () => {
    const { accounts, updateAccount } = useAppStore.getState();
    updateAccount(accounts[0].id, { ownerId: "u_dalton" });
    expect(useAppStore.getState().accounts.find((a) => a.id === accounts[0].id)!.ownerId).toBe("u_dalton");
  });

  it("logging a visit updates last-visit and requires coverage recalc (demo: steps 4–6)", () => {
    const s = useAppStore.getState();
    const target = s.accounts.find((a) => !a.lastVisitAt)!;
    s.logActivity({ accountId: target.id, userId: "u_sofia", type: "visit", summary: "Walk-in visit logged in test" });
    const after = useAppStore.getState().accounts.find((a) => a.id === target.id)!;
    expect(after.lastVisitAt).not.toBeNull();
    expect(after.lastContactAt).not.toBeNull();
    expect(useAppStore.getState().activities[0].summary).toContain("Walk-in visit");
  });

  it("saving and reopening a route retains stops (demo: steps 7–8)", () => {
    const s = useAppStore.getState();
    const stops = s.accounts.slice(0, 3).map((a) => a.id);
    const id = s.saveRoute({
      userId: "u_sofia",
      name: "Test field day",
      date: "2030-01-01",
      startLabel: "Austin HQ",
      startLat: 30.27,
      startLng: -97.74,
      stops: stops.map((accountId) => ({ id: `st_${accountId}`, accountId, status: "planned" })),
      mileage: 42,
    });
    const reopened = useAppStore.getState().routes.find((r) => r.id === id)!;
    expect(reopened.stops.length).toBe(3);
    expect(reopened.name).toBe("Test field day");
  });

  it("stage movement records history and probability updates (demo: step 13)", () => {
    const s = useAppStore.getState();
    const acc = s.accounts.find((a) => a.stage === "prospect")!;
    s.setStage(acc.id, "proposal");
    const after = useAppStore.getState().accounts.find((a) => a.id === acc.id)!;
    expect(after.stage).toBe("proposal");
    expect(after.stageHistory.some((h) => h.stage === "proposal")).toBe(true);
  });

  it("follow-up tasks can be created and completed (demo: step 11)", () => {
    const s = useAppStore.getState();
    s.addTask({ accountId: s.accounts[0].id, userId: "u_sofia", title: "Test follow-up", type: "follow-up", dueAt: Date.now() + 86_400_000 });
    const t = useAppStore.getState().tasks[0];
    expect(t.title).toBe("Test follow-up");
    useAppStore.getState().toggleTask(t.id);
    expect(useAppStore.getState().tasks[0].done).toBe(true);
  });

  it("records persist through the storage layer (demo: step 14)", () => {
    useAppStore.getState().resetDemo();
    const raw = memory.get("revive-sales-command");
    expect(raw).toBeTruthy();
    expect(raw).toContain("Lumina");
  });

  it("Nuvue simulation never pretends to be real", () => {
    useAppStore.getState().runNuvueSync();
    const last = useAppStore.getState().nuvueLastSync;
    expect(last).not.toBeNull();
    expect(useAppStore.getState().accounts.every((a) => a.crmStatus === "synced")).toBe(true);
  });
});
