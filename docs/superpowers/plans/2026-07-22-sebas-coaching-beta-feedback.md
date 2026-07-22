# Sebas Coaching Beta Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current Movu prototype into a coach-assisted beta where planned and ad-hoc workouts create one trustworthy training history, users can share that history with a coach, and Trends explains body, strength, cardiovascular, sleep, and nutrition progress.

**Architecture:** Introduce a canonical performed-workout layer. A performed session may originate from a Movu plan, a manually created class, WHOOP, or Apple Health; planned and ad-hoc strength exercises both use the same exercise catalog and set logger. Keep access in Supabase RLS, with explicit user-to-coach grants, and calculate display metrics in tested pure TypeScript helpers before server components render them.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, next-intl, Supabase Postgres/Auth/Storage/RLS, Vitest, Capacitor HealthKit, WHOOP.

## Global Constraints

- Preserve the existing dark, mobile-first LifeOS interface and all three locales: Spanish, English, and German.
- Manual entry must remain fully useful without a smartwatch; wearable data enriches a session but never becomes required.
- Every new Supabase table must have RLS enabled, ownership indexes, explicit grants, and generated entries in `types/database.ts`.
- User-to-coach access is opt-in, revocable, and read-only in this beta; a coach cannot edit a client's workouts, profile, nutrition plan, or InBody records.
- Store nutrition-plan PDFs privately and serve signed URLs only after an authenticated RLS check.
- Keep the existing detailed meal logger available, but make the nutrition-plan reference the primary beta workflow.
- Do not add OCR for workout photos, InBody photos/PDFs, or nutrition-plan parsing in this plan.
- Do not add automatic diet generation, recipes, or per-kilometer race telemetry in this plan.
- Use “series”, “repeticiones”, “RPE (esfuerzo percibido)”, and “RIR (repeticiones en reserva)” in Spanish-facing copy; do not show unexplained abbreviations.

---

## Review of the Current Build

| Area | Current status on 2026-07-22 | Decision from feedback |
|---|---|---|
| Planned training | Multi-week plans, sessions, exercises, progression suggestions, set history, RPE, rest timer, and week copy already work. | Keep the logger; improve instructions and terminology. |
| Ad-hoc training | `/registro` writes summary rows to `activities`, separate from plan sessions and set logs. | Replace the split experience with a performed-session builder that opens the same logger as a planned workout. |
| Exercise selection | Plan exercises are free text and have no canonical muscle-group metadata. | Add a searchable exercise catalog with muscle groups and workout-type recommendations. |
| Wearables | WHOOP, Apple Health import, and native HealthKit sync already normalize activity, sleep, steps, calories, HR, zones, and some running metrics. | Match wearable activity to performed sessions when possible; manual data remains authoritative for exercises and sets. |
| Trends | Body weight, estimated strength, weekly tonnage, training minutes, running, nutrition adherence, recovery, sleep, and HR-zone views exist for 4w/12w/6m/all. | Add requested ranges and quick totals; expand body composition, change tonnage to useful strength progress, and add daily/cardio detail. |
| Profile/InBody | Goal, sex, max HR, weekly target, extensive InBody fields, segmental muscle, and scan history exist. | Add baseline activity, training preferences, optional circumferences, and a clearer recurring InBody section. |
| Nutrition | Calorie/macro targets, catalog, portions, substitutions, and daily meal logging exist. | Lead with an uploaded nutrition plan, effective dates, and kcal target; keep detailed logging as optional. |
| Coaching | User data is protected by per-user RLS; only broad service-role admin paths can cross users. | Add explicit client sharing and a dedicated read-only coach workspace. |
| Quality | `npm test` passes 162 tests; `npx tsc --noEmit` and `npm run lint` pass. | Preserve this baseline after every task. |

## Delivery Order

1. **Beta foundation:** Tasks 1-4. One training history and coach access are prerequisites for trustworthy coaching.
2. **Low-friction health context:** Tasks 5-6. Nutrition-plan reference, baseline history, and recurring measurements.
3. **Decision-ready analytics:** Tasks 7-9. Requested ranges, quick totals, and deeper strength/body/cardio comparisons.
4. **Pilot readiness:** Task 10. Seed data, permissions, responsive verification, and coaching-session acceptance tests.

---

### Task 1: Clarify the Existing Plan and Set Logger

