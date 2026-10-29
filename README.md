# Revive Sales Command

An AI-assisted field-sales command center for **Revive Regenerative** — covering capital aesthetic-equipment sales across **Texas & Oklahoma**.

Built with Next.js 16, React 19, TypeScript, and Tailwind CSS 4. The functional first release runs **without a database** (all data persists in the browser via localStorage), so it deploys to Vercel with zero configuration. Every screen is fully interactive — no decorative buttons.

---

## 🚀 Quick Start

```bash
npm install
npm run dev        # http://localhost:3000
```

### Sign in (demo roles)

On the login page, click any role card to **autofill credentials**, then enter. All four demo users share the password `demo1234`.

| Role | Persona | Sees |
|---|---|---|
| **RSM** | Elena Vasquez | Whole region, team performance, forecasts, reports |
| **ASM** | Marcus Webb | North Texas book, routes, pipeline |
| **ASM** | Priya Nair | Houston & Gulf book |
| **TM** | Sofia Marsh / Dalton Reed | Central TX / Oklahoma field book |
| **ADMIN** | Riley Chen | User + product + settings management |

**Reset the demo dataset** any time from the user menu (top-right) → *Reset demo dataset*, or Settings.

---

## ✅ What Actually Works (Section 20 verification script)

All of these are genuine behaviors — confirmed by automated tests (`tests/`):

1. Add a fictional medical spa account (Accounts → Add Account) and save it
2. Search for it, open its profile
3. Assign it to a salesperson (owner select)
4. Log a visit (top bar → *Dictate Visit*, or account page → Log Activity) and save notes
5. Watch the account's last-visit date update instantly
6. Open Territory Coverage — the market and account color/days recalc from the real stored visit date
7. Add accounts to a daily route (Smart Routes → New Route → suggestion pool)
8. Save and reopen the route (it persists across refreshes)
9. Record calls and meetings (Log Activity modal, types: call/visit/email/demo/meeting/note)
10. Watch Team Scorecards update vs role targets (logged activity only)
11. Create follow-up tasks (from any log, account page, or route skip)
12. Paste a visit note into Voice Logger → extracted fields → approve → **suggested email** hands to Email Concierge
13. Open Pipeline → an opportunity card (pencil icon) — value, probability, close date, demo/financing/next step
14. Refresh the browser — everything is retained (localStorage persistence)

### Clearly labeled simulations (by design)

- **Nuvue CRM sync** — simulated connector + working CSV export bridge (no public Nuvue API was verifiable at build time; see `/integrations`)
- **Outlook sending** — drafts and 2-step sequences are recorded as *simulated sends* only; Microsoft Graph requires IT-approved app registration
- **AI assistant / voice extraction / product-fit intelligence** — deterministic in-app engines in this build, LLM-API-ready, no external calls
- **Pipeline & revenue numbers** — demo values, explicitly watermarked; never presented as company financials

---

## 🗺️ Feature Map

| Section | Where | Highlights |
|---|---|---|
| Login & roles | `/login` | Role cards with autofill · 4 personas |
| Command Dashboard | `/dashboard` | KPIs · TX/OK account map · coverage gaps · cold accounts · follow-up radar · feed |
| AI Assistant | `/assistant` | Natural-language queries over real records · route planning · no auto-mutations |
| Prospect Radar | `/radar` | Highest-potential ranking · first-touch queue · unexplored markets · authorized-source compliance |
| Territory Coverage | `/coverage` | Per-account & per-market days-since-visit · 30/60/90/120d thresholds · field-day clustering |
| Smart Routes | `/routes` | Start point + radius · scored suggestions · nearest-neighbor optimization · save/reopen · done/skip → reschedule · Google Maps directions |
| Accounts CRM | `/accounts`, `/accounts/[id]` | Full profiles · stage stepper · priorities · portfolio-gap intelligence · 30-sec pre-call brief · notes |
| Contacts | `/contacts` | Global directory · decision roles · preferences · product interests |
| Visit Notes | `/activities` (top bar: **Dictate Visit**) | Voice/text capture → structured extraction → review & approve |
| Email Concierge | `/email` | Approved-materials-only drafting · 2-step sequences · stop conditions · audit trail |
| Pipeline & Forecast | `/pipeline` | Drag-and-drop board · opportunity register · monthly/quarterly weighted forecast · hygiene alerts |
| Team Scorecards | `/scorecard` | Daily/weekly/30d/90d vs targets · per-role editable |
| Reports | `/reports` | Daily 5:30 PM CT digest · Weekly territory review · configurable schedule/timezone |
| Product Library | `/products` | Admin-editable portfolio · discontinued lines (AgeJET/TensaMax) excluded from recommendations |
| Integrations | `/integrations` | Nuvue status & source-of-truth rules · Graph path · CSV exports |
| Team & Territory | `/team` | Dynamic users · activate/deactivate · account reassignment |
| Settings | `/settings` | Thresholds · targets · report schedule · architecture · costs · security · milestones |

