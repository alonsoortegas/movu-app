# Manual Nutrition Plan Targets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PDF behavior explicit and let users manually attach calories and macros to an active nutrition-plan document without OCR or LLM processing.

**Architecture:** Nullable macro columns live with the active nutrition document. A pure parser validates upload/edit inputs, API routes persist them, and a pure resolver selects document targets only in `plan_document` mode while preserving the existing day-type target workflow.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 18, next-intl, Supabase Postgres/Storage/RLS, Vitest, pgTAP

## Global Constraints

- The PDF is reference-only: no OCR, parsing, recipes, substitutions, or generated recommendations.
- Manual calories and macros are optional.
- Empty targets render a configuration action, not zero progress.
- `nutrition_plans` is the target source only in `plan_document` mode; `nutrition_targets` remains the source in `macro_targets` mode.
- Preserve private Storage, RLS, rollback behavior, coach read access, and all three locales.
- Copy must explain daily objectives, today's fuel, and reusable foods/portions.
- Before schema work, fetch `https://supabase.com/changelog.md`, scan relevant breaking changes, verify the current column-constraint/RLS documentation, and inspect `supabase migration new --help`.
- Follow red-green-refactor for every production behavior.

---

## File Structure

- `lib/nutrition/plan-targets.ts` — manual target parsing and source resolution.
- `lib/nutrition/plan-targets.test.ts` — validation and mode tests.
- CLI-generated `supabase/migrations/*_nutrition_plan_manual_targets.sql` — nullable macro columns and bounds.
- `supabase/tests/database/nutrition_plan_targets.test.sql` — ownership and constraints.
- `app/api/nutrition/plans/route.ts` — create with manual targets.
- `app/api/nutrition/plans/[id]/route.ts` — owner-only metadata/target update.
- `components/nutrition/NutritionPlanCard.tsx` — boundary copy and manual edit form.
- `components/nutrition/NutritionToday.tsx` — complete plan target consumption.
- `app/[locale]/nutricion/page.tsx` — passes mode and all plan targets.
- `app/[locale]/dashboard/page.tsx` — resolves today's fuel target from the selected workflow.
- `components/nutrition/CatalogEditor.tsx`, `components/dashboard/FuelTodayCard.tsx` — explanatory language.
- `db/schema.ts`, `types/database.ts` — schema typing.
- `messages/es.json`, `messages/en.json`, `messages/de.json` — locale copy.

### Task 1: Add Manual Macro Columns and Validation

**Files:**
- Create via CLI: `supabase/migrations/*_nutrition_plan_manual_targets.sql`
- Create: `supabase/tests/database/nutrition_plan_targets.test.sql`
- Create: `lib/nutrition/plan-targets.test.ts`
- Create: `lib/nutrition/plan-targets.ts`
- Modify: `db/schema.ts`
- Modify: `types/database.ts`

**Interfaces:**
- Produces: nullable `protein_target_g`, `carbs_target_g`, `fat_target_g`
- Produces: `parsePlanTargets(input): PlanTargetParseResult`

- [ ] **Step 1: Create the migration through the Supabase CLI**

Run: `supabase migration new nutrition_plan_manual_targets`

Expected: a generated migration ending in `_nutrition_plan_manual_targets.sql`.

- [ ] **Step 2: Write failing pgTAP tests**

Assert the three columns exist, owners can update them, coaches cannot update them, values below zero fail, and practical upper bounds fail: protein/carbohydrates above 1000 g and fat above 500 g.

- [ ] **Step 3: Write failing TypeScript parser tests**

```ts
expect(parsePlanTargets({
  calories_target: '2400', protein_target_g: '170',
  carbs_target_g: '280', fat_target_g: '75',
})).toEqual({
  ok: true,
  targets: { calories: 2400, protein_g: 170, carbs_g: 280, fat_g: 75 },
})

expect(parsePlanTargets({
  calories_target: '', protein_target_g: '',
  carbs_target_g: '', fat_target_g: '',
})).toEqual({ ok: true, targets: null })
```

Add cases for partial values, decimal comma, negative/non-numeric values, calories outside 500–10000, and macro bounds.

- [ ] **Step 4: Run and verify RED**

Run: `npx vitest run lib/nutrition/plan-targets.test.ts`

Expected: FAIL because the module is missing.

- [ ] **Step 5: Implement migration and parser**

Add nullable integer/real columns with database checks. Export:

```ts
export type PlanTargetFields = {
  calories_target: string
  protein_target_g: string
  carbs_target_g: string
  fat_target_g: string
}
export type PlanTargetParseResult =
  | { ok: true; targets: MacroTotals | null }
  | { ok: false; field: keyof PlanTargetFields; code: string }
```

All four blank means `null`; otherwise every field is required so the UI never presents a partial macro target as complete.

- [ ] **Step 6: Update Drizzle and Supabase types**

Add the three columns to `nutritionPlans` and to Row/Insert/Update in `types/database.ts`.

- [ ] **Step 7: Verify**

Run: `supabase db reset && supabase test db && npx vitest run lib/nutrition/plan-targets.test.ts && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations supabase/tests/database/nutrition_plan_targets.test.sql lib/nutrition/plan-targets.ts lib/nutrition/plan-targets.test.ts db/schema.ts types/database.ts
git commit -m "feat: add manual nutrition plan targets"
```

### Task 2: Persist Targets on Upload and Edit

**Files:**
- Modify: `app/api/nutrition/plans/route.ts`
- Modify: `app/api/nutrition/plans/[id]/route.ts`
- Modify: `lib/nutrition/plan-targets.test.ts`

**Interfaces:**
- Consumes: `parsePlanTargets`
- Produces: create and `PATCH /api/nutrition/plans/:id` persistence

- [ ] **Step 1: Add failing form-mapping tests**

Extract and test `planTargetInsert(targets)`:

```ts
expect(planTargetInsert({ calories: 2400, protein_g: 170, carbs_g: 280, fat_g: 75 })).toEqual({
  calories_target: 2400,
  protein_target_g: 170,
  carbs_target_g: 280,
  fat_target_g: 75,
})
expect(planTargetInsert(null)).toEqual({
  calories_target: null,
  protein_target_g: null,
  carbs_target_g: null,
  fat_target_g: null,
})
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run lib/nutrition/plan-targets.test.ts`

Expected: FAIL because `planTargetInsert` is missing.

- [ ] **Step 3: Update POST**

Parse the four `FormData` fields before Storage upload. Invalid fields return status 400 and perform no upload. Persist all four normalized columns in the existing insert; retain the current storage/database/profile-mode compensation logic.

- [ ] **Step 4: Add PATCH**

Add an authenticated `PATCH` handler that accepts JSON `{ calories_target, protein_target_g, carbs_target_g, fat_target_g, notes }`, validates targets, updates only a row owned by `user.id`, and returns 404 when the plan is absent. It must not change storage path, filename, dates, provider, or active state.

- [ ] **Step 5: Verify**

Run: `npx vitest run lib/nutrition/plan-targets.test.ts lib/nutrition/plan-document.test.ts lib/nutrition/plan-mode-transition.test.ts && npx tsc --noEmit && npm run lint`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/nutrition/plans/route.ts app/api/nutrition/plans/[id]/route.ts lib/nutrition/plan-targets.ts lib/nutrition/plan-targets.test.ts
git commit -m "feat: save manual targets with nutrition plans"
```

### Task 3: Resolve Targets by Nutrition Mode

**Files:**
- Modify: `lib/nutrition/plan-targets.test.ts`
- Modify: `lib/nutrition/plan-targets.ts`
- Modify: `app/[locale]/nutricion/page.tsx`
- Modify: `app/[locale]/dashboard/page.tsx`
- Modify: `components/nutrition/NutritionToday.tsx`

**Interfaces:**
- Produces: `resolveNutritionTarget(mode, planTargets, dayTarget): MacroTotals | null`
- Consumes: `NutritionTrackingMode`, active plan, selected day type

- [ ] **Step 1: Write failing source-selection tests**

```ts
expect(resolveNutritionTarget('plan_document', plan, day)).toEqual(plan)
expect(resolveNutritionTarget('plan_document', null, day)).toBeNull()
expect(resolveNutritionTarget('macro_targets', plan, day)).toEqual(day)
expect(resolveNutritionTarget('macro_targets', plan, null)).toBeNull()
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run lib/nutrition/plan-targets.test.ts`

Expected: FAIL because resolver is missing.

- [ ] **Step 3: Implement the pure resolver**

Do not merge sources. Return exactly one full source according to mode.

- [ ] **Step 4: Wire the page and client component**

Replace `planCaloriesTarget` with `trackingMode` and `planTargets: MacroTotals | null`. Build plan targets only when all four active-plan fields are non-null. In `NutritionToday`, resolve the selected day row to `MacroTotals` and call the pure resolver. When it returns null, link `plan_document` users to `#nutrition-plan` and `macro_targets` users to the catalog target editor.

