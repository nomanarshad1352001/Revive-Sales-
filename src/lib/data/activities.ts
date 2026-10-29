import type { Activity, Task } from "../types";
import { daysAgo, inDays } from "../utils";

interface ActSeed {
  id: string;
  acc: number;
  user: string;
  type: Activity["type"];
  d: number; // days ago
  summary: string;
  outcome?: string | null;
}

const ACTS: ActSeed[] = [
  { id: "act_01", acc: 6, user: "u_sofia", type: "call", d: 1, summary: "Reviewed trade-in value on aging Alma Soprano with Marisol. Sent comparison sheet for NovaLume IPL X.", outcome: "Decision expected before quarter end" },
  { id: "act_02", acc: 15, user: "u_priya", type: "visit", d: 0, summary: "Met Aimee Li on-site to finalize device room specs for the CO2 + hair suite package. Power and HVAC reviewed.", outcome: "Moved to final pricing review" },
  { id: "act_03", acc: 24, user: "u_marcus", type: "visit", d: 2, summary: "In-spa demo of Aurelia RF Pro on two staff members. Alexandra comparing against Vivace upgrade quote.", outcome: "Counter-offer with training bundle requested" },
  { id: "act_04", acc: 46, user: "u_dalton", type: "call", d: 1, summary: "Confirmed practice manager has CO2+HIFU bundle pricing in hand. Greenfield MD aligned clinically.", outcome: "Pricing decision this week" },
  { id: "act_05", acc: 2, user: "u_sofia", type: "email", d: 2, summary: "Sent revised proposal for Lumen Sculpt CO2 with multi-location service terms to Megan Ruiz.", outcome: "Under capital budget review" },
  { id: "act_06", acc: 1, user: "u_sofia", type: "visit", d: 3, summary: "Walk-through of second Cedar Park location shell with Brianna. Discussed device mix for new site.", outcome: "Financing options requested" },
  { id: "act_07", acc: 11, user: "u_sofia", type: "visit", d: 4, summary: "Observed their Morpheus8 utilization — staff undertraining confirmed. Positioned Aurelia with full clinical training package.", outcome: "Proposal delivered in person" },
  { id: "act_08", acc: 43, user: "u_dalton", type: "call", d: 2, summary: "Confirmed demo logistics for Lumen Sculpt CO2 with both partners attending. Pre-demo packet emailed.", outcome: "Demo confirmed" },
  { id: "act_09", acc: 3, user: "u_sofia", type: "meeting", d: 5, summary: "Lunch meeting with Dr. Delacroix about adding skin tightening for post-lipo patients. Strong interest in HIFU.", outcome: "Wants ROI model by Friday" },
  { id: "act_10", acc: 14, user: "u_priya", type: "email", d: 3, summary: "Follow-up to River Oaks — sent clinical whitepaper for FolliCore suite throughput data.", outcome: null },
  { id: "act_11", acc: 25, user: "u_marcus", type: "visit", d: 4, summary: "Inspected legacy Fraxel unit at Highland Park. Service history confirms end-of-life — proposal for Lumen Sculpt CO2.", outcome: "Proposal submitted" },
  { id: "act_12", acc: 12, user: "u_sofia", type: "call", d: 2, summary: "Dr. Bhatt asked for resurfacing throughput comparison vs M22 ahead of demo. Sending spec sheet.", outcome: null },
  { id: "act_13", acc: 17, user: "u_priya", type: "note", d: 14, summary: "Install scheduled at Sugar Land Skin Center. Coordinate regional case-study photos post-launch.", outcome: "Closed-won" },
  { id: "act_14", acc: 27, user: "u_marcus", type: "visit", d: 8, summary: "Post-install training session with Dr. Cho's team in Frisco. Offered regional demo day hosting.", outcome: "Reference account secured" },
  { id: "act_15", acc: 16, user: "u_priya", type: "meeting", d: 5, summary: "Meeting with Dr. Qureshi — GLP-1 patient skin laxity program concept well received. Drafting HIFEM+HIFU combo quote.", outcome: "Quote requested" },
  { id: "act_16", acc: 30, user: "u_marcus", type: "visit", d: 9, summary: "Drop-in at Trinity Park. Met owner at the desk; too busy to sit. Left product one-pager + ROI card.", outcome: "Send pricing ranges by email" },
  { id: "act_17", acc: 42, user: "u_dalton", type: "email", d: 3, summary: "Sent financing sheet + April promo terms for Aurelia RF Pro to Classen Curve.", outcome: "Owner deciding this month" },
  { id: "act_18", acc: 47, user: "u_dalton", type: "note", d: 16, summary: "Vitania HIFEM installed at Sooner Weight. Set 30-day utilization review; collect muscle-preservation data for GLP-1 marketing.", outcome: "Closed-won" },
  { id: "act_19", acc: 45, user: "u_dalton", type: "meeting", d: 5, summary: "Met Jesse at Brookside Skin & Laser. Laser-throughput benchmarking conversation — wants photofacial speed numbers.", outcome: "Meeting set for next Tulsa trip" },
  { id: "act_20", acc: 36, user: "u_marcus", type: "call", d: 19, summary: "Quarterly check-in with Sun City Aesthetics in El Paso. GLP-1 program growing — tee up HIFEM pitch for next swing.", outcome: "Add to next West TX route" },
  { id: "act_21", acc: 41, user: "u_sofia", type: "visit", d: 6, summary: "Site visit at Aggieland Med Spa. Budget-conscious owner — positioned NovaLume with lease-to-own terms.", outcome: "Meeting set" },
  { id: "act_22", acc: 13, user: "u_sofia", type: "email", d: 8, summary: "Sent periorbital resurfacing case studies to Dr. Alvarez — tied Lumen Sculpt CO2 to blepharoplasty recovery package.", outcome: null },
  { id: "act_23", acc: 26, user: "u_marcus", type: "call", d: 3, summary: "Confirmed IPL demo date with Sofia Delgado at Plano Aesthetic Arts. GLP-1 conversation follow-up queued after demo.", outcome: "Demo confirmed" },
  { id: "act_24", acc: 22, user: "u_priya", type: "call", d: 12, summary: "Quick check-in with Coastal Bend Aesthetics. Scheduling next Corpus swing to combine with women's wellness visit.", outcome: null },
  { id: "act_25", acc: 52, user: "u_dalton", type: "visit", d: 22, summary: "RegenX install sign-off at Green Country Regenerative. Dr. Carter offered speaking-slot referral into functional medicine network.", outcome: "Closed-won" },
  { id: "act_26", acc: 19, user: "u_priya", type: "meeting", d: 4, summary: "First deep meeting with Dr. Vasquez at Memorial City — surgical scar refinement program pitch landed well.", outcome: "CO2 clinical review scheduled" },
  { id: "act_27", acc: 28, user: "u_marcus", type: "call", d: 11, summary: "ROI model walk-through with Paige at McKinney Skin & Body. Comparing truSculpt replacement economics.", outcome: "Owner reviewing numbers" },
  { id: "act_28", acc: 44, user: "u_dalton", type: "visit", d: 8, summary: "On-site at Edmond Med Spa. HRT + GLP-1 + aesthetics mix confirmed — HIFU tightening is the wedge product.", outcome: "Follow-up demo proposed" },
];

