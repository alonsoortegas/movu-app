# External LLM Training Plan Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user prepare and copy a prompt for an external LLM, paste its versioned JSON response, preview it, and atomically import it as the active Movu workout plan.

**Architecture:** Pure TypeScript modules own the prompt contract, normalization, and field-level validation. A client wizard owns only the four UI states, while an authenticated route calls a `security invoker` Postgres function so creation and active-plan replacement happen in one transaction.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 18, next-intl, Supabase Postgres/Auth/RLS, Vitest, pgTAP

## Global Constraints

- Movu never calls an LLM, opens a third-party chat automatically, stores an LLM credential, or persists prompt/response history.
- The user reviews the personal context before copying it.
- Schema version is exactly `"1.0"` and unknown JSON fields are rejected.
- Ownership always comes from the authenticated session, never imported JSON.
- Suggested weight and performed weight remain separate.
- Preserve Spanish, English, and German coverage.
- Do not add a runtime validation dependency; keep the contract in a focused pure TypeScript module.
- Before schema work, fetch `https://supabase.com/changelog.md`, scan relevant breaking changes, verify the current database-function documentation, and inspect `supabase migration new --help`.
- Follow red-green-refactor for every production behavior.

---

## File Structure

- `lib/workout/plan-import.ts` — versioned types, JSON parsing, normalization, size limits, and field errors.
- `lib/workout/plan-import.test.ts` — contract and normalization tests.
- `lib/workout/plan-prompt.ts` — reviewed brief types and deterministic external-LLM prompt builder.
- `lib/workout/plan-prompt.test.ts` — prompt privacy and contract tests.
- `components/plan/PlanImportWizard.tsx` — prepare/copy/paste/review workflow.
- `lib/plan-import-layout.test.ts` — source-level UI wiring and weight-label regression tests.
- `app/api/plan/import/route.ts` — authenticated import endpoint.
- CLI-generated `supabase/migrations/*_atomic_workout_plan_import.sql` — atomic import RPC.
- `supabase/tests/database/import_workout_plan.test.sql` — ownership and rollback tests.
- `app/[locale]/plan/edit/page.tsx` — loads safe profile defaults.
- `components/plan/PlanEditor.tsx` — hosts the wizard and refreshes imported data.
- `components/plan/PlanWeekView.tsx` and `components/workout/PerformedWorkoutLogger.tsx` — explicit suggested/actual weight labels.
- `types/database.ts` — RPC typing.
- `messages/es.json`, `messages/en.json`, `messages/de.json` — complete workflow copy.

### Task 1: Define and Validate Schema Version 1.0

**Files:**
- Create: `lib/workout/plan-import.test.ts`
- Create: `lib/workout/plan-import.ts`

**Interfaces:**
- Produces: `ImportedPlanV1`, `PlanImportIssue`, `PlanImportResult`, `parseImportedPlanJson(text: string): PlanImportResult`
- Consumes: no application state or database client

- [ ] **Step 1: Write failing happy-path and nullable-field tests**

```ts
import { describe, expect, it } from 'vitest'
import { parseImportedPlanJson } from './plan-import'

const valid = {
  schema_version: '1.0',
  name: 'HYROX Acapulco',
  start_date: '2026-08-01',
  weeks: [{
    week_number: 1,
    sessions: [{
      day_of_week: 'monday',
      title: 'Stations',
      session_type: 'strength',
      notes: null,
      exercises: [{
        name: ' Wall balls ',
        sets: 4,
        reps: '15',
        suggested_weight_kg: 6,
        target_rpe: '7',
        rest_seconds: 60,
        superset_group: null,
        is_isometric: false,
        notes: null,
      }],
    }],
  }],
}

describe('parseImportedPlanJson', () => {
  it('normalizes a complete version 1.0 plan', () => {
    const result = parseImportedPlanJson(JSON.stringify(valid))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.plan.weeks[0].sessions[0].exercises[0].name).toBe('Wall balls')
  })

  it('accepts null for every optional prescription field', () => {
    const input = structuredClone(valid)
    Object.assign(input.weeks[0].sessions[0].exercises[0], {
      sets: null, reps: null, suggested_weight_kg: null, target_rpe: null,
      rest_seconds: null, superset_group: null, notes: null,
    })
    expect(parseImportedPlanJson(JSON.stringify(input)).ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests and verify the missing-module failure**

Run: `npx vitest run lib/workout/plan-import.test.ts`

Expected: FAIL because `./plan-import` does not exist.

- [ ] **Step 3: Add one failing table-driven rejection test**

Add cases for malformed JSON, payload over 500 KiB, version `2.0`, unknown root/exercise fields, impossible date, weeks starting at 2, nonconsecutive or duplicate weeks, invalid day, invalid session type, blank exercise name, negative sets/rest/weight, and RPE outside 1–10. Assert the first error path, for example:

```ts
expect(parseImportedPlanJson(JSON.stringify(bad))).toEqual({
  ok: false,
  issues: [{ path: 'weeks[0].sessions[0].exercises[0].sets', code: 'nonnegative_integer' }],
})
```

- [ ] **Step 4: Implement the strict parser**

Define the exact public types:

```ts
export type ImportedDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export type ImportedSessionType = 'strength' | 'activation' | 'cardio' | 'other'
export type PlanImportIssue = { path: string; code: string }
export type PlanImportResult =
  | { ok: true; plan: ImportedPlanV1 }
  | { ok: false; issues: PlanImportIssue[] }