- [ ] **Step 5: Wire today's dashboard fuel to the same source**

In `app/[locale]/dashboard/page.tsx`, select `nutrition_tracking_mode` with the profile, query the user's active nutrition plan targets, convert the selected day-type row to `MacroTotals`, and call `resolveNutritionTarget`. Pass that result to `FuelTodayCard`. Do not merge document macros with day-type macros.

- [ ] **Step 6: Verify**

Run: `npx vitest run lib/nutrition/plan-targets.test.ts lib/nutrition/tracking-mode.test.ts && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/nutrition/plan-targets.ts lib/nutrition/plan-targets.test.ts app/[locale]/nutricion/page.tsx app/[locale]/dashboard/page.tsx components/nutrition/NutritionToday.tsx
git commit -m "feat: resolve nutrition targets from active workflow"
```

### Task 4: Make PDF Boundaries and Manual Editing Explicit

**Files:**
- Create: `lib/nutrition-plan-layout.test.ts`
- Modify: `components/nutrition/NutritionPlanCard.tsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Consumes: target-enabled plan rows and PATCH endpoint
- Produces: explicit reference-only upload and manual-target editor

- [ ] **Step 1: Write failing source/copy tests**

Assert the card renders `referenceOnly`, inputs for all four target names, and a PATCH request; assert Spanish copy contains “No analiza” and does not promise recipes.

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run lib/nutrition-plan-layout.test.ts`

Expected: FAIL because the fields and copy are absent.

- [ ] **Step 3: Update the upload UI**

Give the card `id="nutrition-plan"` and place the reference-only message above the file input. Add four manual target inputs and an optional notes textarea. Label targets optional as a group but explain that if one is entered all four are required. Keep PDF, title, source, and dates unchanged.

- [ ] **Step 4: Add active-plan editing**

Show existing targets and notes plus **Configurar objetivos manuales** when targets are absent. Submit PATCH without re-uploading the PDF; replace the plan in local state and refresh the route after success.

- [ ] **Step 5: Add all locale keys**

Add matched keys for reference-only behavior, manual targets, edit/save states, complete-set requirement, and target source label.

- [ ] **Step 6: Verify**

Run: `npx vitest run lib/nutrition-plan-layout.test.ts lib/nutrition/plan-targets.test.ts && npx tsc --noEmit && npm run lint`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/nutrition-plan-layout.test.ts components/nutrition/NutritionPlanCard.tsx messages
git commit -m "feat: clarify manual nutrition plan workflow"
```

### Task 5: Clarify Daily Objectives, Fuel, and Frequent Foods

**Files:**
- Modify: `lib/nutrition-plan-layout.test.ts`
- Modify: `components/nutrition/CatalogEditor.tsx`
- Modify: `components/dashboard/FuelTodayCard.tsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Consumes: existing targets, consumed totals, food CRUD
- Produces: explanatory copy and clearer action labels only

- [ ] **Step 1: Add failing copy-key tests**

Assert source uses `dailyObjectivesHelp`, `todayFuelHelp`, `frequentFoodsHelp`, and `saveFrequentFood`; assert all catalogs contain those keys.

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run lib/nutrition-plan-layout.test.ts`

Expected: FAIL because the keys are absent.

- [ ] **Step 3: Update the UI language**

Explain:

- Daily objectives are manually entered intended consumption.
- Today's fuel is logged consumption compared with those objectives.
- Foods and portions are reusable shortcuts, not recommendations.

Rename the create action to “Guardar alimento frecuente” in Spanish and equivalent English/German copy. Do not change food persistence or substitution logic.

- [ ] **Step 4: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint`

Expected: PASS.

- [ ] **Step 5: Manually verify**

Upload a PDF with no targets, configure targets later, log one meal, and confirm the page shows the active plan as the source. Switch the profile to `macro_targets` and confirm day-type targets become the source.

- [ ] **Step 6: Commit**

```bash
git add lib/nutrition-plan-layout.test.ts components/nutrition/CatalogEditor.tsx components/dashboard/FuelTodayCard.tsx messages
git commit -m "feat: explain nutrition targets and food shortcuts"
```
