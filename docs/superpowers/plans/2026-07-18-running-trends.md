# Running Trends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Running section to the Trends page computed from existing WHOOP + Apple Health data.

**Architecture:** A pure compute module (`lib/trends/running.ts`) mirroring `lib/trends/compute.ts` — `(rows, params) → series/summary`, unit-tested with vitest — plus a page section in `app/[locale]/trends/page.tsx` rendered with the existing chart primitives. No new queries, no schema changes.

**Tech Stack:** Next.js 14 App Router (server component page), TypeScript, vitest, next-intl.

**Spec:** `docs/superpowers/specs/2026-07-18-running-trends-design.md`

## Global Constraints

- Timezone: all date bucketing via `dateKey` / `weekStartKey` from `lib/trends/compute.ts` (America/Mexico_City).
- No I/O in `lib/trends/*` — pure functions only.
- Chart colors reuse the page constants: MINT `#00d26a`, CYAN `#38bdf8`, VIOLET `#a78bfa`, AMBER `#fbbf24`.
- Messages must be added to all three locales: `messages/en.json`, `messages/es.json`, `messages/de.json`.
- Test command: `npx vitest run lib/trends/running.test.ts`; full suite `npm test`.

---

### Task 1: Compute module `lib/trends/running.ts` (TDD)

**Files:**
- Modify: `lib/trends/compute.ts` (export the private `dayNumber` helper)
- Create: `lib/trends/running.ts`
- Test: `lib/trends/running.test.ts`

**Interfaces:**
- Consumes: `dateKey`, `weekStartKey`, `linearSlopePerDay`, `dayNumber`, `DatedValue`, `Chip` from `./compute`.
- Produces (used by Task 2):

```ts
export interface RunRow {
  start: string                 // start_date_utc ISO
  source: string                // 'whoop' | 'apple_health' | ...
  distanceM: number | null
  movingTimeS: number | null
  avgHrBpm: number | null
  hrZones: RunZones | null
}
export type RunZones = {
  z0_min?: number; z1_min?: number; z2_min?: number
  z3_min?: number; z4_min?: number; z5_min?: number
  z1_s?: number; z2_s?: number; z3_s?: number; z4_s?: number; z5_s?: number
}
export interface RunningWeek { week: string; km: number; runs: number; longestKm: number }
export interface RunningTrends {
  weeks: RunningWeek[]
  pace: { points: DatedValue[]; slopeSPerKmPerWeek: number | null; chip: Chip | null; avg4wS: number | null; bestS: number | null }
  efficiency: { points: DatedValue[]; slopePctPerWeek: number | null; chip: Chip | null; latest: number | null }
  zoneMix: { easyPct: number; modPct: number; hardPct: number } | null
  vo2: { points: DatedValue[]; latest: number | null; delta: number | null }
  summary: { thisWeekKm: number; avg4wKmPerWeek: number | null; totalRuns: number; totalKm: number }
}
export function dedupeRuns(runs: RunRow[]): RunRow[]
export function computeRunningTrends(
  runs: RunRow[],
  vo2Rows: { date: string; vo2: number | null }[],
  todayKey: string,
): RunningTrends
export function formatPace(sPerKm: number | null): string   // 342 → "5:42", null → "—"
```

Behavior (from spec): pace eligibility `distanceM ≥ 1000 && movingTimeS > 0 && 150 ≤ pace ≤ 900`; pace chip `up` when slope ≤ −2 s/km/wk, `down` ≥ +2; EF `(distanceM/movingTimeS)*60/avgHrBpm` rounded to 2, chip ±1%/wk of mean; zone bands easy Z0–Z2 / mod Z3 / hard Z4–Z5, minutes-or-seconds keys like the page's `zoneMinutes`; dedupe keeps `whoop` over overlapping other-source rows, first row for same-source overlaps; slopes need ≥ 3 points; `avg4wKmPerWeek` = km in trailing 28 days ÷ 4, rounded to 1.

