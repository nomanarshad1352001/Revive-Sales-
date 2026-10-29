export type Role = "ADMIN" | "RSM" | "ASM" | "TM";

export type Stage =
  | "prospect"
  | "contacted"
  | "meeting"
  | "demo"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type Priority = "A" | "B" | "C";

export type ActivityType = "call" | "visit" | "email" | "demo" | "meeting" | "note";

export type Confidence = "high" | "medium" | "low";

export type CrmStatus = "synced" | "pending" | "local";

export type DemoStatus = "none" | "scheduled" | "completed";
export type FinancingStatus = "none" | "review" | "approved" | "declined";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  territory: string;
  phone: string;
  active: boolean;
  password: string;
  color: string;
}

export interface DecisionMaker {
  name: string;
  title: string;
  email?: string;
  phone?: string;
}

export type ContactRole = "decision-maker" | "influencer" | "champion" | "user";
export type ContactPreference = "call" | "email" | "text" | "in-person";

export interface Contact {
  id: string;
  accountId: string;
  name: string;
  title: string;
  role: ContactRole;
  email?: string;
  phone?: string;
  interests: string[];
  preference: ContactPreference;
  notes: string;
  lastContactAt: number | null;
}

export interface StageEvent {
  stage: Stage;
  at: number;
}

export interface Account {
  id: string;
  name: string;
  specialty: string;
  category: string;
  address: string;
  city: string;
  state: "TX" | "OK";
  zip: string;
  phone: string;
  website: string;
  email?: string;
  decisionMakers: DecisionMaker[];
  services: string[];
  equipment: string[];
  locations: number;
  lat: number;
  lng: number;
  priority: Priority;
  stage: Stage;
  stageHistory: StageEvent[];
  ownerId: string;
  lastContactAt: number | null;
  lastVisitAt: number | null;
  opportunity: number;
  // opportunity detail (Section 12)
  primaryProductId?: string;
  expectedCloseAt?: number | null;
  probability?: number;
  nextStep?: string;
  demoStatus: DemoStatus;
  financingStatus: FinancingStatus;
  source: string;
  confidence: Confidence;
  notes: string;
  tags: string[];
  researchedAt: number;
  crmStatus: CrmStatus;
  createdAt: number;
}

export interface Activity {
  id: string;
  accountId: string;
  userId: string;
  type: ActivityType;
  at: number;
  summary: string;
  outcome?: string;
}

export interface Task {
  id: string;
  accountId: string;
  userId: string;
  title: string;
  type: ActivityType | "follow-up";
  dueAt: number;
  done: boolean;
}

export type ProductStatus = "active" | "discontinued";

export interface Product {
  id: string;
  name: string;
  category: string;
  deviceCategory: string;
  price: number;
  status: ProductStatus;
  pitch: string;
  fitKeywords: string[];
  discoveryQuestions: string[];
}

export interface DailyTargets {
  meetings: number;
  dropIns: number;
  calls: number;
}

export interface ReportSettings {
  dailyTime: string; // HH:MM 24h
  timezone: string;
  weeklyDay: number; // 0-6
}

export interface Settings {
  coverageThresholdDays: number;
  targets: Record<Role, DailyTargets>;
  reports: ReportSettings;
}

export type RouteStopStatus = "planned" | "done" | "skipped";

export interface RouteStop {
  id: string;
  accountId: string;
  status: RouteStopStatus;
  note?: string;
}

export interface RoutePlan {
  id: string;
  userId: string;
  name: string;
  date: string;
  startLabel: string;
  startLat: number;
  startLng: number;
  stops: RouteStop[];
  mileage: number;
  createdAt: number;
  updatedAt: number;
}

// ─── Section 10: Email concierge ────────────────────────────────────────────
export interface EmailMaterial {
  id: string;
  name: string;
  type: "clinical" | "before-after" | "brochure" | "roi" | "video";
  productIds: string[];
  description: string;
  approvedOn: number;
}

export type SequenceStatus = "active" | "paused" | "completed" | "stopped";
export type StepStatus = "sent" | "scheduled" | "skipped";

export interface SequenceStep {
  id: string;
  subject: string;
  body: string;
  materialIds: string[];
  sendAt: number;
  status: StepStatus;
  intent: string;
}

export interface EmailSequence {
  id: string;
  accountId: string;
  contactName: string;
  userId: string;
  createdAt: number;
  status: SequenceStatus;
  stopReason?: string;
  steps: SequenceStep[];
}

export interface EmailDraft {
  accountId: string;
  contactName: string;
  subject: string;
  body: string;
  materialIds: string[];
}

export interface EmailAudit {
  id: string;
  at: number;
  actorId: string;
  action: "draft-created" | "sent-simulated" | "sequence-started" | "sequence-stopped" | "step-sent" | "opt-out" | "sync-run";
  accountId?: string;
  detail: string;
}
