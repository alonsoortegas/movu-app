# Shared Nutrition Mode and Coach History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show coaches the latest five canonical-or-legacy workouts and make one profile-level PDF-versus-macro nutrition preference drive both member and coach views.

**Architecture:** Add a constrained nutrition mode to `user_profiles`, with existing RLS governing member writes and coach reads. Normalize and merge workout sources in a pure TypeScript helper, and resolve nutrition presentation through a second pure helper before server/client components render it. PDF upload/archive endpoints keep active-plan state and profile mode synchronized with explicit compensation on failure.

**Tech Stack:** Next.js 16 App Router, TypeScript, React, next-intl, Supabase Postgres/Storage/RLS, Vitest, Tailwind CSS.

## Global Constraints

- The setting controls both the member Nutrition page and the coach client summary.
- Allowed values are exactly `plan_document` and `macro_targets`.
- Existing users default to macros unless they have an active PDF at migration time.
- Coach pages use the signed-in Supabase client and RLS; never use `SUPABASE_SERVICE_ROLE_KEY`.
- Show at most five workouts, prefer canonical rows by identity, and use legacy activities only as compatibility history.
- Preserve Spanish, English and German copy.
- Do not parse PDFs or backfill synthetic performed-workout rows.
- Do not require Docker; commit pgTAP coverage for a configured Supabase test environment.

---

### Task 1: Add Tested Presentation Helpers

**Files:**
- Create: `lib/coaching/recent-workouts.ts`
- Create: `lib/coaching/recent-workouts.test.ts`
- Create: `lib/nutrition/tracking-mode.ts`
- Create: `lib/nutrition/tracking-mode.test.ts`

**Interfaces:**
- Produces: `mergeRecentWorkouts(performed, activities, limit?) => RecentWorkoutDisplay[]`.
- Produces: `parseNutritionTrackingMode(value) => NutritionTrackingMode` and `resolveNutritionPresentation({ mode, hasActivePlan, hasTargets })`.
- `NutritionTrackingMode = 'plan_document' | 'macro_targets'`.

- [ ] **Step 1: Write failing workout merge tests**

Cover newest-first sorting across both sources, linked activity removal through `performed.activityId`, legacy fill to five, a strict five-row limit, local/UTC activity date fallback and empty inputs.

```ts
expect(mergeRecentWorkouts(
  [{ id: 'p1', activityId: 'a1', title: 'Strength', date: '2026-07-22', status: 'completed' }],
  [
    { id: 'a1', title: 'Duplicate', date: '2026-07-22T08:00:00Z' },
    { id: 'a2', title: 'Run', date: '2026-07-21T08:00:00Z' },
  ],
)).toEqual([
  { id: 'performed:p1', title: 'Strength', date: '2026-07-22', status: 'completed', source: 'performed' },
  { id: 'activity:a2', title: 'Run', date: '2026-07-21T08:00:00Z', status: 'logged', source: 'activity' },
])
```

- [ ] **Step 2: Run the workout tests and verify RED**

Run: `npx vitest run lib/coaching/recent-workouts.test.ts`  
Expected: FAIL because `recent-workouts.ts` does not exist.

- [ ] **Step 3: Implement the minimal workout merge helper**

Normalize ids with source prefixes, remove activities whose ids appear as canonical `activityId`, sort descending by a stable ISO date value, and slice to `limit = 5`.

- [ ] **Step 4: Write failing nutrition mode tests**

```ts
expect(parseNutritionTrackingMode('plan_document')).toBe('plan_document')
expect(() => parseNutritionTrackingMode('calories')).toThrow('Invalid nutrition tracking mode')
expect(resolveNutritionPresentation({ mode: 'plan_document', hasActivePlan: false, hasTargets: true }))
  .toEqual({ primary: 'plan_document', state: 'missing_plan' })
expect(resolveNutritionPresentation({ mode: 'macro_targets', hasActivePlan: true, hasTargets: false }))
  .toEqual({ primary: 'macro_targets', state: 'missing_targets' })
```

- [ ] **Step 5: Run nutrition tests and verify RED**

Run: `npx vitest run lib/nutrition/tracking-mode.test.ts`  
Expected: FAIL because `tracking-mode.ts` does not exist.

- [ ] **Step 6: Implement strict parsing and presentation resolution**

Never silently change the requested primary mode. Return `ready`, `missing_plan`, or `missing_targets` according to the selected source's availability.

