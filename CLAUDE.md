# CLAUDE.md — Revive Sales Command

Guidance for Claude Code sessions maintaining this project. Read this before editing.

## What this is

A field-sales CRM / command center for Revive Regenerative (capital aesthetic equipment, TX & OK). Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 + Zustand. **No database in this release** — data lives in `src/lib/store.ts` (zustand/persist → localStorage). It deploys to Vercel as-is.

## Non-negotiable rules (product logic)

1. **Never recommend discontinued products** — anything with `status: "discontinued"` in `src/lib/data/products.ts` (AgeJET, TensaMax). `gapAnalysis()` filters these; do not bypass.
2. **AI ≠ verified fact.** Opportunity language must frame absence-from-public-data as a hypothesis ("no platform identified — ask"), never "they lack X". Disclaimers live in `src/lib/intel.ts` (`caution` strings) and `src/components/intel.tsx`.
3. **Simulations stay labeled.** Nuvue sync and Outlook sending are simulated. Do not remove "Simulated" badges without shipping a real authorized integration.
4. **Assistant never mutates alone.** `src/lib/assistant.ts` returns review cards; saves happen only via user-confirmed actions.
5. **Demo data is fictional.** Don't paste real CRM data, people, or accounts into seeds.
6. All date math uses real stored timestamps (`lastVisitAt`, `lastContactAt`) — no fabricated recency.
7. **Zustand selectors must return stable references.** Never put `.filter() / .map() / .slice()` inside `useAppStore((s) => ...)` — that allocates a new array every call and causes an infinite render loop. Select the raw array, then filter inside a `useMemo`. (A real production bug — pages crashed with "This page couldn't load". The `tests/smoke.test.tsx` suite exists to catch this.)

## File map (where things live)

| You want to change… | Go to |
|---|---|
| Navigation / sidebar | `src/components/shell.tsx` (`NAV_GROUPS`) |
| Visual theme (colors/fonts) | `src/app/globals.css` `:root` vars + `@theme` |
| Card/button/badge styles | `src/components/ui.tsx` |
| Data model | `src/lib/types.ts` → then seeds in `src/lib/data/*` and `STORE_VERSION` bump |
| Seed/reset dataset | `src/lib/data/` (`accounts.ts`, `users.ts`, …) + `SEED_STATE` in `store.ts` |
| Store actions | `src/lib/store.ts` |
| Voice-note parsing | `src/lib/extract.ts` |
| Product-fit engine | `src/lib/intel.ts` |
| Assistant intents | `src/lib/assistant.ts` (+ quick prompts at bottom) |
| Maps / routing math | `src/lib/geo.ts` |
| Each screen | `src/app/(app)/<route>/page.tsx` |
| Email draft/sequences | `src/app/(app)/email/page.tsx` + store `sequences` |
| Tests | `tests/*.test.ts` |

## Data-model changes (the one procedure that matters)

Adding a field to accounts/store entities, in order:
1. Add it to the interface in `src/lib/types.ts`
2. Give it a default in seeds (`src/lib/data/*`) and in `addAccount`/creator actions
3. Bump `STORE_VERSION` in `src/lib/store.ts` (stale persisted data is then discarded — acceptable in demo)
4. Update forms/UI to display it
5. Update/add tests
6. Validate (commands below)

## Recipes for common requests

- **"Add a filter showing practices not visited in 90 days"** → the pattern already exists in `src/app/(app)/coverage/page.tsx` (`daysF` select) and can be copied to any table page.
- **"Change TM daily goals"** → edit `SEED_STATE.settings.targets` defaults in `src/lib/store.ts` (runtime-editable at `/settings` too).
- **"Add a product"** → `/products` page at runtime, or add a record to `src/lib/data/products.ts` with `status: "active"`.
- **"Change dashboard layout"** → `src/app/(app)/dashboard/page.tsx` — sections are independent `<Card>` blocks in a grid.
- **"Fix account search"** → filter logic in `src/app/(app)/accounts/page.tsx` (`filtered` memo haystack).
- **"New weekly report"** → add a generator section pattern in `src/app/(app)/reports/page.tsx`.

## Conventions

- Tailwind utility classes; brand colors via CSS vars (`var(--brand)`, `var(--gold)`, …), see `globals.css`
- Icons: `lucide-react` only — no emojis in UI
- Components: typed props, `"use client"` for anything interactive
- Money: `fmtMoney()`; times: `relTime() / fmtDate()` from `src/lib/utils.ts`
- IDs: `uid(prefix)` from utils
- Forms must validate and disable submit until valid
- Keep simulated features clearly badged

## Validation ritual (always, before finishing)

```bash
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run build
npx vitest run
```

All four must pass. Production start is verified via the platform's build & start step, which health-checks `/api/health`.

## Testing philosophy

Vitest suites cover: extraction (`tests/extract.test.ts`), gap-intel safety (`tests/intel.test.ts`), store workflows mirroring the Section 20 demo script (`tests/store.test.ts`), and assistant intents (`tests/assistant.test.ts`). Add a test whenever you change engine logic in `src/lib/`.

## Planned production seams (don't build speculatively)

- `store.ts` → Supabase queries (auth + RLS). The UI depends on `useAppStore` selectors; replace internals, keep selectors.
- `extract.ts` / `assistant.ts` `respond()` → server-side Claude API route; keep return shapes identical.
- Email send → Microsoft Graph route after IT consent; store `pendingDraft` already models the handoff.
- Nuvue → official API when credentials arrive; `crmStatus` already tracks queue state.