export interface ImportedExerciseV1 {
  name: string
  sets: number | null
  reps: string | null
  suggested_weight_kg: number | null
  target_rpe: string | null
  rest_seconds: number | null
  superset_group: number | null
  is_isometric: boolean
  notes: string | null
}
```

Use `JSON.parse`, `Object.keys` allowlists, a round-trip ISO date check, maximum 52 weeks, maximum 7 sessions per week, maximum 40 exercises per session, and maximum 500 KiB input. Accumulate deterministic path/code issues and return no partially normalized plan.

- [ ] **Step 5: Verify contract tests pass**

Run: `npx vitest run lib/workout/plan-import.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/workout/plan-import.ts lib/workout/plan-import.test.ts
git commit -m "feat: validate imported workout plan JSON"
```

### Task 2: Build the Reviewed External-LLM Prompt

**Files:**
- Create: `lib/workout/plan-prompt.test.ts`
- Create: `lib/workout/plan-prompt.ts`

**Interfaces:**
- Consumes: `ImportedPlanV1` contract vocabulary from Task 1
- Produces: `PlanPromptBrief`, `PlanPromptContext`, `buildPlanPrompt(brief, context): string`

- [ ] **Step 1: Write failing prompt-content and privacy tests**

```ts
import { describe, expect, it } from 'vitest'
import { buildPlanPrompt } from './plan-prompt'

const brief = {
  goal: 'HYROX Acapulco',
  event_date: '2026-08-29',
  available_days: ['monday', 'wednesday', 'friday', 'sunday'],
  session_duration_min: 60,
  training_level: 'intermediate',
  equipment: 'Full gym and sled',
  limitations: 'None reported',
  current_performance: '5 km in 25 minutes',
}

it('includes the brief, JSON-only rule, schema version, and contract example', () => {
  const prompt = buildPlanPrompt(brief, { includeWeight: true, weightKg: 72, includeSex: false, sex: 'male' })
  expect(prompt).toContain('HYROX Acapulco')
  expect(prompt).toContain('"schema_version": "1.0"')
  expect(prompt).toContain('Return JSON only')
  expect(prompt).toContain('72 kg')
  expect(prompt).not.toContain('male')
})
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run lib/workout/plan-prompt.test.ts`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement a deterministic prompt builder**

Export:

```ts
export interface PlanPromptBrief {
  goal: string
  event_date: string | null
  available_days: ImportedDay[]
  session_duration_min: number
  training_level: 'beginner' | 'intermediate' | 'advanced'
  equipment: string
  limitations: string
  current_performance: string
}