- [ ] **Step 7: Verify GREEN and commit**

Run: `npx vitest run lib/coaching/recent-workouts.test.ts lib/nutrition/tracking-mode.test.ts`  
Expected: both test files pass.

Commit: `feat: add coach history and nutrition mode helpers`.

---

### Task 2: Persist and Validate the Shared Nutrition Mode

**Files:**
- Create: `supabase/migrations/20260722145217_shared_nutrition_mode.sql`
- Create: `supabase/tests/database/shared_nutrition_mode.test.sql`
- Modify: `db/schema.ts`
- Modify: `types/database.ts`
- Modify: `app/api/me/route.ts`
- Create: `lib/profile/nutrition-mode-update.ts`
- Create: `lib/profile/nutrition-mode-update.test.ts`

**Interfaces:**
- Consumes: `parseNutritionTrackingMode` from Task 1.
- Produces: `user_profiles.nutrition_tracking_mode` and `buildNutritionModeProfileUpdate(value)`.

- [ ] **Step 1: Create the migration through the Supabase CLI**

Run `supabase migration new shared_nutrition_mode`, then use the generated migration file for the SQL below. Keep the repository timestamp order after `20260722112900`.

```sql
alter table public.user_profiles
  add column nutrition_tracking_mode text not null default 'macro_targets'
  check (nutrition_tracking_mode in ('plan_document', 'macro_targets'));

update public.user_profiles profile
set nutrition_tracking_mode = 'plan_document'
where exists (
  select 1 from public.nutrition_plans plan
  where plan.user_id = profile.id and plan.active
);
```

- [ ] **Step 2: Add pgTAP permission and constraint coverage**

Prove the default is `macro_targets`, an active-plan owner is backfilled to `plan_document`, unknown modes fail with `23514`, members can update only their own row, and a coach with an active grant can select but cannot update the client's mode.

- [ ] **Step 3: Write the failing API allowlist helper tests**

```ts
expect(buildNutritionModeProfileUpdate('macro_targets')).toEqual({ nutrition_tracking_mode: 'macro_targets' })
expect(() => buildNutritionModeProfileUpdate('automatic')).toThrow('Invalid nutrition tracking mode')
```

- [ ] **Step 4: Run the helper tests and verify RED**

Run: `npx vitest run lib/profile/nutrition-mode-update.test.ts`  
Expected: FAIL because the helper does not exist.

- [ ] **Step 5: Implement the helper, types and profile API fields**

Add the column to Drizzle and generated Supabase types. Include it in `GET /api/me`; in PATCH, parse it through the helper and return status 400 for an invalid value. Include the field in the returned profile selection.

- [ ] **Step 6: Verify and commit**

Run: `npx vitest run lib/profile/nutrition-mode-update.test.ts lib/nutrition/tracking-mode.test.ts`, `npx tsc --noEmit`, and `npm run lint`.  
Expected: all pass.

Commit: `feat: persist shared nutrition tracking mode`.

---

### Task 3: Synchronize PDF Lifecycle and Member UI