**Files:**
- Create: `lib/workout/prescription-copy.ts`
- Create: `lib/workout/prescription-copy.test.ts`
- Modify: `components/plan/PlanWeekView.tsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Produces: `formatPrescription({ sets, reps, targetRpe, targetRir }): string[]` and `getBlockInstruction(supersetGroup: number | null): 'circuit' | 'straight_sets'`.
- Consumes: existing `workout_plan_exercises` fields and `PlanWeekView` translations.

- [ ] **Step 1: Write failing unit tests for prescription copy**

  Add cases proving that `4` sets and `"12"` reps render as complete labels, RPE and RIR are expanded, and exercises sharing a `superset_group` return `circuit` while ungrouped exercises return `straight_sets`.

- [ ] **Step 2: Verify the tests fail**

  Run `npx vitest run lib/workout/prescription-copy.test.ts`; expect failure because `prescription-copy.ts` does not exist.

- [ ] **Step 3: Implement the formatter and update the UI**

  Add `formatPrescription` as a pure formatter. In `PlanWeekView`, show “4 series × 12 repeticiones” instead of `4×12`, render `RPE (esfuerzo percibido)` and `RIR (repeticiones en reserva)` help text, explain straight sets versus grouped blocks at the top of the selected session, and change the submit label from “Registrar serie 1” to “Registrar serie”. Keep the completed-set counter beside the exercise.

- [ ] **Step 4: Add all locale keys and verify**

  Run `npx vitest run lib/workout/prescription-copy.test.ts`, `npx tsc --noEmit`, and `npm run lint`; expect all commands to pass.

- [ ] **Step 5: Commit**

  Commit as `feat: clarify workout prescriptions and effort labels`.

---

### Task 2: Add the Canonical Performed-Workout Data Model

**Files:**
- Create: `supabase/migrations/20260722090000_performed_workouts.sql`
- Create: `supabase/tests/performed_workouts.test.sql`
- Modify: `db/schema.ts`
- Modify: `types/database.ts`
- Create: `lib/workout/performed-session.ts`
- Create: `lib/workout/performed-session.test.ts`
- Modify: `app/api/set-logs/route.ts`

**Interfaces:**
- Produces: tables `exercise_catalog`, `performed_workouts`, `performed_workout_exercises`; nullable `workout_set_logs.performed_workout_id` and `workout_set_logs.performed_exercise_id`.
- Produces: `PerformedWorkoutOrigin = 'planned' | 'manual' | 'whoop' | 'apple_health'` and `buildPerformedWorkoutInsert(input)`.
- Preserves: `workout_set_logs.exercise_id` for backward compatibility until Task 3 migrates the logger.

- [ ] **Step 1: Write the database migration**

  Define `exercise_catalog` with `id`, `slug`, localized names, `primary_muscle_group`, `secondary_muscle_groups`, `workout_types`, `default_tracking`, `active`, and timestamps. Define `performed_workouts` with `user_id`, optional `plan_session_id`, optional `activity_id`, `origin`, `title`, `workout_type`, `started_at`, `ended_at`, `duration_min`, `notes`, and `status` (`draft`, `in_progress`, `completed`). Define ordered `performed_workout_exercises` with optional `catalog_exercise_id`, immutable `exercise_name`, prescription snapshots, muscle-group snapshot, and order index. Add foreign keys, unique constraints that prevent a user from linking the same plan occurrence or activity twice, RLS ownership policies, indexes, and authenticated grants.

- [ ] **Step 2: Write SQL permission and integrity tests**

  In `supabase/tests/performed_workouts.test.sql`, prove that an authenticated user can CRUD owned rows, cannot read another user's rows, cannot attach another user's plan session/activity, and cannot create a set log against another user's performed exercise.

- [ ] **Step 3: Write failing TypeScript tests**

  Cover planned/manual origins, a draft manual session without wearable data, completion timestamps, invalid negative duration, and stable snapshot names when a catalog label later changes.

- [ ] **Step 4: Implement the TypeScript model and update generated types**

  Mirror the migration in `db/schema.ts` and `types/database.ts`. Implement validation in `lib/workout/performed-session.ts` so routes receive normalized UTC dates, trimmed titles, non-negative duration, and a legal origin/status pair.

- [ ] **Step 5: Extend set logging without breaking existing plans**

  Accept `performed_workout_id` and `performed_exercise_id` in `POST /api/set-logs`, verify both belong to the signed-in user and to each other, then persist them with the existing weight/reps/RPE fields. Keep the old `exercise_id` ownership path working during migration.

- [ ] **Step 6: Verify**

  Run `supabase db reset`, `supabase test db`, `npx vitest run lib/workout/performed-session.test.ts lib/workout/set-log.test.ts`, `npx tsc --noEmit`, and `npm run lint`; expect all to pass.

- [ ] **Step 7: Commit**

  Commit as `feat: add canonical performed workout model`.

---

### Task 3: Unify Planned and Ad-hoc Workout Capture

**Files:**
- Create: `lib/workout/exercise-catalog.ts`
- Create: `lib/workout/exercise-catalog.test.ts`
- Create: `components/workout/ExercisePicker.tsx`
- Create: `components/workout/PerformedWorkoutLogger.tsx`
- Create: `app/api/exercises/route.ts`
- Create: `app/api/performed-workouts/route.ts`
- Create: `app/api/performed-workouts/[id]/route.ts`
- Modify: `components/plan/PlanWeekView.tsx`
- Modify: `app/[locale]/registro/page.tsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`
- Modify: `supabase/seed.sql`

**Interfaces:**
- Consumes: Task 2 tables and extended set-log endpoint.
- Produces: `rankExercises(catalog, { query, workoutType, muscleGroup })`, `PerformedWorkoutLogger({ workout, exercises, recentSets })`, and CRUD routes scoped to the current user.

- [ ] **Step 1: Seed and test the exercise catalog**

  Seed core strength movements plus all eight standardized HYROX stations: SkiErg, sled push, sled pull, burpee broad jumps, rowing, farmers carry, sandbag lunges, and wall balls. Write ranking tests proving exact text matches rank first, the selected workout type ranks next, primary-muscle matches rank above secondary matches, and custom exercises remain searchable.

- [ ] **Step 2: Implement catalog search**

  Add `GET /api/exercises?q=&workout_type=&muscle_group=` with a 20-result limit and normalized case/accent-insensitive matching. `ExercisePicker` must support search, muscle-group filters, recommended results, and “Crear ejercicio personalizado” while maintaining keyboard labels and 44px touch targets.

- [ ] **Step 3: Implement performed-workout CRUD**

  `POST` creates a draft from either a plan session or manual fields; a plan start copies prescriptions into immutable performed exercises. `PATCH` updates metadata/status and appends, reorders, or removes performed exercises while the session is draft/in progress. Completing a session stores `ended_at`, calculates duration when absent, and creates or links its `activities` summary row.

- [ ] **Step 4: Extract the shared logger**

  Move the current weight, repetitions, RPE, recent history, progression suggestion, and rest timer UI from `PlanWeekView` into `PerformedWorkoutLogger`. Both a planned-session start and a manual session must render this component with the same API payloads and success/error states.

- [ ] **Step 5: Replace the split `/registro` workout form**

  Keep date, workout type, subtype/class, studio, coach, optional duration/calories/distance, and RPE. After creating the draft, navigate to its logger so the user can add/remove/reorder exercises and record sets. For HYROX, preselect the eight stations and allow removal before completion. Retain the existing daily sleep/steps form below the workout flow.

- [ ] **Step 6: Add planned-session start/resume**

  `PlanWeekView` starts or resumes the performed occurrence for the selected calendar date. Existing historic set logs stay visible; all new logs attach to the performed session. A completed session is read-only except for an explicit “Reabrir sesión” action.

- [ ] **Step 7: Verify**

  Run `npm test`, `npx tsc --noEmit`, and `npm run lint`. Manually verify: planned strength workout; empty-day manual strength workout; HYROX with a removed station; class without any set data; no-wearable completion; and mobile resume after refresh.

- [ ] **Step 8: Commit**

  Commit as `feat: unify planned and manual workout logging`.

---

### Task 4: Add Explicit Coach-to-Client Access

**Files:**
- Create: `supabase/migrations/20260722100000_coach_access.sql`
- Create: `supabase/tests/coach_access.test.sql`
- Modify: `db/schema.ts`
- Modify: `types/database.ts`
- Create: `lib/coaching/access.ts`
- Create: `lib/coaching/access.test.ts`
- Create: `app/api/coaching/access/route.ts`
- Create: `app/[locale]/coach/page.tsx`
- Create: `app/[locale]/coach/[clientId]/page.tsx`
- Create: `components/coaching/ClientPicker.tsx`
- Create: `components/coaching/ClientSummary.tsx`
- Modify: `app/[locale]/perfil/page.tsx`
- Modify: `proxy.ts`
- Modify: `lib/navigation.ts`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Produces: `user_profiles.account_role` (`member` or `coach`) and `coach_client_access(client_id, coach_id, status, granted_at, revoked_at)`.
- Produces: `canCoachReadClient(coachId, clientId)` and read-only coach routes.

- [ ] **Step 1: Create and test the access model**

  Add a unique `(client_id, coach_id)` relationship with `pending`, `active`, and `revoked` statuses. Add SECURITY DEFINER predicates owned by postgres for RLS checks. Extend SELECT policies on profile, activities, sleep, daily metrics, body measurements, plans, performed workouts/exercises, set logs, nutrition plans/targets, and phases so an active coach can read but never insert/update/delete client data.

- [ ] **Step 2: Prove permissions with pgTAP**

  Test member self-access, active coach reads, pending/revoked denial, unrelated-user denial, coach write denial, and client revocation taking effect in the same transaction.

- [ ] **Step 3: Implement grant and revoke flows**

  In Profile, a member enters the coach's email, reviews exactly which categories become visible, and grants access. The API resolves only accounts whose role is `coach`, never returns arbitrary account existence, and supports immediate revocation. Log grant/revoke timestamps for auditability.

- [ ] **Step 4: Build the coach workspace**

  `/coach` lists active clients with last workout, last sync, latest body measurement, and missing-data flags. `/coach/[clientId]` reuses read-only summaries for overview, workouts, recovery/sleep, body, and nutrition. It must never use `SUPABASE_SERVICE_ROLE_KEY`; all reads go through the signed-in coach's Supabase client and RLS.

- [ ] **Step 5: Gate routing and navigation**

  Show the Coach navigation item only to `account_role = 'coach'`; reject member access to coach routes and reject coach access to unshared client IDs with a locale-aware not-found state.

- [ ] **Step 6: Verify**

  Run `supabase db reset`, `supabase test db`, `npm test`, `npx tsc --noEmit`, and `npm run lint`. Verify with three local accounts: client, authorized Sebas coach, and unrelated coach.

- [ ] **Step 7: Commit**

  Commit as `feat: add revocable read-only coach access`.

---

### Task 5: Make the Nutrition Plan the Primary Beta Workflow

**Files:**
- Create: `supabase/migrations/20260722110000_nutrition_plan_documents.sql`
- Modify: `db/schema.ts`
- Modify: `types/database.ts`
- Create: `lib/nutrition/plan-document.ts`
- Create: `lib/nutrition/plan-document.test.ts`
- Create: `app/api/nutrition/plans/route.ts`
- Create: `app/api/nutrition/plans/[id]/route.ts`
- Create: `components/nutrition/NutritionPlanCard.tsx`
- Modify: `app/[locale]/nutricion/page.tsx`
- Modify: `components/nutrition/NutritionToday.tsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Produces: `nutrition_plans(id, user_id, title, provider_name, calories_target, starts_on, ends_on, storage_path, original_filename, mime_type, notes, active)`.
- Produces: `validateNutritionPlanUpload(file)` allowing PDF only, maximum 10 MiB, and server-generated storage paths.

