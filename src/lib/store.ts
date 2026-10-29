"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildAccounts } from "./data/accounts";
import { buildActivities, buildTasks } from "./data/activities";
import { buildContacts } from "./data/contacts";
import { SEED_MATERIALS } from "./data/materials";
import { SEED_PRODUCTS } from "./data/products";
import { DEMO_PASSWORD, SEED_USERS } from "./data/users";
import type {
  Account,
  Activity,
  Contact,
  DailyTargets,
  EmailAudit,
  EmailDraft,
  EmailMaterial,
  EmailSequence,
  Priority,
  Product,
  Role,
  RoutePlan,
  Settings,
  Stage,
  Task,
  User,
} from "./types";
import { uid } from "./utils";

const DEFAULT_ACCOUNTS = buildAccounts();

export const SEED_STATE = {
  users: SEED_USERS,
  accounts: DEFAULT_ACCOUNTS,
  activities: buildActivities(),
  tasks: buildTasks(),
  contacts: buildContacts(DEFAULT_ACCOUNTS),
  products: SEED_PRODUCTS,
  materials: SEED_MATERIALS,
  routes: [] as RoutePlan[],
  sequences: [] as EmailSequence[],
  emailAudit: [] as EmailAudit[],
  pendingDraft: null as EmailDraft | null,
  nuvueLastSync: null as number | null,
  settings: {
    coverageThresholdDays: 60,
    targets: {
      RSM: { meetings: 3, dropIns: 5, calls: 10 },
      ASM: { meetings: 2, dropIns: 15, calls: 20 },
      TM: { meetings: 2, dropIns: 15, calls: 20 },
      ADMIN: { meetings: 0, dropIns: 0, calls: 0 },
    },
    reports: { dailyTime: "17:30", timezone: "America/Chicago", weeklyDay: 1 },
  } as Settings,
};

export interface AppState {
  users: User[];
  accounts: Account[];
  activities: Activity[];
  tasks: Task[];
  contacts: Contact[];
  products: Product[];
  materials: EmailMaterial[];
  routes: RoutePlan[];
  sequences: EmailSequence[];
  emailAudit: EmailAudit[];
  pendingDraft: EmailDraft | null;
  nuvueLastSync: number | null;
  settings: Settings;
  currentUserId: string | null;

  currentUser: () => User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;

  addAccount: (
    acc: Omit<Account, "id" | "createdAt" | "researchedAt" | "crmStatus" | "stageHistory" | "demoStatus" | "financingStatus" | "probability" | "expectedCloseAt" | "nextStep"> &
      Partial<Pick<Account, "probability" | "expectedCloseAt" | "nextStep" | "demoStatus" | "financingStatus">>
  ) => string;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  setStage: (id: string, stage: Stage) => void;
  setPriority: (id: string, priority: Priority) => void;
  markResearched: (id: string) => void;
  setCrmStatus: (id: string, status: Account["crmStatus"]) => void;

  addContact: (contact: Omit<Contact, "id">) => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  deleteContact: (id: string) => void;

  logActivity: (act: Omit<Activity, "id" | "at"> & { at?: number }) => void;
  addTask: (task: Omit<Task, "id" | "done">) => void;
  toggleTask: (id: string) => void;

  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;

  saveRoute: (route: Omit<RoutePlan, "id" | "createdAt" | "updatedAt"> & { id?: string }) => string;
  updateRoute: (id: string, patch: Partial<RoutePlan>) => void;
  deleteRoute: (id: string) => void;
  updateRouteStop: (routeId: string, stopId: string, patch: Partial<RoutePlan["stops"][number]>) => void;

  addSequence: (seq: Omit<EmailSequence, "id" | "createdAt">) => string;
  updateSequence: (id: string, patch: Partial<EmailSequence>) => void;
  updateSequenceStep: (seqId: string, stepId: string, patch: Partial<EmailSequence["steps"][number]>) => void;
  addAudit: (entry: Omit<EmailAudit, "id" | "at">) => void;
  setPendingDraft: (draft: EmailDraft | null) => void;

  runNuvueSync: () => void;

  updateSettings: (patch: Partial<Settings>) => void;
  updateTargets: (role: Role, targets: DailyTargets) => void;

  addUser: (user: Omit<User, "id" | "password" | "color"> & { password?: string }) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  reassignAccounts: (fromUserId: string, toUserId: string) => void;

  resetDemo: () => void;
}

