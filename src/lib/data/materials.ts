import type { EmailMaterial } from "../types";

// Approved outbound content library (Section 10 compliance).
// Only items in this library may be attached to concierge emails.
export const SEED_MATERIALS: EmailMaterial[] = [
  {
    id: "m_avira_clinical",
    name: "Avira RF Clinical Overview (Approved 2025)",
    type: "clinical",
    productIds: ["p_avira"],
    description: "Approved clinical indications, treatment parameters and safety profile for Avira RF.",
    approvedOn: Date.parse("2025-06-02"),
  },
  {
    id: "m_avira_ba",
    name: "Avira RF Before & After Portfolio (Approved)",
    type: "before-after",
    productIds: ["p_avira"],
    description: "De-identified, consent-cleared before/after photography set for Avira RF skin remodeling.",
    approvedOn: Date.parse("2025-05-19"),
  },
  {
    id: "m_retraction_clinical",
    name: "Retraction RFAL Clinical Packet (Approved)",
    type: "clinical",
    productIds: ["p_retraction"],
    description: "Approved mechanism-of-action and indication language for Retraction skin tightening.",
    approvedOn: Date.parse("2025-06-11"),
  },
  {
    id: "m_iblaze_clinical",
    name: "iBlaze CO2 Treatment Guide (Approved)",
    type: "clinical",
    productIds: ["p_iblaze"],
    description: "Approved resurfacing protocols and downtime guidance for iBlaze CO2.",
    approvedOn: Date.parse("2025-04-28"),
  },
  {
    id: "m_fraclight_brochure",
    name: "Fraclight IPL Practice Brochure (Approved)",
    type: "brochure",
    productIds: ["p_fraclight"],
    description: "Approved patient-facing and practice-facing overview of Fraclight IPL capabilities.",
    approvedOn: Date.parse("2025-05-30"),
  },
  {
    id: "m_glp1_roi",
    name: "GLP-1 Adjunct ROI Model — Emulsify + Retraction (Approved)",
    type: "roi",
    productIds: ["p_emulsify", "p_retraction"],
    description: "Approved financial modeling worksheet for adjunct body-contouring programs in weight-loss clinics.",
    approvedOn: Date.parse("2025-06-20"),
  },
  {
    id: "m_skinhealth_brochure",
    name: "Hydra SH Skin-Health Program Overview (Approved)",
    type: "brochure",
    productIds: ["p_hydrash"],
    description: "Approved overview of the Hydra SH membership-engine treatment program.",
    approvedOn: Date.parse("2025-03-14"),
  },
  {
    id: "m_colormax_clinical",
    name: "Colormax Pigment & Tattoo Clinical Summary (Approved)",
    type: "clinical",
    productIds: ["p_colormax"],
    description: "Approved indication and session-count language for Colormax picosecond treatments.",
    approvedOn: Date.parse("2025-05-07"),
  },
  {
    id: "m_demo_invite",
    name: "Demonstration Invitation Template (Approved)",
    type: "video",
    productIds: [],
    description: "Approved demonstration-day invitation language and logistics checklist for any portfolio product.",
    approvedOn: Date.parse("2025-01-11"),
  },
];