- [ ] **Step 1: Add private storage and metadata**

  Create a private `nutrition-plans` bucket and policies limiting object paths to `{auth.uid()}/{planId}/{filename}` plus active-coach SELECT. Add the metadata table with only one active plan per user and date-range validation.

- [ ] **Step 2: Test file validation and effective dates**

  Cover valid PDF, wrong MIME type, oversized PDF, unsafe filename normalization, open-ended active plans, and non-overlapping historical plans.

- [ ] **Step 3: Implement upload, signed view, and archive routes**

  Upload metadata and file atomically enough that a failed database insert removes the just-uploaded object. Return a 10-minute signed URL only after the authenticated member/coach RLS query succeeds. Archive metadata instead of deleting historical plans by default.

- [ ] **Step 4: Reorder the nutrition page**

  Render the active plan first: provider, effective date, target kcal, “Ver PDF”, and plan history. Put detailed macro targets and meal logging under “Registro detallado (opcional)” collapsed by default. Do not remove existing food or macro data.

- [ ] **Step 5: Feed the plan kcal into existing comparisons**

  When an active `nutrition_plan.calories_target` exists, use it as the default daily reference line; preserve day-type targets as an advanced override. Expose the source label so Trends can distinguish “plan de Nicole” from a Movu day-type target.