**Files:**
- Modify: `app/api/nutrition/plans/route.ts`
- Modify: `app/api/nutrition/plans/[id]/route.ts`
- Create: `lib/nutrition/plan-mode-transition.ts`
- Create: `lib/nutrition/plan-mode-transition.test.ts`
- Create: `components/nutrition/NutritionModeSelector.tsx`
- Modify: `components/nutrition/NutritionPlanCard.tsx`
- Modify: `app/[locale]/perfil/page.tsx`
- Modify: `app/[locale]/nutricion/page.tsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Consumes: stored `nutrition_tracking_mode` and Task 1 resolver.
- Produces: profile mode selector and synchronized upload/archive behavior.

- [ ] **Step 1: Add failing route-state tests around pure compensation decisions**

Extract and test `getNutritionPlanModeTransition(operation: 'upload' | 'archive')` in `lib/nutrition/plan-mode-transition.ts` so upload resolves to `plan_document` and archive resolves to `macro_targets`. Keep database/storage calls in the route.

```ts
expect(getNutritionPlanModeTransition('upload')).toBe('plan_document')
expect(getNutritionPlanModeTransition('archive')).toBe('macro_targets')
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npx vitest run lib/nutrition/plan-mode-transition.test.ts`  
Expected: FAIL because `plan-mode-transition.ts` does not exist.

- [ ] **Step 3: Synchronize upload and archive**

After a PDF becomes active, update the owner's profile to `plan_document`. On failure, restore the previous active plan, delete the new metadata and remove the uploaded object. After archive, update mode to `macro_targets`; on failure, reactivate the archived plan. Return a non-2xx response when compensation also fails.

- [ ] **Step 4: Add the Profile selector**

Render two localized radio cards with minimum 44px targets. Load mode from `/api/me`, include it in the existing Profile save request, and show a concise explanation that the same choice controls the coach view.

- [ ] **Step 5: Reorder the member Nutrition page by mode**

Query `nutrition_tracking_mode`. In PDF mode, render `NutritionPlanCard` first and detailed logging collapsed. In macro mode, render `NutritionToday` first and place document upload/history in a collapsed “Plan documents” section. PDF mode without a plan shows an upload prompt; macro mode without targets retains the target-setup prompt.

- [ ] **Step 6: Add all locale copy and verify**

Run the focused tests, `npx tsc --noEmit`, and `npm run lint`.  
Expected: all pass and next-intl keys resolve in all three locale files.

- [ ] **Step 7: Commit**

Commit: `feat: synchronize member nutrition workflow preference`.

---

### Task 4: Show Coach Compatibility History and Selected Nutrition Source

**Files:**
- Modify: `app/[locale]/coach/[clientId]/page.tsx`
- Modify: `components/coaching/ClientSummary.tsx`
- Create: `components/coaching/ClientNutritionSummary.tsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Consumes: `mergeRecentWorkouts`, `resolveNutritionPresentation`, profile mode, active plan and nutrition targets.
- Produces: latest-five mixed history and mode-specific read-only nutrition summary.

- [ ] **Step 1: Expand RLS-scoped coach queries**

Select profile `nutrition_tracking_mode`; select five recent canonical rows including `activity_id`; select ten recent activities with name/type/category/local/UTC start dates; select the active PDF and all nutrition targets. Every query uses the existing signed-in `createClient()` instance.

- [ ] **Step 2: Normalize and merge workout rows**

Use `formatActivityDisplayName` for legacy titles and `mergeRecentWorkouts(..., 5)` for the final list. Localize legacy status as “Logged.” Pass exactly the returned rows to `ClientSummary`.

- [ ] **Step 3: Render the selected nutrition source**

Create `ClientNutritionSummary` with four explicit states: PDF ready, PDF missing, macro targets ready, macro targets missing. PDF ready reuses `NutritionPlanViewer`; macro ready displays hard/moderate/rest kcal and P/C/F values. It has no mutation controls.

- [ ] **Step 4: Add locale copy and verify focused behavior**

Run `npx vitest run lib/coaching/recent-workouts.test.ts lib/nutrition/tracking-mode.test.ts`, `npx tsc --noEmit`, and `npm run lint`.  
Expected: all pass.

- [ ] **Step 5: Commit**

Commit: `fix: show client workout history and selected nutrition source`.

---

### Task 5: Database Deployment and Full Verification

**Files:**
- Modify only if verification reveals a scoped defect in files from Tasks 1-4.

**Interfaces:**
- Consumes all prior tasks.
- Produces a deployed migration and verified member/coach workflow.

- [ ] **Step 1: Run local regression checks**

Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.  
Expected: all pass.

- [ ] **Step 2: Review the linked migration delta**

Run `/opt/homebrew/bin/supabase migration list --linked` and `/opt/homebrew/bin/supabase db push --dry-run`.  
Expected: only the shared nutrition-mode migration is pending.

- [ ] **Step 3: Apply the additive migration**

Run `/opt/homebrew/bin/supabase db push --linked --yes`.  
Expected: the new migration applies successfully without modifying existing nutrition targets, PDFs or workout history.

- [ ] **Step 4: Verify live data and UI acceptance**

Verify Alonso is backfilled to `macro_targets`, Sebas can read but not mutate it, and Sebas's coach page shows five of Alonso's legacy activities. Switch Alonso to PDF mode without a document and confirm both views show the PDF prompt; upload a PDF and confirm both show it; archive it and confirm both return to macros.

- [ ] **Step 5: Final commit if verification required changes**

Commit any narrowly scoped verification fix as `fix: harden shared nutrition coach workflow`. Leave the worktree clean.
