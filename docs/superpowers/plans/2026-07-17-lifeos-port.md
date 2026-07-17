# lifeos → movu Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port lifeos' Workout, Nutrition, and Whoop/Trends features into movu as multi-user product features, per the approved spec `docs/superpowers/specs/2026-07-17-lifeos-port-design.md`.

**Architecture:** Pure-logic modules and chart primitives port nearly verbatim from `../lifeos` with vitest coverage. Pages, schema, and data access are rebuilt movu-style: SQL migrations in `supabase/migrations/` with owner-scoped RLS, Drizzle `db/schema.ts` as type source mirrored into `types/database.ts`, reads in server components via supabase-js, writes via `app/api/*` route handlers, UI in Tailwind + movu mobile components, strings via next-intl (es/en/de).

**Tech Stack:** Next.js 16 App Router, TypeScript, supabase-js + @supabase/ssr, Drizzle (types only), Tailwind, next-intl, vitest.

## Global Constraints

- All new tables: `user_id uuid not null references user_profiles(id) on delete cascade`, RLS enabled, owner policy `using (auth.uid() = user_id) with check (auth.uid() = user_id)` (movu's `own_*` pattern).
- Weights stored in **kg** (fix lifeos' mislabeled `weight_lbs`).
- Date bucketing timezone: `America/Mexico_City` (constant `APP_TIMEZONE`), not lifeos' Berlin.
- Every user-visible string added to all three of `messages/es.json`, `messages/en.json`, `messages/de.json`.
- Source references are to `/Users/alonso/vscode/lifeos` (read-only; never modify lifeos).
- Run `npm run test` (vitest) after every lib task; `npm run lint` before each commit batch.
- No AI features (meal extraction, Whoop dynamic targets) — out of scope.

---

### Task 1: Chart primitives

**Files:**
- Create: `components/charts/charts.tsx` (copy of `../lifeos/components/ui/charts.tsx`)
- Create: `components/charts/ProgressBar.tsx` (adapted from `../lifeos/components/ui/ProgressBar.tsx`)

**Interfaces:**
- Produces: `ChartTitle({title, right?})`, `AxisRow({first, last})`, `BigSpark({data: number[], color?, colorByValue?, height?})`, `DualSpark({dataA, dataB, colorA?, colorB?, height?})`, `BarChart({data, color?, colors?, height?, maxVal?})`, `Legend({items: {label, color, dashed?}[]})`, `ProgressBar({value, max, color})`.

- [ ] Copy `../lifeos/components/ui/charts.tsx` → `components/charts/charts.tsx` unchanged (it's already a self-contained client component themed by CSS vars movu shares).
- [ ] Read `../lifeos/components/ui/ProgressBar.tsx`; recreate it in `components/charts/ProgressBar.tsx` with the same props, dropping any lifeos-only imports.
- [ ] Verify compile: `npx tsc --noEmit` → no new errors.
- [ ] Commit: `feat: port lifeos chart primitives`

### Task 2: Workout logic lib + tests

**Files:**
- Create: `lib/workout/logic.ts`
- Test: `lib/workout/logic.test.ts`

**Interfaces (produces):**
```ts
export const DAY_ORDER: readonly string[] // ['monday'...'sunday']
export function getTodayKey(reference?: Date): string
export function getPlanWeek(plan: { start_date: string; weeks: number }, reference?: Date):
  { active: boolean; week: number | null; reason: 'not_started' | 'active' | 'expired' }
export function parseWeightInput(raw: string): number | null       // "82,5" → 82.5
export function parseTopReps(r: string | null): number | null      // "4-5"→5, "8/leg"→8
export function parseReps(r: string | null): number                // default 5
export function parseRpe(r: string | null): number                 // default 8
export function getProgressionSuggestion(
  prescribedReps: string | null,
  last: { weight_kg: number | null; reps: number | null } | undefined,
): number | null                                                   // last set ≥ top of range → +2.5
export const RPE_OPTIONS: number[]                                 // [6,7,7.5,8,8.5,9,9.5,10]
```

- [ ] Write failing tests covering: comma/dot weight parsing, negative/garbage → null; rep-range top parsing ("4-5"→5, "8/leg"→8, "25 unbroken"→25, null→null); progression fires only when last reps ≥ top and weight > 0; `getPlanWeek` before start → not_started, mid-plan → correct week, after weeks elapsed → expired; `getTodayKey` maps Sunday to 'sunday'.
- [ ] Run `npm run test -- lib/workout` → FAIL (module missing).
- [ ] Implement by porting the helpers from `../lifeos/components/tabs/WorkoutTab.tsx` (lines 15–52) and generalizing `../lifeos/lib/workout.ts` `getPlanStatus` to take a plan row (`start_date` ISO date string, `weeks`) instead of hardcoded `TRAINING_BLOCKS`. `getProgressionSuggestion` takes `prescribedReps` + last log directly (no lifeos row types).
- [ ] `npm run test -- lib/workout` → PASS. Commit: `feat: port workout parsing and progression logic`

### Task 3: Nutrition logic lib + tests

**Files:**
- Create: `lib/nutrition/macros.ts`, `lib/nutrition/portions.ts`
- Test: `lib/nutrition/macros.test.ts`, `lib/nutrition/portions.test.ts`

**Interfaces (produces):**
```ts
// macros.ts — ported from ../lifeos/lib/nutrition.ts, personal/whoop parts dropped
export interface MacroTotals { calories: number; protein_g: number; carbs_g: number; fat_g: number }
export const EMPTY_MACRO_TOTALS: MacroTotals
export type NutritionDayType = 'hard' | 'moderate' | 'rest'
export type MealName = 'breakfast' | 'midday' | 'pre_workout' | 'post_workout' | 'dinner' | 'snack'
export const MEAL_ORDER: MealName[]
export function calculateMacroCalories(m: Pick<MacroTotals,'protein_g'|'carbs_g'|'fat_g'>): number
export function calculateConsumed(items: {calories:number|null; protein_g:number|null; carbs_g:number|null; fat_g:number|null}[]): MacroTotals
export function calculateRemaining(targets: MacroTotals, consumed: MacroTotals): MacroTotals
export function scaleFood(food: {calories:number; protein_g:number; carbs_g:number; fat_g:number}, quantity: number): {quantity:number; calories:number; protein_g:number; carbs_g:number; fat_g:number}
export function parseGenericFoodDraft(draft: {name:string; calories:string; protein_g:string; carbs_g:string; fat_g:string}): {ok:true; value:{name:string; calories:number; protein_g:number; carbs_g:number; fat_g:number}} | {ok:false; error:string}
export function getSubstitutions(foodItemId: string, foods: FoodLike[], groupItems: {groupName:string; foodItemId:string; quantity:number; label:string}[]): SubstitutionOption[]

// portions.ts — ported from ../lifeos/lib/nutrition-portions.ts (ids are uuid strings in movu)
export type PortionOption = { key:string; source:'catalog'|'saved'; sourceId:string; name:string; portionLabel:string; calories:number; protein_g:number; carbs_g:number; fat_g:number }
export function normalizeSavedPortionName(name: string): string
export function buildPortionOptions(foods: FoodLike[], saved: SavedPortionLike[]): PortionOption[]
export function scalePortionOption(option: PortionOption, quantity: number): {quantity:number; calories:number; protein_g:number; carbs_g:number; fat_g:number}
export function mergeSavedFoodPortion<T extends {id:string; name:string}>(portions: T[], saved: T): T[]
```
Note: `calculateConsumed` takes a flat item array (movu queries return joined items directly), unlike lifeos' nested `MealLog[]`.

- [ ] Port tests from `../lifeos/__tests__/nutrition-log-items.test.ts` and `nutrition-saved-portions.test.ts` where they cover the ported functions; add cases for consumed/remaining/scale rounding (macros to 0.1, calories to integer) and draft parsing (empty name, negative macro, calories derived from macros when blank, all-zero rejection).
- [ ] Run tests → FAIL. Implement by copying function bodies from lifeos, changing ids `number`→`string` and flattening `calculateConsumed` input. Drop: whoop calibration, `generateDefaultMeals`, `suggestNextFood`, `loadNutritionTargetPlan`, `getPortionSubstitutions` (normalized-plan system not ported), `nutritionDayPayload`.
- [ ] Tests PASS. Commit: `feat: port nutrition macro and portion logic`

### Task 4: Trends logic lib + tests

**Files:**
- Create: `lib/trends/compute.ts`
- Test: `lib/trends/compute.test.ts`

**Interfaces (produces):** ported from `../lifeos/lib/trends.ts` adapted to movu rows:
```ts
export const APP_TIMEZONE = 'America/Mexico_City'
export type PhaseKind = 'bulk' | 'cut' | 'maintenance'
export interface TrainingPhase { phase: PhaseKind; started_on: string; target_rate_kg_per_week: number | null }
export const PHASE_DEFAULT_RATE: Record<PhaseKind, number> // bulk .25, cut -.5, maintenance 0
export const MAINTENANCE_BAND_KG = 0.15
export interface DatedValue { date: string; value: number }
export type Verdict = 'on_track' | 'fast' | 'slow'
export type Chip = 'up' | 'flat' | 'down'
export function dateKey(iso: string, timeZone?: string): string           // was berlinDateKey
export function weekStartKey(dateKey: string): string
export function rollingAverage(points: DatedValue[], windowDays: number): DatedValue[]
export function linearSlopePerDay(points: DatedValue[]): number | null
export function epley1RM(weightKg: number, reps: number): number
export function computeBodyTrend(measurements: {measured_on:string; weight_kg:number|null}[], phase: TrainingPhase | null, todayKey: string): BodyTrend  // verbatim
export function computeStrengthTrends(logs: {logged_at:string; exercise_name:string; weight_kg:number|null; reps:number|null}[], todayKey: string, topN?): StrengthTrends  // weight_kg direct, no unit normalization
export function computeLoadTrends(activities: {start:string; category:'training'|'lifestyle'; minutes:number|null}[], dailyStrain: {date:string; strain:number|null}[]): LoadTrends
export function computeFuelTrends(days: {date:string; kcal:number; protein:number; kcalTarget:number|null; proteinTarget:number|null; logged:boolean}[], todayKey: string, opts?): FuelTrends  // input pre-aggregated per day
```

- [ ] Port test cases from `../lifeos/__tests__/trends-foundations.test.ts`, `trends-body.test.ts`, `trends-strength.test.ts`, `trends-load.test.ts`, `trends-fuel.test.ts` — keeping the assertions for the functions above, adjusting shapes (weight_kg direct; load takes pre-shaped activities; fuel takes pre-aggregated days).
- [ ] Tests FAIL → implement by copying `../lifeos/lib/trends.ts` bodies with the shape adaptations. Drop `shapeWorkout`/`RawWorkoutRow` (movu's `activities` columns are already flat), `classifyWorkout` becomes: category `'lifestyle'` when `activity_category` is `'walk'`, else `'training'`. Drop `computeEngineTrends` (movu trends spec keeps weight/strain/calories/volume; engine efficiency is YAGNI for now).
- [ ] Tests PASS. Commit: `feat: port trends computation logic`

### Task 5: Schema migration + Drizzle types + Database types

**Files:**
- Create: `supabase/migrations/20260717130000_lifeos_port.sql`
- Modify: `db/schema.ts` (append tables + inferred types)
- Modify: `types/database.ts` (append Tables entries + re-exports)
- Modify: `docs/schema.md` (append new tables summary)

Tables per spec (all with `id uuid primary key default gen_random_uuid()`, `user_id`, `created_at timestamptz not null default now()`, RLS owner policy, `grant select, insert, update, delete ... to authenticated`):

- `workout_plans`: name text not null, start_date date not null, weeks int not null check (weeks between 1 and 52), active boolean not null default true, notes text
- `workout_plan_sessions`: plan_id uuid not null references workout_plans(id) on delete cascade, week_number int not null, day_of_week text not null check in ('monday'..'sunday'), title text not null, session_type text not null default 'strength' check in ('strength','activation','cardio','other'), notes text
- `workout_plan_exercises`: session_id uuid not null references workout_plan_sessions(id) on delete cascade, order_index int not null default 0, exercise_name text not null, prescribed_sets int, prescribed_reps text, prescribed_weight_kg numeric(6,2), target_rpe text, superset_group int, rest_seconds int, is_isometric boolean not null default false, notes text
- `workout_set_logs`: exercise_id uuid references workout_plan_exercises(id) on delete set null, exercise_name text not null, set_number int, weight_kg numeric(6,2), reps int, rpe numeric(3,1), notes text, logged_at timestamptz not null default now()
- `food_items`: name text not null, category text not null check in ('protein','carb','fat','mixed','veg'), portion_label text not null, grams numeric(7,1), calories int not null default 0, protein_g numeric(6,1) not null default 0, carbs_g numeric(6,1) not null default 0, fat_g numeric(6,1) not null default 0, tracking_unit text not null default 'grams' check in ('piece','cup','grams','scoop','slice'), notes text, unique(user_id, name)
- `saved_food_portions`: normalized_name text not null, name text not null, calories int not null default 0, protein_g/carbs_g/fat_g numeric(6,1) not null default 0, unique(user_id, normalized_name)
- `food_substitution_groups`: name text not null, macro_type text not null check in ('carb','protein'), target_macro_g numeric(6,1) not null, notes text, unique(user_id, name)
- `food_substitution_group_items`: group_id uuid not null references food_substitution_groups(id) on delete cascade, food_item_id uuid not null references food_items(id) on delete cascade, quantity numeric(7,2) not null default 1, label text not null  — RLS via join to parent group's user_id
- `nutrition_targets`: day_type text not null check in ('hard','moderate','rest'), calories_target int not null, protein_target int not null, carbs_target int not null, fat_target int not null, unique(user_id, day_type)
- `nutrition_days`: date date not null, day_type text not null check in ('hard','moderate','rest'), unique(user_id, date)
- `meal_logs`: date date not null, meal_name text not null check in ('breakfast','midday','pre_workout','post_workout','dinner','snack'), logged_at timestamptz not null default now(), notes text
- `meal_log_items`: meal_log_id uuid not null references meal_logs(id) on delete cascade, food_item_id uuid references food_items(id) on delete set null, name text not null, quantity numeric(7,2) not null default 1, calories int not null default 0, protein_g/carbs_g/fat_g numeric(6,1) not null default 0 — RLS via join to parent meal_log's user_id
- `training_phases`: kind text not null check in ('bulk','cut','maintenance'), start_date date not null, end_date date, target_rate_kg_per_week numeric(4,2)

Indexes: `workout_plan_sessions(plan_id, week_number)`, `workout_plan_exercises(session_id, order_index)`, `workout_set_logs(user_id, logged_at desc)`, `meal_logs(user_id, date)`, `meal_log_items(meal_log_id)`, `nutrition_days(user_id, date)`, `training_phases(user_id, start_date desc)`.

- [ ] Write the migration SQL (follow `supabase/migrations/20260501000005_activities.sql` style). Child tables without user_id (`food_substitution_group_items`, `meal_log_items`) use `exists (select 1 from parent where parent.id = ..._id and parent.user_id = auth.uid())` policies.
- [ ] Append matching Drizzle tables + `$inferSelect/$inferInsert` type exports to `db/schema.ts`; append Row/Insert entries and re-exports to `types/database.ts` following the existing hand-maintained pattern.
- [ ] Apply locally if the local stack is running (`supabase db push` or `supabase db reset`); otherwise verify SQL syntax by review and flag for deploy. `npx tsc --noEmit` clean.
- [ ] Commit: `feat: add workout plan, nutrition, and training phase tables`

### Task 6: Training phases API

**Files:**
- Create: `app/api/phases/route.ts` (GET list, POST create), `app/api/phases/[id]/route.ts` (PATCH, DELETE)

**Interfaces:** follows `app/api/activities/route.ts` pattern (supabase server client, `auth.getUser()`, 401/400/500 JSON). POST body `{kind, start_date, end_date?, target_rate_kg_per_week?}`. Creating a phase with no `end_date` first closes any open phase (sets its `end_date` to the new phase's `start_date`).

- [ ] Implement both routes; RLS enforces ownership, routes validate enum/dates.
- [ ] Commit: `feat: training phases API`

### Task 7: Rebuild /trends — Trends + Recovery sections

**Files:**
- Modify: `app/[locale]/trends/page.tsx` (server loader; replaces current 30-day page)
- Create: `components/trends/TrendsView.tsx` (client: range selector, sections)
- Create: `components/trends/RecoverySection.tsx` (client; ported WhoopTab charts)
- Create: `components/trends/PhaseEditor.tsx` (client; list/create/close phases via api/phases)
- Modify: `messages/{es,en,de}.json` (replace `trends` namespace)

Server page loads (per selected range via searchParam `?range=4w|12w|6m|all`, default 12w): `body_measurements`, `daily_metrics`, `sleep_logs`, `activities`, `workout_set_logs`, `meal_log_items` joined via `meal_logs` + `nutrition_targets` + `nutrition_days` (for fuel days), `training_phases`; computes via `lib/trends/compute.ts`; passes plain props to client components.

Sections (ported from `../lifeos/components/tabs/TrendsTab.tsx` and `WhoopTab.tsx`, restyled with movu Tailwind + `components/charts`):
1. Body: weight BigSpark (rolling 7d overlay via DualSpark), verdict + rate chips, phase since-start summary, PhaseEditor.
2. Strength: top-exercise e1RM sparks + weekly tonnage BarChart + chips (renders empty-state until set logs exist).
3. Load: weekly training minutes BarChart + sessions count.
4. Fuel: kcal vs target bars, adherence stats (empty state without nutrition logs).
5. Recovery (Whoop section): recovery BigSpark (colorByValue), HRV/RHR sparks, strain vs recovery DualSpark, sleep duration bars + stage split, HR-zone distribution from activities `hr_zones`, connect-Whoop CTA when `user_profiles.whoop_user_id` is null (link to existing `/api/whoop/connect` flow), graceful rendering from HealthKit/manual data otherwise.

- [ ] Build server loader + TrendsView with range selector; verify with `npm run dev` on seeded dev user.
- [ ] Build RecoverySection; verify Whoop + non-Whoop rendering.
- [ ] Build PhaseEditor wired to api/phases.
- [ ] Update i18n messages in all three locales.
- [ ] Commit per component batch: `feat: rebuild trends page with lifeos-style sections`

### Task 8: Workout plan + set log APIs

**Files:**
- Create: `app/api/plan/route.ts` (GET active plan with sessions+exercises for a week; POST create plan)
- Create: `app/api/plan/[id]/route.ts` (PATCH plan meta/active, DELETE)
- Create: `app/api/plan/sessions/route.ts` (POST create session), `app/api/plan/sessions/[id]/route.ts` (PATCH, DELETE)
- Create: `app/api/plan/exercises/route.ts` (POST), `app/api/plan/exercises/[id]/route.ts` (PATCH, DELETE)
- Create: `app/api/plan/weeks/copy/route.ts` (POST {plan_id, from_week, to_weeks[]} duplicates sessions+exercises)
- Create: `app/api/set-logs/route.ts` (GET recent by exercise ids, POST log set)

All follow the activities route pattern; parent-ownership checked via RLS-scoped select before child insert.

- [ ] Implement routes; manual smoke via curl or dev UI in Task 9.
- [ ] Commit: `feat: workout plan and set log APIs`

### Task 9: /plan page — week view + session logger

**Files:**
- Modify: `app/[locale]/plan/page.tsx` (server: load active plan, current week per `getPlanWeek`, today via `getTodayKey`; replaces demo constants)
- Create: `components/plan/WeekView.tsx` (client: day cards, today highlighted)
- Create: `components/plan/SessionLogger.tsx` (client: ported WorkoutTab logger UX — expandable exercise cards, prescribed sets×reps@kg/RPE, weight text input using `parseWeightInput`, rep + RPE pickers seeded via `parseReps`/`parseRpe`, progression hint via `getProgressionSuggestion`, recent-log history per exercise, POST to /api/set-logs)
- Modify: `messages/{es,en,de}.json` (`plan` namespace)

- [ ] Server loader + WeekView with empty state (no active plan → CTA to editor).
- [ ] SessionLogger port from `../lifeos/components/tabs/WorkoutTab.tsx` interaction model (state per exercise: expanded, weightText, selectedReps, selectedRpe, loggedSets).
- [ ] i18n all strings; verify in dev with a hand-created plan (via API).
- [ ] Commit: `feat: real workout plan page with session logger`

### Task 10: Plan editor

**Files:**
- Create: `app/[locale]/plan/edit/page.tsx` (server shell) + `components/plan/PlanEditor.tsx` (client)
- Modify: `components/plan/WeekView.tsx` (link to editor)

Editor: create/edit plan (name, start date, weeks, active toggle) → per week: sessions (day, title, type) → per session: exercise rows (name, sets, reps, weight kg, RPE, superset group, rest s, isometric, notes) with reorder (order_index up/down) and "copy week to…" using the copy API.

- [ ] Build editor forms wired to Task 8 APIs; i18n; verify create→view→log roundtrip in dev.
- [ ] Commit: `feat: workout plan editor`

### Task 11: Nutrition APIs

**Files:**
- Create: `app/api/nutrition/foods/route.ts` + `app/api/nutrition/foods/[id]/route.ts` (catalog CRUD)
- Create: `app/api/nutrition/groups/route.ts` + `[id]/route.ts` (substitution groups + items CRUD; items managed via PATCH with full item list replace)
- Create: `app/api/nutrition/targets/route.ts` (GET all, PUT upsert per day_type)
- Create: `app/api/nutrition/day/route.ts` (GET by date: nutrition_day + meal_logs + items; PUT set day_type)
- Create: `app/api/nutrition/log/route.ts` (POST {date, meal_name, item: {food_item_id? | name, quantity, macros}, save_as_portion?} — creates meal_log on demand, inserts item, optionally upserts saved_food_portions), `app/api/nutrition/log/[itemId]/route.ts` (DELETE item)
- Create: `app/api/nutrition/portions/route.ts` (GET saved portions)

- [ ] Implement; unit-test only pure payload helpers (already covered in Task 3); smoke via Task 12 UI.
- [ ] Commit: `feat: nutrition catalog, targets, and logging APIs`

### Task 12: /nutricion page — today view + logging

**Files:**
- Create: `app/[locale]/nutricion/page.tsx` (server: today's targets resolved from nutrition_days.day_type → nutrition_targets, meal logs + items, catalog, groups, saved portions)
- Create: `components/nutrition/NutritionToday.tsx` (client: calories ring — reuse `components/mobile/ProgressRing` — + macro ProgressBars from `calculateConsumed`/`calculateRemaining`, day-type selector, meals list)
- Create: `components/nutrition/MealLogger.tsx` (client: portion picker via `buildPortionOptions` — saved first —, quantity stepper via `scalePortionOption`, substitution swap options via `getSubstitutions`, ad-hoc custom entry via `parseGenericFoodDraft` with "save as portion" toggle, POST /api/nutrition/log)
- Modify: `messages/{es,en,de}.json` (add `nutrition` namespace)
- Modify: `lib/navigation.ts` (add nutricion nav item), `messages/*` `bottomNav`/`sidebar` keys

- [ ] Server loader + NutritionToday; empty states for no targets (CTA to editor).
- [ ] MealLogger with swap + custom entry.
- [ ] Nav: add 6th item `{ key: 'nutricion', href: '/nutricion', icon: '◇' }` to `MOVU_NAV_ITEMS`; update `lib/navigation.test.ts` if it asserts item count; visually verify compact dock fits 6 (fallback per spec: dashboard card instead — decide by looking).
- [ ] Commit: `feat: nutrition today view and meal logging`

### Task 13: Nutrition catalog + targets editor

**Files:**
- Create: `app/[locale]/nutricion/catalogo/page.tsx` + `components/nutrition/CatalogEditor.tsx` (foods CRUD, substitution groups CRUD with item pickers, targets per day-type form with "same every day" convenience that writes all three rows)

- [ ] Build editor wired to Task 11 APIs; i18n; verify full flow: create food → group → targets → log meal → see totals on /nutricion and fuel section on /trends.
- [ ] Commit: `feat: nutrition catalog and targets editor`

### Task 14: Final verification

- [ ] `npm run test` all green; `npm run lint` clean; `npx tsc --noEmit` clean.
- [ ] Dev walkthrough: trends (all ranges, with/without data), plan create→log, nutrition log→totals.
- [ ] Update `docs/schema.md` and `README.md` table list.
- [ ] Commit: `docs: schema and readme for lifeos port`

## Self-Review Notes

- Spec coverage: foundation (T1–5), trends+recovery+phases (T6–7), workout (T8–10), nutrition incl. substitution groups (T11–13), nav (T12), docs (T14). Engine trends dropped deliberately (noted in T4) — not in spec's page list.
- Type consistency: ids are uuid strings everywhere; kg-only set logs; `MealName`/`NutritionDayType` unions shared from `lib/nutrition/macros.ts`; day keys 'monday'…'sunday' shared from `lib/workout/logic.ts`.