export const STORE_VERSION = 5;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...SEED_STATE,
      currentUserId: null,

      currentUser: () => {
        const { users, currentUserId } = get();
        return users.find((u) => u.id === currentUserId) ?? null;
      },

      login: (email, password) => {
        const user = get().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
        if (!user || !user.active) return false;
        set({ currentUserId: user.id });
        return true;
      },

      logout: () => set({ currentUserId: null }),

      addAccount: (acc) => {
        const id = uid("acc");
        set((s) => ({
          accounts: [
            {
              ...acc,
              id,
              researchedAt: Date.now(),
              crmStatus: "local",
              stageHistory: [{ stage: acc.stage, at: Date.now() }],
              probability: acc.probability ?? 5,
              expectedCloseAt: acc.expectedCloseAt ?? null,
              nextStep: acc.nextStep ?? "Qualify the account and identify the decision-maker",
              demoStatus: acc.demoStatus ?? "none",
              financingStatus: acc.financingStatus ?? "none",
              createdAt: Date.now(),
            },
            ...s.accounts,
          ],
        }));
        return id;
      },

      updateAccount: (id, patch) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

      deleteAccount: (id) =>
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          activities: s.activities.filter((a) => a.accountId !== id),
          tasks: s.tasks.filter((t) => t.accountId !== id),
          contacts: s.contacts.filter((c) => c.accountId !== id),
          routes: s.routes.map((r) => ({ ...r, stops: r.stops.filter((st) => st.accountId !== id) })),
        })),

      setStage: (id, stage) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === id
              ? {
                  ...a,
                  stage,
                  lastContactAt: Date.now(),
                  probability: stage === "won" ? 100 : stage === "lost" ? 0 : a.probability,
                  stageHistory: [...(a.stageHistory ?? []), { stage, at: Date.now() }],
                }
              : a
          ),
        })),

      setPriority: (id, priority) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, priority } : a)) })),

      markResearched: (id) =>
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, researchedAt: Date.now() } : a)),
          activities: [
            {
              id: uid("act"),
              accountId: id,
              userId: s.currentUserId ?? "u_riley",
              type: "note",
              at: Date.now(),
              summary: "Re-verified the practice's public materials (website, listings) and refreshed the research record.",
              outcome: "Research refreshed",
            },
            ...s.activities,
          ],
        })),

      setCrmStatus: (id, status) =>
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, crmStatus: status } : a)) })),

      addContact: (contact) => set((s) => ({ contacts: [...s.contacts, { ...contact, id: uid("c") }] })),
      updateContact: (id, patch) => set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteContact: (id) => set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),

      logActivity: (act) => {
        const at = act.at ?? Date.now();
        set((s) => ({
          activities: [{ ...act, at, id: uid("act") }, ...s.activities],
          accounts: s.accounts.map((a) =>
            a.id === act.accountId
              ? {
                  ...a,
                  lastContactAt: at,
                  lastVisitAt: act.type === "visit" || act.type === "demo" || act.type === "meeting" ? at : a.lastVisitAt,
                  crmStatus: a.crmStatus === "synced" ? "pending" : a.crmStatus,
                }
              : a
          ),
          contacts: s.contacts.map((c) => (c.accountId === act.accountId && c.role === "decision-maker" ? { ...c, lastContactAt: at } : c)),
        }));
      },

      addTask: (task) => set((s) => ({ tasks: [{ ...task, done: false, id: uid("tsk") }, ...s.tasks] })),
      toggleTask: (id) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),

      addProduct: (p) => set((s) => ({ products: [...s.products, { ...p, id: uid("p") }] })),
      updateProduct: (id, patch) => set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      saveRoute: (route) => {
        const id = route.id ?? uid("rt");
        set((s) => {
          const existing = s.routes.find((r) => r.id === id);
          const rec: RoutePlan = { ...route, id, createdAt: existing?.createdAt ?? Date.now(), updatedAt: Date.now() };
          return { routes: [rec, ...s.routes.filter((r) => r.id !== id)] };
        });
        return id;
      },
      updateRoute: (id, patch) => set((s) => ({ routes: s.routes.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r)) })),
      deleteRoute: (id) => set((s) => ({ routes: s.routes.filter((r) => r.id !== id) })),
      updateRouteStop: (routeId, stopId, patch) =>
        set((s) => ({
          routes: s.routes.map((r) =>
            r.id === routeId ? { ...r, stops: r.stops.map((st) => (st.id === stopId ? { ...st, ...patch } : st)), updatedAt: Date.now() } : r
          ),
        })),

      addSequence: (seq) => {
        const id = uid("seq");
        set((s) => ({ sequences: [{ ...seq, id, createdAt: Date.now() }, ...s.sequences] }));
        return id;
      },
      updateSequence: (id, patch) => set((s) => ({ sequences: s.sequences.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),
      updateSequenceStep: (seqId, stepId, patch) =>
        set((s) => ({
          sequences: s.sequences.map((q) => (q.id === seqId ? { ...q, steps: q.steps.map((st) => (st.id === stepId ? { ...st, ...patch } : st)) } : q)),
        })),
      addAudit: (entry) => set((s) => ({ emailAudit: [{ ...entry, id: uid("aud"), at: Date.now() }, ...s.emailAudit] })),
      setPendingDraft: (draft) => set({ pendingDraft: draft }),

      runNuvueSync: () => {
        const now = Date.now();
        set((s) => ({
          nuvueLastSync: now,
          accounts: s.accounts.map((a) => ({ ...a, crmStatus: "synced" })),
        }));
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch, reports: { ...s.settings.reports, ...(patch.reports ?? {}) } } })),
      updateTargets: (role, targets) => set((s) => ({ settings: { ...s.settings, targets: { ...s.settings.targets, [role]: targets } } })),

      addUser: (input) => {
        const palette = ["#0C6B4F", "#27698F", "#B97A1A", "#6B4FA1", "#B4541E", "#146C60"];
        const user: User = { ...input, id: uid("u"), password: input.password || DEMO_PASSWORD, color: palette[Math.floor(Math.random() * palette.length)] };
        set((s) => ({ users: [...s.users, user] }));
      },
      updateUser: (id, patch) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      reassignAccounts: (fromUserId, toUserId) =>
        set((s) => ({
          accounts: s.accounts.map((a) => (a.ownerId === fromUserId ? { ...a, ownerId: toUserId } : a)),
          tasks: s.tasks.map((t) => (t.userId === fromUserId ? { ...t, userId: toUserId } : t)),
        })),

      resetDemo: () => set({ ...SEED_STATE, routes: [], sequences: [], emailAudit: [], pendingDraft: null, nuvueLastSync: null }),
    }),
    {
      name: "revive-sales-command",
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      await useAppStore.persist.rehydrate();
      if (alive) setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, []);
  return hydrated;
}

export function roleLabel(role: Role) {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "RSM":
      return "Regional Sales Manager";
    case "ASM":
      return "Area Sales Manager";
    case "TM":
      return "Territory Manager";
  }
}