- [ ] **Step 6: Verify and commit**

  Run `npm test`, `npx tsc --noEmit`, and `npm run lint`; upload/view/archive a Nutrify-style PDF as member and view it as the authorized coach. Commit as `feat: add nutrition plan document workflow`.

---

### Task 6: Add Baseline History, Preferences, and Optional Measurements

**Files:**
- Create: `supabase/migrations/20260722120000_profile_baseline_and_circumferences.sql`
- Modify: `db/schema.ts`
- Modify: `types/database.ts`
- Create: `lib/profile/baseline.ts`
- Create: `lib/profile/baseline.test.ts`
- Modify: `app/api/me/route.ts`
- Modify: `app/api/body-measurements/route.ts`
- Modify: `app/[locale]/perfil/page.tsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Produces: profile fields `training_archetype`, `training_days_target`, `experience_level`, `baseline_activity`, `preferred_workout_types`, `race_goal`, `race_date`.
- Extends: `body_measurements` with optional `waist_cm`, `hip_cm`, `chest_cm`, `left_arm_cm`, `right_arm_cm`, `left_thigh_cm`, `right_thigh_cm`, `left_calf_cm`, and `right_calf_cm`.

- [ ] **Step 1: Add validation tests**

  Cover a beginner without wearables, experienced athlete with historical habits, optional race date only when a race goal exists, legal 1-7 training-day targets, plausible circumference bounds, and full omission of sensitive optional measurements.

- [ ] **Step 2: Add schema and API support**

  Apply RLS-compatible columns and CHECK constraints. Update `GET/PATCH /api/me` and `GET/POST /api/body-measurements` to parse only allowlisted fields and return field-level 400 errors for invalid values.

- [ ] **Step 3: Restructure Profile**

  Separate “Objetivos y experiencia”, “Preferencias de entrenamiento”, “Datos y dispositivos”, and “Mediciones / InBody”. Explain max HR as optional and useful for personalized zones; do not make it mandatory. Put circumferences behind an optional disclosure with measurement instructions.

- [ ] **Step 4: Treat InBody as recurring history**

  Keep the current manual date, weight, MME, fat kg/%, muscle kg, segmental muscle, and additional markers. Add an explicit “Nueva medición” action and display scan history independently from personal-profile edits.

- [ ] **Step 5: Verify and commit**

  Run `npm test`, `npx tsc --noEmit`, and `npm run lint`; verify complete onboarding with and without a wearable and with all optional measurements blank. Commit as `feat: add training baseline and recurring measurements`.

---

### Task 7: Add Requested Time Ranges and Quick Totals

**Files:**
- Create: `lib/trends/ranges.ts`
- Create: `lib/trends/ranges.test.ts`
- Create: `lib/trends/quick-stats.ts`
- Create: `lib/trends/quick-stats.test.ts`
- Modify: `app/[locale]/trends/page.tsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Produces: `TrendsRange = '7d' | 'current_month' | '4w' | 'current_quarter' | '12w' | '6m' | 'ytd' | '1y' | 'all'`.
- Produces: `resolveRange(range, today, timeZone)` and `computeQuickStats({ activities, dailyMetrics, sleepLogs })` returning active kcal, total kcal, steps, distance km, average sleep, average daily HR, average workout HR, and workout count.

