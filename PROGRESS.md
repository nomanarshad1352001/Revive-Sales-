# PROGRESS — Revive Sales Command

Status of the functional first release (Sections 1–22). Updated with each delivery.

## ✅ Delivered in this release

### Milestone 1 — Foundation
- [x] App structure, navigation, design system (light "Botanical Clinical" theme, Fraunces + Manrope)
- [x] Vercel-safe runtime (no database dependency), local persistence
- [x] Login with 4 roles (RSM / ASM / TM / ADMIN) and role-card credential autofill
- [x] Dark-theme avoided per requirement; responsive desktop + iPhone layouts

### Milestone 2 — Core sales app
- [x] Command Dashboard (KPIs, map, coverage gaps, cold accounts, feed)
- [x] Accounts CRM: 54 fictional TX/OK accounts, search/filters/sort, full profiles
- [x] Contacts directory with roles, preferences, product interests
- [x] Activity/visit logging with real state changes everywhere (coverage, scorecards, radar)

### Milestone 3 — Territory & routing
- [x] Territory Coverage Radar: per-account + per-market days-since-visit, 30/60/90/120d thresholds
- [x] SVG TX/OK territory map, market table, field-day clustering recommendations
- [x] Smart Routes: start point, scored suggestion pool, nearest-neighbor optimize, save/reopen, complete/skip → reschedule, Google Maps launch links

### Milestone 4 — AI workflows
- [x] Prospect Radar page: rankings, first-touch queue, unexplored markets, authorized-source compliance panel
- [x] Portfolio Gap Intelligence: verified-fact vs AI-hypothesis separation, discovery questions, next steps, research freshness
- [x] 30-Second Pre-Call Brief (printable)
- [x] Voice Visit Logger: browser dictation or typing → structured extraction → review & approve → timeline + follow-up + email draft handoff
- [x] AI Assistant: intents for product potential, coverage, routes, reps-behind, quarter-closing, email drafts — with uncertainty disclosure and no solo mutations

### Milestone 5 — Integration preparation
- [x] Nuvue: public API not verifiable at build time — simulated connector (labeled) + working CSV bridge + source-of-truth rules + investigation notes
- [x] Outlook/Graph: draft → approve → simulated send → 2-step sequences with stop conditions + immutable audit trail; Graph production requirements documented
- [x] Email content compliance: approved-materials library only

### Milestone 6 — Management & handoff
- [x] Pipeline: kanban, opportunity register (value/probability/close date/demo/financing/next step), monthly & quarterly weighted forecast, hygiene alerts
- [x] Team Scorecards vs runtime-editable role targets (daily/weekly/30d/90d)
- [x] Reports: daily digest + weekly territory review, configurable schedule/timezone
- [x] Product Library: admin-editable; AgeJET & TensaMax discontinued and excluded
- [x] Team management: add/deactivate/reassign users
- [x] Settings: thresholds, targets, schedules, dataset reset, architecture & cost docs
- [x] Automated test suite (39 tests: engines, store workflows, and client-side smoke renders of every page — `npx vitest run`)
- [x] README.md, CLAUDE.md, PROGRESS.md

## 🔜 Next phase (priced separately, not in this release)

- [ ] Supabase Postgres + Auth + RLS (the `store.ts` seam swap — see CLAUDE.md)
- [ ] Live Microsoft Graph sending after IT consent
- [ ] Real Nuvue sync once official API credentials exist
- [ ] Server-side Claude API for extraction/assistant/briefs
- [ ] Scheduled report delivery (cron) and in-app notifications
- [ ] PostGIS-powered radius queries and Mapbox basemap tiles
- [ ] Prospect discovery connectors (Places API / licensed directories, budget-gated)

## ⚠️ Integrity labels that must survive edits

- "Simulated" badges on Nuvue/Outlook until live integration is real
- Demo-data watermark on pipeline/revenue analytics
- AI hypothesis disclaimers on opportunity cards and pre-call briefs
- Research freshness / confidence flags on accounts

## 📹 Handoff session protocol (live meeting)

1. Screen-share walkthrough of the Section 20 script (14 steps)
2. You drive one real change in Claude Code, e.g. "add a filter for accounts not visited in 90 days" — developer observes, doesn't touch the keyboard
3. Repo transfer to your GitHub org, plus Vercel project under your account
4. Sign-off on PROGRESS.md as the acceptance record
