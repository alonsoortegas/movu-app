# Design: Port lifeos Workout, Nutrition, and Whoop/Trends into movu

**Date:** 2026-07-17
**Status:** Approved pending user review
**Source app:** `../lifeos` (single-user personal life dashboard)
**Target app:** movu (multi-user fitness platform, Next.js App Router + Drizzle + Supabase auth + next-intl)

## Goal

Productize lifeos' WorkoutTab, NutritionTab, WhoopTab, and TrendsTab for all movu
users. lifeos' single-user assumptions (plans and food catalogs seeded via SQL
migrations, browser-side Supabase queries, English-only, inline styles) are replaced
with movu-native patterns: per-user data in Drizzle-managed tables, server-side data
access, Tailwind + movu mobile components, es/en/de i18n.

## Decisions made during brainstorming

| Decision | Choice |
|---|---|
| Port goal | Productize for all movu users (not personal-use port, not UI-only) |
| Plan authorship | User-authored in-app (no AI generation in this phase) |
| Sequencing | One spec + one implementation plan, executed in phases |
| Nutrition AI (meal-text extraction, Whoop dynamic targets) | Out of scope for now |
| Porting approach | Hybrid: port pure-logic libs + chart primitives nearly verbatim with tests; rebuild pages, schema, and data access movu-style |
| Whoop charts placement | Section inside `/trends` (no new nav item) |
| Existing movu `/trends` page | Replaced by lifeos-style trends (ranges, phases, verdicts) |
| Substitution groups | Ported — attached to the user's food catalog, surfaced as swap options during logging |

## What ports verbatim (with unit tests)

These modules have no data-layer or single-user coupling and carry debugged logic
worth keeping. They move into movu with minimal edits (imports, types) plus vitest
coverage:

- `lifeos/components/ui/charts.tsx` (~225 lines: `ChartTitle`, `AxisRow`, `BigSpark`,
  `DualSpark`, `BarChart`, `Legend`) plus `Sparkline` and `ProgressBar` →
  `movu/components/charts/`. They render inline SVG themed via CSS variables; movu
  already uses the same `var(--text)` / `var(--surface)` convention.
- Workout logic from `WorkoutTab.tsx` top-level helpers and `lib/workout.ts`:
  `parseWeightInput`, `parseTopReps`, `parseReps`, `parseRpe`,
  `getProgressionSuggestion` (+2.5 kg when last set hit the top of the rep range),
  day ordering, plan-week status (generalized from hardcoded `TRAINING_BLOCKS` to
  per-user plan rows).
- Nutrition math from `lib/nutrition.ts` and `lib/nutrition-portions.ts`:
  `calculateConsumed`, `calculateRemaining`, `scaleFood`, portion option building,
  saved-portion merging.
- Trends computations from `lib/trends.ts`: series bucketing per range, weight trend
  slope, phase verdicts (on_track / fast / slow), chips (up / flat / down).
- `lib/whoop-utils.ts`: `sportColor`, `avg`, `shortDate`, `sleepHM` formatting.

What does **not** port: lifeos page components (rebuilt), its browser-side Supabase
client pattern (movu loads via server components + Drizzle, mutates via
`app/api/*` routes), `lib/whoop-data.ts` sync hook (movu has its own
`app/api/whoop/*` integration), and every SQL-seeded personal dataset.

## Schema (new Drizzle tables in `db/schema.ts`)

All new tables are user-scoped (`user_id` referencing `user_profiles.id`, cascade
delete) with owner-scoped RLS, matching movu's existing tables.

### Workout

- `workout_plans` — id, user_id, name, start_date, weeks, active, notes,
  created_at. Replaces lifeos' hardcoded `TRAINING_BLOCKS`; "current week" derives
  from `start_date`.
- `workout_plan_sessions` — id, plan_id (cascade), week_number, day_of_week,
  title, session_type (`strength` | `activation` | `cardio` | `other`), notes.
- `workout_plan_exercises` — id, session_id (cascade), order_index,
  exercise_name, prescribed_sets, prescribed_reps (text: "4-5", "8/leg"),
  prescribed_weight, weight_unit, target_rpe (text), superset_group,
  rest_seconds, is_isometric, notes. (Modality columns mirror lifeos'
  `20260629` migration.)
- `workout_set_logs` — id, user_id, exercise_id (nullable ref to
  `workout_plan_exercises`), exercise_name (denormalized), set_number, weight_kg,
  reps, rpe, notes, logged_at. Weights stored in kg (lifeos' `weight_lbs` column
  actually held kg; the port fixes the naming).

### Nutrition

- `food_items` — id, user_id, name, category (`protein` | `carb` | `fat` |
  `mixed` | `veg`), portion_label, grams, calories, protein_g, carbs_g, fat_g,
  tracking_unit (`piece` | `cup` | `grams` | `scoop` | `slice`), notes. Per-user
  catalog; users start empty and add foods via the catalog editor.
- `saved_food_portions` — id, user_id, food_item_id, label, quantity, macros.
  Remembers a user's habitual portions (ports lifeos' `saved_food_portion`).
- `food_substitution_groups` — id, user_id, name, macro_type (`carb` |
  `protein`), target_macro_g, notes.
- `food_substitution_group_items` — id, group_id (cascade), food_item_id
  (cascade), quantity, label.
- `nutrition_targets` — id, user_id, day_type (`hard` | `moderate` | `rest`),
  calories_target, protein_target, carbs_target, fat_target. One row per day-type
  per user; a user who wants a single flat target keeps all three rows equal (the
  editor offers "same every day").