- [ ] **Step 1: Write the failing tests** — cover: `formatPace` (342 → "5:42", null → "—", rounding); `dedupeRuns` (whoop kept over overlapping apple run, non-overlapping both kept, same-source overlap keeps first); weekly bucketing + longest run + distance-less run counts as run with 0 km; pace filtering (short run excluded, absurd pace excluded) and slope/chip on an improving series; EF values and chip; zone mix percentages incl. `_s` second-keys; vo2 latest/delta and null-filtering; empty inputs → empty weeks, null slopes/chips/zoneMix; summary this-week and 4-week averages with a fixed `todayKey`.
- [ ] **Step 2: Run to verify failure** — `npx vitest run lib/trends/running.test.ts` → fails: module not found.
- [ ] **Step 3: Export `dayNumber` from compute.ts; implement `lib/trends/running.ts`.**
- [ ] **Step 4: Run to verify pass** — same command, all green; then `npm test` for the full suite.
- [ ] **Step 5: Commit** — `feat: running trends compute helpers`

### Task 2: Trends page section + i18n

**Files:**
- Modify: `app/[locale]/trends/page.tsx`
- Modify: `messages/en.json`, `messages/es.json`, `messages/de.json`

**Interfaces:**
- Consumes: `computeRunningTrends`, `dedupeRuns`, `formatPace`, types from Task 1; existing `BarChart`, `BigSpark`, `MiniStat`, `ChartTitle`, `AxisRow`, `StatChip`, `Panel`, `SectionLabel`, `EmptyNote`, `Legend` in the page; `HrZones` from `@/types/database`.

Section layout (between Load and Fuel), rendered only from already-fetched data:

1. `SectionLabel` `sectionsV2.running`.
2. If no runs in range: single `Panel` with `EmptyNote` (`emptyV2.noRuns`).
3. Else: `MiniStat` row ×4 — this-week km (MINT, sub = 4-wk avg), avg pace 4w (CYAN, `formatPace`, sub = best pace), EF latest (VIOLET, sub = slope %/wk), VO₂max latest (AMBER, sub = delta).
4. `Panel` weekly km `BarChart` (MINT) with runs-count chip and `AxisRow` of week labels.
5. Two-col grid: pace `BigSpark` (CYAN) plotting **negated** pace values (faster = up) with slope `StatChip`; EF `BigSpark` (VIOLET) with slope chip. Each panel hidden behind ≥ 2-point guard with `EmptyNote` fallback.
6. Two-col grid: intensity-mix horizontal bars (reuse the HR-zones bar idiom: easy `#22c55e`, mod `#f59e0b`, hard `#ef4444`) with easy-% chip; VO₂max `BigSpark` (AMBER) with delta chip. `EmptyNote` fallbacks (`noRunZones`, `noVo2`).

New message keys under `trends`: `sectionsV2.running`; `running.{thisWeek,avgPace4w,bestPace,efficiency,efficiencySub,vo2max,weeklyKm,longestRun,runsCount,pace,paceSub,paceSlope,zoneMix,zoneMixSub,easy,moderate,hard,vo2Sub}`; `emptyV2.{noRuns,noRunZones,noVo2}`.

- [ ] **Step 1: Add locale messages (en/es/de).**
- [ ] **Step 2: Wire the section** — map `activities.filter(a => a.activity_category === 'run' && a.start_date_utc)` → `RunRow`, `metrics` → vo2 rows, `dedupeRuns` → `computeRunningTrends`, render per layout above.
- [ ] **Step 3: Verify** — `npm test`, `npx tsc --noEmit`, `npm run lint`; load `/trends` in the dev server and screenshot the section.
- [ ] **Step 4: Commit** — `feat: running trends section on trends page`

## Self-review notes

- Spec coverage: every spec metric maps to Task 1 outputs and a Task 2 render slot; dedupe is Task 1; empty states Task 2 step 2.
- Type consistency: `RunningTrends` field names in Task 2 match Task 1 exactly.
- Phase 2 items (plugin HR/cadence/elevation) intentionally absent.