---

## 🏗️ Architecture

```
src/
├── app/                    Next.js App Router
│   ├── login/              Public login page
│   ├── (app)/              Authenticated workspace (guarded by AppShell)
│   │   ├── dashboard/ assistant/ radar/ coverage/ routes/
│   │   ├── accounts/[id]/ contacts/ pipeline/ email/
│   │   ├── activities/ scorecard/ reports/ products/
│   │   ├── integrations/ team/ settings/
│   └── api/health/         Health check
├── components/             shell (nav), ui primitives, forms/modals,
│                           intel (gap analysis UI), voice (visit logger),
│                           viz (charts), TerritoryMap (SVG map)
└── lib/
    ├── store.ts            Zustand + persist store  ← THE data layer
    ├── types.ts            Every entity's TypeScript contract
    ├── extract.ts          Visit-note extraction engine (voice notes)
    ├── intel.ts            Portfolio gap analysis + briefings
    ├── assistant.ts        AI assistant intent engine
    ├── geo.ts              TX/OK outlines, projection, Haversine, routing
    └── data/               Seed data (fictional): accounts, users,
                            activities, contacts, products, materials
tests/                      Vitest suite (22 tests)
README.md · CLAUDE.md · PROGRESS.md
```

**Data today:** client-side Zustand store persisted to localStorage.
**Data in production:** Supabase Postgres + PostGIS — the store layer is the single seam to replace. See `CLAUDE.md` for the swap recipe.

---

## 🔐 Security posture

- Role-aware UI and permissions (RSM/ADMIN manage users, targets, products)
- No API keys or secrets in this codebase — by design
- Audit trail for email/sequence/sync actions (`/email`, `/integrations`)
- Demo data is fictional by policy; production data requires company authorization
- Production checklist: Supabase Auth, RLS policies, server-side env vars, HTTPS-only deployment

## 💰 Estimated ongoing costs (5–8 reps)

| Item | Pilot | Scaled |
|---|---|---|
| Vercel | $0–20/mo | $20–60/mo |
| Supabase (Postgres+PostGIS) | $0–25/mo | $25–100/mo |
| Maps (Mapbox/Google) | $0–40/mo | $50–300/mo |
| Claude API (assistant/briefs) | $15–60/mo | $100–400/mo |
| Speech-to-text | $0–15/mo | $30–100/mo |
| Microsoft Graph | $0 (existing M365) | $0 |
| Optional prospect enrichment | $0 | $50–150/mo |
| **Typical total** | **~$25–150/mo** | **up to ~$800/mo** |

Your personal Claude subscription is **not** used by the deployed app — production AI calls use a dedicated server-side API key.

## 📦 Third-party libraries & licenses (full disclosure)

| Library | License | Purpose |
|---|---|---|
| next / react / react-dom | MIT | Framework & UI |
| tailwindcss | MIT | Styling |
| zustand | MIT | State + persistence |
| framer-motion | MIT | Motion |
| lucide-react | ISC | Icons |
| typescript | Apache-2.0 | Types |
| vitest | MIT | Tests |

No proprietary starter kits — you own everything in this repository.

## 📋 Commands

```bash
npm run dev         # local dev
npm run build       # production build
npm start           # serve production build
npm run typecheck   # TypeScript
npx vitest run      # automated tests
```

## 🌱 Environment variables

This build needs **none**. Future production variables (documented when wired):

```
DATABASE_URL            # Supabase Postgres
ANTHROPIC_API_KEY       # server-side AI
MS_GRAPH_CLIENT_ID      # Outlook, after IT consent
MS_GRAPH_CLIENT_SECRET
NUVUE_API_KEY           # if/when Nuvue issues credentials
```

## 🤝 Handoff & maintenance

- `CLAUDE.md` — architecture + conventions + step-by-step recipes for the exact changes you'll ask for later
- `PROGRESS.md` — what's done, what's next
- Tests run with `npx vitest run` (included in every delivery validation)
- Recorded walkthrough & a supervised "you make the change" Claude Code session are part of the live handoff meeting — the scripts for both are in `PROGRESS.md`