- `meal_logs` — id, user_id, date, meal_name (`breakfast` | `midday` |
  `pre_workout` | `post_workout` | `dinner` | `snack`), logged_at, notes.
- `meal_log_items` — id, meal_log_id (cascade), food_item_id (nullable — custom
  ad-hoc entries allowed, as in lifeos' `20260708` migration), name, quantity,
  calories, protein_g, carbs_g, fat_g. Macros denormalized at log time so later
  catalog edits don't rewrite history.

- `nutrition_days` — id, user_id, date, day_type. Unique (user_id, date). Slimmer
  than lifeos' `nutrition_day`: it only pins which day type applies to a date; the
  day's targets are resolved at read time from `nutrition_targets`, so targets are
  never duplicated per date.

### Trends

- `training_phases` — id, user_id, kind (`bulk` | `cut` | `maintenance`),
  start_date, end_date (nullable = ongoing), target_rate_kg_per_week (nullable).
  Powers phase-aware weight verdicts. Managed from the trends page (small inline
  editor) or profile.

### Whoop

No new tables. The Whoop section renders from movu's existing `daily_metrics`
(recovery, HRV, RHR, strain), `sleep_logs` (durations, stages, performance),
`activities` (strain, calories, `hr_zones` jsonb), and `body_measurements`.

## Pages

### `/plan` — Workout (replaces current demo-data page)

- **This week view:** sessions of the user's active `workout_plans` week, day by
  day; today's session highlighted.
- **Session logger (ported UX):** expandable exercise cards with prescribed
  sets × reps @ weight / RPE, per-set logging with weight text input (accepts
  "," and "." decimals), rep and RPE pickers, progression hint when the last
  logged set hit the top of the rep range, per-exercise history of recent logs.
- **Plan editor (new):** create/edit plans → weeks → sessions → exercises.
  CRUD forms following movu's existing form idioms (`registro` page). Week
  duplication ("copy week 1 to weeks 2–4") to make authoring tolerable.
- **Empty state:** no active plan → prompt to create one.

### `/trends` — Trends + Recovery (replaces current 30-day page)

- **Trends section (ported TrendsTab):** range selector (4w / 12w / 6m / all);
  weight sparkline with phase bands and verdict chip (on track / too fast / too
  slow vs. the active phase's target rate); calories and strain series; activity
  volume bars. Data: `body_measurements`, `daily_metrics`, `meal_logs` (logged
  calories), `activities`.
- **Recovery section (ported WhoopTab):** recovery / HRV / RHR sparks, sleep
  duration + stages bars, strain vs. recovery dual spark, HR-zone distribution,
  weight from body measurements; Whoop sync status + connect CTA reusing movu's
  existing `app/api/whoop/*`. Degrades gracefully for users without Whoop
  (HealthKit/manual data still renders; Whoop-only charts show a connect prompt).
- **Phase editor:** inline management of `training_phases`.

### `/nutricion` — Nutrition (new page, new nav item)

The bottom nav grows to 6 items (dashboard, trends, registro, plan, nutricion,
perfil). If the compact dock geometry can't take a 6th item comfortably, fallback:
nutrition entry point as a card on the dashboard — flagged at implementation time.

- **Today view:** targets vs. consumed (calories ring + macro progress bars,
  ported math), day-type selector (hard / moderate / rest), meals with logged
  items.
- **Logging:** pick from catalog with portion options (saved portions first),
  quantity stepper, swap suggestions from the food's substitution groups,
  ad-hoc custom entry (name + macros).
- **Catalog editor (new):** CRUD for `food_items`, substitution groups, targets
  per day type.

### Out of scope

Meal-text AI extraction, Whoop-driven dynamic targets, lifeos' Today / Focus /
Finance tabs, todos, AI briefs, share-to-text. The existing `/registro` (class /
cardio logging) and dashboard stay as they are, except the dashboard may link to
the new pages.

## Data access & i18n

- Reads: server components query Drizzle directly (movu's `/trends` pattern).
- Writes: JSON `app/api/*` route handlers (movu's `activities` pattern):
  `api/plan/*` (plans, sessions, exercises, set logs), `api/nutrition/*`
  (days, meals, items, foods, groups, targets), `api/phases/*`.
- Client components only where interaction demands it (set logger, meal logger,
  editors) — they call the API routes, mirroring `registro`.
- All strings via next-intl in `messages/{es,en,de}.json`. Spanish is the primary
  market (CDMX); en/de translated alongside.
- New migrations generated via drizzle-kit; RLS policies added in SQL migration
  files following movu's existing approach.

## Testing

- Vitest unit tests for every ported logic module (parsers, progression, macro
  math, portion building, trend verdicts) — port behavior pinned by tests before
  pages are built on top.
- Existing lifeos tests (`__tests__/`) mined for cases where they cover ported
  functions.
- Page-level flows verified manually per phase (log a set, log a meal, see
  verdicts) — consistent with movu's current test footprint.

## Phasing (single implementation plan, four phases)

0. **Foundation:** chart primitives + logic libs + tests; full schema migration
   + RLS; i18n keys scaffolding.
1. **Whoop/Trends:** rebuild `/trends` with trends + recovery sections and phase
   editor. Lowest risk — reads existing data only (plus `training_phases`).
2. **Workout:** `/plan` viewer + session logger + plan editor.
3. **Nutrition:** `/nutricion` today view + logging + catalog editor + nav
   change.

Each phase lands independently shippable.