interface TaskSeed {
  id: string;
  acc: number;
  user: string;
  title: string;
  type: Task["type"];
  due: number; // +n future days, -n past due
  done?: boolean;
}

const TASKS: TaskSeed[] = [
  { id: "tsk_01", acc: 46, user: "u_dalton", title: "Send final revised bundle pricing to Utica Park practice manager", type: "email", due: 0 },
  { id: "tsk_02", acc: 6, user: "u_sofia", title: "Deliver trade-in appraisal document for SoCo Laser negotiation", type: "email", due: 1 },
  { id: "tsk_03", acc: 3, user: "u_sofia", title: "Send HIFU ROI model to Dr. Delacroix (Barton Creek)", type: "email", due: -1 },
  { id: "tsk_04", acc: 43, user: "u_dalton", title: "Run Lumen Sculpt CO2 demo at Nichols Hills Dermatology", type: "demo", due: 3 },
  { id: "tsk_05", acc: 12, user: "u_sofia", title: "Equipment demo at Stone Oak Dermatology", type: "demo", due: 4 },
  { id: "tsk_06", acc: 1, user: "u_sofia", title: "Send financing options for Cedar Park expansion to Brianna", type: "email", due: 2 },
  { id: "tsk_07", acc: 15, user: "u_priya", title: "Deliver final two-device contract to River Oaks Aesthetic Institute", type: "visit", due: 2 },
  { id: "tsk_08", acc: 16, user: "u_priya", title: "Send HIFEM + HIFU combo quote to Katy Slim", type: "email", due: -2 },
  { id: "tsk_09", acc: 24, user: "u_marcus", title: "Present training-bundle counter-offer at Uptown Dallas Med Spa", type: "visit", due: 1 },
  { id: "tsk_10", acc: 30, user: "u_marcus", title: "Email pricing ranges to Trinity Park Med Spa", type: "email", due: -1 },
  { id: "tsk_11", acc: 42, user: "u_dalton", title: "Call Classen Curve owner — proposal decision check-in", type: "call", due: 2 },
  { id: "tsk_12", acc: 26, user: "u_marcus", title: "IPL X demo at Plano Aesthetic Arts", type: "demo", due: 5 },
  { id: "tsk_13", acc: 36, user: "u_marcus", title: "Book West Texas swing: El Paso → Midland → Lubbock", type: "follow-up", due: 7 },
  { id: "tsk_14", acc: 17, user: "u_priya", title: "Schedule install-day photo shoot at Sugar Land Skin Center", type: "follow-up", due: 9 },
];

export function buildActivities(): Activity[] {
  return ACTS.map((a) => ({
    id: a.id,
    accountId: `acc_${String(a.acc).padStart(3, "0")}`,
    userId: a.user,
    type: a.type,
    at: daysAgo(a.d),
    summary: a.summary,
    outcome: a.outcome ?? undefined,
  }));
}

export function buildTasks(): Task[] {
  return TASKS.map((t) => ({
    id: t.id,
    accountId: `acc_${String(t.acc).padStart(3, "0")}`,
    userId: t.user,
    title: t.title,
    type: t.type,
    dueAt: t.due >= 0 ? inDays(t.due) : daysAgo(-t.due),
    done: t.done ?? false,
  }));
}