- [ ] **Step 1: Test calendar-aware ranges**

  Fix the clock in tests and cover week, month boundaries, Q1-Q4, leap-year YTD, rolling 4/12 weeks, rolling 6 months, 1 year, all-time, invalid query fallback, and `America/Mexico_City` date boundaries.

- [ ] **Step 2: Test quick-stat aggregation**

  Deduplicate same-day metrics by source priority, sum steps and distances, distinguish activity calories from total daily calories, average sleep only across recorded nights, and return `null` instead of zero for absent HR/sleep data.

- [ ] **Step 3: Implement one shared range selector**

  Replace `RANGES`/`RANGE_DAYS` in the page with the tested resolver and query all sections from the exact returned inclusive start/end. Use human labels such as “Julio”, “Q3 2026”, and “YTD 2026”.

- [ ] **Step 4: Add a quick-stat panel**

  Show active kcal, total kcal, steps, distance, average sleep, average daily HR, and average workout HR at the top. Allow weight/fat/muscle tiles to be hidden using a local privacy toggle suitable for screenshots; do not persist this preference server-side in the beta.

- [ ] **Step 5: Verify and commit**

  Run `npx vitest run lib/trends/ranges.test.ts lib/trends/quick-stats.test.ts`, `npm test`, `npx tsc --noEmit`, and `npm run lint`. Commit as `feat: add calendar ranges and trends quick stats`.