export interface PlanPromptContext {
  includeWeight: boolean
  weightKg: number | null
  includeSex: boolean
  sex: string | null
}
```

The generated prompt must contain the reviewed inputs, JSON-only rules, all allowed enums, null rules, the complete compact contract example, “never invent medical clearance/injuries/records/equipment,” and no optional profile value whose include flag is false.

- [ ] **Step 4: Run both pure-module suites**

Run: `npx vitest run lib/workout/plan-prompt.test.ts lib/workout/plan-import.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/workout/plan-prompt.ts lib/workout/plan-prompt.test.ts
git commit -m "feat: build external training plan prompt"
```

### Task 3: Add Atomic Authenticated Plan Import

**Files:**
- Create via CLI: `supabase/migrations/*_atomic_workout_plan_import.sql`
- Create: `supabase/tests/database/import_workout_plan.test.sql`
- Modify: `types/database.ts`

**Interfaces:**
- Consumes: normalized `ImportedPlanV1` serialized as `jsonb`
- Produces: `public.import_workout_plan(p_plan jsonb) returns uuid`

- [ ] **Step 1: Create the migration through the Supabase CLI**

Run: `supabase migration new atomic_workout_plan_import`

Expected: the CLI prints the new migration path ending in `_atomic_workout_plan_import.sql`. Use that exact generated file.

- [ ] **Step 2: Write failing pgTAP tests**

Create `pg_temp.valid_plan_fixture()` returning a literal version `1.0` JSON document with two sessions and a `Wall balls` exercise at 6 kg. Create `pg_temp.failing_plan_fixture()` from the same literal but set the second exercise's `suggested_weight_kg` to `"not-a-number"` so the database cast fails after earlier inserts have run. Then prove:

```sql
select has_function('public', 'import_workout_plan', array['jsonb']);
select lives_ok($$ select public.import_workout_plan(valid_plan_fixture()) $$, 'owner imports');
select is((select count(*) from public.workout_plan_sessions where plan_id = imported_id), 2::bigint);
select is((select prescribed_weight_kg from public.workout_plan_exercises where exercise_name = 'Wall balls'), 6::real);
select throws_ok($$ select public.import_workout_plan(failing_fixture()) $$);
select ok((select active from public.workout_plans where id = old_plan_id), 'old plan remains active after rollback');
```

Also set `request.jwt.claim.sub` for two users and prove the function only writes the current user's ID.

- [ ] **Step 3: Run the database test and verify RED**

Run: `supabase db reset && supabase test db`

Expected: FAIL because the function does not exist.

- [ ] **Step 4: Implement the transaction function**

Create a `language plpgsql security invoker set search_path = ''` function. It must:

1. Read `(select auth.uid())` and reject null.
2. Insert the new inactive plan using `p_plan->>'name'`, `start_date`, and `jsonb_array_length(weeks)`.
3. Iterate weeks, sessions, and exercises with `jsonb_array_elements`.
4. Map `suggested_weight_kg` to `prescribed_weight_kg` and array ordinality to `order_index`.
5. Deactivate the caller's old active plan only after every child insert succeeds.
6. Activate the new plan and return its ID.

Revoke execute from `public` and `anon`; grant execute to `authenticated`. Do not use `security definer`.

- [ ] **Step 5: Add the Supabase function type**

```ts
import_workout_plan: {
  Args: { p_plan: Json }
  Returns: string
}
```

- [ ] **Step 6: Verify database behavior**

Run: `supabase db reset && supabase test db`

Expected: PASS, including rollback and ownership assertions.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations supabase/tests/database/import_workout_plan.test.sql types/database.ts
git commit -m "feat: atomically import workout plans"
```

### Task 4: Expose the Import Endpoint

**Files:**
- Create: `app/api/plan/import/route.ts`
- Modify: `lib/workout/plan-import.test.ts`
- Modify: `lib/workout/plan-import.ts`

**Interfaces:**
- Consumes: `{ json: string }`, `parseImportedPlanJson`, `toImportRpcPayload`, `import_workout_plan`
- Produces: `POST /api/plan/import` → `{ planId: string }` or `{ error: string, issues?: PlanImportIssue[] }`

- [ ] **Step 1: Add a failing RPC-payload test**

Import the not-yet-existing `toImportRpcPayload` and prove it produces a `Json`-compatible object without losing nulls, order, or suggested weight:

```ts
const parsed = parseImportedPlanJson(JSON.stringify(valid))
if (!parsed.ok) throw new Error('fixture must be valid')
const payload = toImportRpcPayload(parsed.plan)
expect(payload).toEqual(JSON.parse(JSON.stringify(parsed.plan)))
expect(JSON.stringify(payload)).toContain('"suggested_weight_kg":6')
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run lib/workout/plan-import.test.ts`

Expected: FAIL because `toImportRpcPayload` is missing.

- [ ] **Step 3: Implement the payload conversion**

Return `JSON.parse(JSON.stringify(plan)) as Json`. Keep this boundary helper in `plan-import.ts` so the API does not use an unsafe double cast.

- [ ] **Step 4: Implement the route**

The route must:

```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const body = await request.json().catch(() => null)
const result = parseImportedPlanJson(typeof body?.json === 'string' ? body.json : '')
if (!result.ok) return NextResponse.json({ error: 'Invalid plan', issues: result.issues }, { status: 400 })
const { data: planId, error } = await supabase.rpc('import_workout_plan', { p_plan: toImportRpcPayload(result.plan) })
if (error) return NextResponse.json({ error: 'Plan import failed' }, { status: 500 })
return NextResponse.json({ planId }, { status: 201 })
```

Never return database details or echo the imported prompt/JSON.

- [ ] **Step 5: Verify**

Run: `npx vitest run lib/workout/plan-import.test.ts && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/plan/import/route.ts lib/workout/plan-import.ts lib/workout/plan-import.test.ts
git commit -m "feat: add workout plan import endpoint"
```

### Task 5: Build the Four-State Import Wizard

**Files:**
- Create: `components/plan/PlanImportWizard.tsx`
- Create: `lib/plan-import-layout.test.ts`
- Modify: `app/[locale]/plan/edit/page.tsx`
- Modify: `components/plan/PlanEditor.tsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Consumes: safe profile defaults `{ goal, weightKg, sex }`, `buildPlanPrompt`, `parseImportedPlanJson`, `POST /api/plan/import`
- Produces: `PlanImportWizard({ defaults, onImported })`

- [ ] **Step 1: Write failing source-level workflow tests**

Read the component and assert it contains:

```ts
expect(source).toContain("'prepare' | 'copy' | 'paste' | 'review'")
expect(source).toContain('navigator.clipboard.writeText')
expect(source).toContain('parseImportedPlanJson')
expect(source).toContain("fetch('/api/plan/import'")
expect(source).toContain('accept=\"application/json,.json\"')
expect(source).not.toContain('ANTHROPIC_API_KEY')
expect(source).not.toContain('window.open(')
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run lib/plan-import-layout.test.ts`

Expected: FAIL because `PlanImportWizard.tsx` is missing.

- [ ] **Step 3: Load only safe defaults on the server**

In the edit page, select `goal, weight_kg, sex` from the current user's profile and pass them to `PlanEditor`. Do not select email, WHOOP tokens, or health histories.

- [ ] **Step 4: Implement the wizard**

Implement these states:

- `prepare`: editable goal, event date, available-day toggles, minutes, level, equipment, limitations, current performance, and opt-in checkboxes for weight/sex.
- `copy`: read-only selectable prompt plus **Copiar prompt**. On clipboard rejection, leave the text selected/visible and show manual-copy help.
- `paste`: textarea and `.json` file input; file selection reads `file.text()`.
- `review`: only reachable when `parseImportedPlanJson` returns `ok`; show plan name, dates, week/session/exercise counts, each day, and suggested weights.

Expose two entry actions in `PlanEditor`: **Crear con IA externa** starts at `prepare`, while **Importar plan JSON** starts the same wizard at `paste`.

On successful POST, call `onImported(planId)`, close the wizard, and have `PlanEditor` reload/select the imported plan. Keep all draft values in component state only.

- [ ] **Step 5: Add complete locale copy**

Add the same key structure under `planEditor.import` in all three catalogs: actions, four step labels, every form label, privacy note, copy success/fallback, parse error codes, preview counts, import failure, and success.

- [ ] **Step 6: Verify**

Run: `npx vitest run lib/plan-import-layout.test.ts lib/workout/plan-import.test.ts lib/workout/plan-prompt.test.ts && npx tsc --noEmit && npm run lint`

Expected: PASS with no missing translation/type errors.

- [ ] **Step 7: Commit**

```bash
git add components/plan/PlanImportWizard.tsx components/plan/PlanEditor.tsx app/[locale]/plan/edit/page.tsx lib/plan-import-layout.test.ts messages
git commit -m "feat: add external LLM plan import workflow"
```

### Task 6: Separate Suggested and Performed Weight in the UI

**Files:**
- Modify: `lib/plan-import-layout.test.ts`
- Modify: `components/plan/PlanWeekView.tsx`
- Modify: `components/workout/PerformedWorkoutLogger.tsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Interfaces:**
- Consumes: existing `prescribed_weight_kg` and per-set `weight_kg`
- Produces: explicit labels without changing persistence

- [ ] **Step 1: Add failing label tests**

Assert the plan view uses `suggestedWeight`, the logger uses both `suggestedWeight` and `performedWeight`, and neither component mutates historical set logs.

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run lib/plan-import-layout.test.ts`

Expected: FAIL because the explicit keys are absent.

- [ ] **Step 3: Update labels**

Show the prescription as `Peso sugerido: {weight} kg` and the input as `Peso realizado`. Keep the current draft defaulting behavior and POST payload unchanged so actual set weight still writes to `workout_set_logs.weight_kg`.

- [ ] **Step 4: Run focused and full verification**

Run: `npx vitest run lib/plan-import-layout.test.ts lib/workout/set-log.test.ts lib/workout/performed-session.test.ts && npm test && npx tsc --noEmit && npm run lint`

Expected: all commands PASS.

- [ ] **Step 5: Manually verify**

Import a fixture plan, log a set with a different weight, refresh, and confirm the prescription and actual history retain their separate values.

- [ ] **Step 6: Commit**

```bash
git add lib/plan-import-layout.test.ts components/plan/PlanWeekView.tsx components/workout/PerformedWorkoutLogger.tsx messages
git commit -m "feat: distinguish suggested and performed weight"
```