---

### Task 8: Expand Body and Strength Trends Around Actionable Progress

**Files:**
- Create: `lib/trends/body-composition.ts`
- Create: `lib/trends/body-composition.test.ts`
- Create: `lib/trends/strength-gains.ts`
- Create: `lib/trends/strength-gains.test.ts`
- Create: `components/trends/StrengthGroupSection.tsx`
- Modify: `app/[locale]/trends/page.tsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Produces: body series for weight kg, fat kg, fat %, muscle kg, and segmental muscle.
- Produces: `computeStrengthGains(setLogs, performedExercises, catalog)` grouped into chest, back, shoulders, arms, legs, glutes, and core with per-exercise estimated 1RM and best working-set weight.

- [ ] **Step 1: Test body-series alignment**

  Preserve measurement dates, omit missing series points without converting them to zero, calculate muscle percentage only when weight and muscle kg exist, and keep multiple same-day scans deterministically ordered.

- [ ] **Step 2: Test strength grouping and representative exercise selection**

  Group by the catalog muscle snapshot, calculate Epley estimated 1RM only for 1-12 reps, rank representative exercises by frequency then recency, and show progress only when at least two dated points exist. Prove custom exercises with explicit muscle metadata work.

- [ ] **Step 3: Replace the body chart**

  Show selectable weight/fat/muscle series with units that cannot be confused: kg series together and percentages in a separate scale/view. Add the latest segmental InBody snapshot beside related strength sections instead of implying causal correlation.

- [ ] **Step 4: Replace weekly tonnage as the headline strength metric**

  Keep tonnage available only in an advanced disclosure. Lead with muscle-group accordions, representative exercise trends, estimated 1RM, best working weight, and session frequency. Label all estimated values explicitly.

- [ ] **Step 5: Verify and commit**

  Run the two new test files, the full test suite, TypeScript, and lint. Manually verify body data with sparse scans and strength data with renamed/custom exercises. Commit as `feat: add body composition and strength gains trends`.

---

### Task 9: Make Training Load, Intensity, Running, and Nutrition Coach-Ready

**Files:**
- Create: `lib/trends/training-days.ts`
- Create: `lib/trends/training-days.test.ts`
- Modify: `lib/trends/running.ts`
- Modify: `lib/trends/running.test.ts`
- Create: `lib/trends/nutrition-plan-comparison.ts`
- Create: `lib/trends/nutrition-plan-comparison.test.ts`
- Modify: `app/[locale]/trends/page.tsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Produces: daily training rows with date, type, source, minutes, distance, avg/max/min HR when available, and zone minutes.
- Extends running output with per-run distance, avg/max/min HR, pace, zone distribution, and calendar-range summaries.
- Produces nutrition comparison rows with plan kcal, optional logged kcal, estimated burned kcal, variance %, and nearest body measurement.

- [ ] **Step 1: Test daily training aggregation**

  Prefer a linked performed workout over duplicate wearable activity, merge wearable HR/zones into its manual session, preserve manual-only sessions, group daily minutes without losing session labels, and mark unavailable max/min HR as missing rather than zero.

- [ ] **Step 2: Add daily load and intensity views**

  Change the load chart from weekly-only to a daily minutes chart for short ranges and weekly buckets for long ranges. Rename “Mezcla de intensidad” to “Zonas de intensidad” and show both per-day stacked bars and an overall distribution. Display average/max HR per session when available.

- [ ] **Step 3: Expand running without per-kilometer scope**

  Keep existing distance, pace, aerobic efficiency, zones, and VO₂max. Add per-run/period average and max HR, minimum HR only when the source provides it, and clearer labels (“Distancia por semana” or “Distancia por carrera”). Show the richer race panel only when Profile has an active race goal/date.

- [ ] **Step 4: Compare nutrition plan, recorded intake, expenditure, and body trend**

  Use the active nutrition-plan kcal as a horizontal reference. Show average logged kcal and percent variance only for days with food entries, average total expenditure from daily metrics separately, and nearby body measurements without claiming that one caused the other.

- [ ] **Step 5: Verify and commit**

  Run the three affected test files, `npm test`, `npx tsc --noEmit`, and `npm run lint`. Verify short/long ranges, manual-only data, wearable-enriched data, missing HR, no food logs, and a changed nutrition plan mid-range. Commit as `feat: make performance trends coach ready`.

---

### Task 10: Pilot Hardening and Coaching Acceptance Test

**Files:**
- Create: `docs/beta/coaching-session-runbook.md`
- Create: `docs/beta/privacy-and-data-sharing.md`
- Create: `docs/beta/sebas-feedback-acceptance.md`
- Modify: `README.md`
- Modify: `supabase/seed.sql`

**Interfaces:**
- Consumes: Tasks 1-9.
- Produces: a repeatable beta walkthrough and a traceable acceptance checklist for the feedback document.

- [ ] **Step 1: Add realistic pilot seed data**

  Seed one member, one coach relationship, one four-week plan, planned and manual workouts, HYROX, running, wearable-enriched HR zones, sleep/steps/calories, two InBody scans, an active nutrition plan record, and sparse/missing-data days. Keep seed credentials local-development only.

- [ ] **Step 2: Write the coaching-session runbook**

  Document: member grants Sebas access; member records a planned workout; member builds an ad-hoc class; coach opens the client; coach reviews adherence, strength, body, cardio, recovery, and nutrition; coach records recommendations outside Movu; member revokes access. State that editable coach notes are outside this beta.

- [ ] **Step 3: Map every feedback item to shipped/deferred status**

  In `sebas-feedback-acceptance.md`, list each PDF request with its task, route/screen, acceptance evidence, and one of `shipped`, `deferred-ocr`, `deferred-diet-generation`, or `deferred-race-splits`. Do not leave unclassified feedback.

- [ ] **Step 4: Run full automated verification**

  Run `supabase db reset`, `supabase test db`, `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`; every command must exit 0.

- [ ] **Step 5: Run responsive and permission acceptance checks**

  Verify dashboard, plan, manual logger, nutrition, trends, profile, client list, and client detail at 390×844 and 1440×900. Confirm no horizontal overflow, all interactive targets are at least 44px on mobile, private PDFs have expiring URLs, unauthorized coaches receive no client data, and revocation works immediately.

- [ ] **Step 6: Pilot with real sessions before automation investment**

  Use Movu in at least three Sebas coaching sessions and record only observed friction in the acceptance document. Prioritize fixes that block data capture or interpretation before OCR, AI diet generation, or deeper race analytics.

- [ ] **Step 7: Commit**

  Commit as `docs: add coaching beta rollout and acceptance runbook`.

---

## Self-Review Notes

- **Spec coverage:** Every feedback category maps to a task: plan clarity (1), ad-hoc training and exercise search (2-3), coaching access (4), simplified nutrition (5), profile/InBody/baseline (6), time ranges and quick metrics (7), body/strength (8), load/intensity/running/nutrition comparisons (9), and beta validation/deferred ideas (10).
- **Deliberate deferrals:** Workout-photo OCR, InBody OCR, PDF nutrition parsing, generated diets/recipes, and per-kilometer race analysis are explicitly excluded until the coaching beta proves the underlying manual workflow.
- **Type consistency:** `performed_workouts` is the canonical occurrence; `performed_workout_exercises` snapshots exercise metadata; `workout_set_logs` points to both. Planned and manual flows consume the same logger. Coach access remains read-only through RLS.
- **Product risk:** The largest risk is attempting analytics before unifying session identity. Tasks 7-9 must not begin until Tasks 2-3 are live and backfill behavior has been verified.
- **Privacy risk:** Coach access and private document policies must pass database-level tests before any coach UI is enabled.
