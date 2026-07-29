# MVP Plan Import and Nutrition Clarity Design

**Date:** 2026-07-29
**Status:** Approved in conversation
**Scope:** External training-plan generation, manual nutrition-plan capture, and removal of WHOOP controls from Trends

## Goal

Make Movu's current behavior understandable and immediately useful without calling an LLM from the application.

The MVP will:

1. Import a structured training plan generated outside Movu.
2. Let an athlete preview the plan before it becomes active.
3. Preserve suggested weights in the prescription and actual weights in workout logs.
4. Treat an uploaded nutrition PDF as a reference document only.
5. Require nutrition targets to be entered manually.
6. Remove WHOOP connection and synchronization controls from Trends.

## Product Boundaries

- Movu will not call an LLM for plan creation or nutrition extraction.
- Movu will not perform OCR or parse nutrition PDFs.
- Movu will not generate recipes or meal recommendations.
- Movu will not remove the existing WHOOP integration from Profile or data ingestion.
- Existing WHOOP-derived historical metrics may continue to appear in Trends.
- Existing manual plan editing and detailed meal logging remain available.

## Training Plan Import

### User flow

The plan editor gains an **Importar plan JSON** action.

1. The user generates a plan outside Movu using a maintained prompt supplied by Movu.
2. The user pastes JSON or selects a `.json` file.
3. Movu parses and validates the document without changing stored data.
4. Movu shows a preview grouped by week and day, including exercises, prescriptions, suggested weights, and warnings.
5. The user confirms the import.
6. Movu creates the complete plan and then marks it active.

The existing active plan is deactivated only after the new plan has been created successfully. A failed import leaves the current plan unchanged.

### Versioned contract

The root document uses this shape:

```json
{
  "schema_version": "1.0",
  "name": "HYROX Acapulco — 4 semanas",
  "start_date": "2026-08-01",
  "weeks": [
    {
      "week_number": 1,
      "sessions": [
        {
          "day_of_week": "monday",
          "title": "Fuerza y estaciones",
          "session_type": "strength",
          "notes": "Técnica antes de intensidad.",
          "exercises": [
            {
              "name": "Wall balls",
              "sets": 4,
              "reps": "15",
              "suggested_weight_kg": 6,
              "target_rpe": "7",
              "rest_seconds": 60,
              "superset_group": null,
              "is_isometric": false,
              "notes": null
            }
          ]
        }
      ]
    }
  ]
}
```

Required fields are `schema_version`, `name`, `start_date`, `weeks`, `week_number`, `sessions`, `day_of_week`, `title`, `session_type`, `exercises`, and exercise `name`. Optional prescription values may be `null`.

Validation rules:

- `schema_version` must equal `"1.0"`.
- `start_date` must be a real ISO calendar date.
- Weeks must be consecutive, begin at 1, and contain no duplicate week number.
- Plan duration is derived from the highest `week_number`; it is not accepted as a second source of truth.
- `day_of_week` must be one of Movu's seven canonical English day keys.
- `session_type` must be `strength`, `activation`, `cardio`, or `other`.
- Exercise names and visible labels are trimmed and cannot be empty.
- Sets, rest, and suggested weight cannot be negative.
- RPE, when numeric, must be between 1 and 10.
- Unknown fields are rejected so an outdated or hallucinated contract cannot be imported silently.
- The import has conservative size limits to prevent accidental or abusive payloads.

The contract will be expressed once as a runtime schema. TypeScript types, API validation, preview warnings, fixtures, and the external prompt will derive from or conform to that schema.

### External prompt

Movu will include a copyable prompt for use outside the application. It will instruct the LLM to:

- Return JSON only, with no markdown fences or commentary.
- Follow schema version `1.0`.
- Use the athlete's goal, event date, current activity, limitations, equipment, and available days.
- Keep progression appropriate to the requested time window.
- Put prescribed load in `suggested_weight_kg` only when enough information exists; otherwise use `null`.
- Never invent medical clearance, injuries, personal records, or unavailable equipment.

The prompt is an operator tool, not a user-facing AI feature. The importer remains the authority: output that does not validate is rejected.

### Persistence

The importer maps:

- Root document → `workout_plans`
- Week session → `workout_plan_sessions`
- Exercise → `workout_plan_exercises`
- `suggested_weight_kg` → `prescribed_weight_kg`

Confirmation is handled by an authenticated server endpoint. Ownership is always taken from the signed-in user, never from imported JSON.

The database write is atomic. Either the plan, all sessions, and all exercises are created and activated together, or no imported rows remain. The endpoint returns field-level validation errors for malformed documents and a generic safe error for unexpected persistence failures.

### Suggested versus actual weight

The weekly plan continues to display `prescribed_weight_kg` as the suggested load. During a performed workout, each logged set stores its own actual `weight_kg`. The interface labels these separately:

- **Peso sugerido** — prescription from the imported plan.
- **Peso realizado** — weight entered for the completed set.

Importing or editing a future prescription never changes historical set logs.

## Manual Nutrition Plan

### User flow

Uploading a nutrition PDF remains supported, but the interface states before upload:

> Movu guarda este PDF como referencia. No analiza el archivo ni crea recetas u objetivos automáticamente.

The upload form collects:

- Title
- Nutrition professional or source
- Effective start and optional end date
- PDF
- Daily calories
- Protein in grams
- Carbohydrates in grams
- Fat in grams
- Optional notes

The PDF and the manually entered values form the active nutrition plan. The user can edit the manual values later without replacing the PDF.

Calories and macros are optional at initial upload because some plans use portions instead of macros. When no targets are entered, Movu must not show empty progress as if it were a tracked objective. It instead shows **Configurar objetivos manuales**.

### Nutrition language

The UI distinguishes the concepts explicitly:

- **Objetivos diarios:** amounts the user intends to consume, entered manually from the nutrition plan.
- **Combustible del día:** consumption logged today compared with those objectives.
- **Mis alimentos y porciones:** reusable foods and serving sizes that make daily logging faster.

The catalog's creation action becomes **Guardar alimento frecuente**. Supporting copy explains that creating an item does not prescribe or recommend that food.

No recipes, substitutions, or recommendations are inferred from the PDF. Existing manually maintained substitutions may remain available, but they are not presented as PDF-generated results.

### Data model

The active `nutrition_plans` record remains the source for the uploaded document and its effective dates. It gains nullable manual targets for protein, carbohydrates, and fat alongside its existing calorie target.

The nutrition page uses targets from the active plan when the profile is in `plan_document` mode. The existing `nutrition_targets` table remains the source in `macro_targets` mode. The UI always names the active source so users do not confuse the two workflows.

## Trends Without WHOOP Controls

Trends will:

- Stop querying WHOOP connection and token status.
- Remove the `WhoopStatus` import and rendered connection/synchronization card.
- Make no `/api/whoop/sync` call.
- Continue rendering recovery, HRV, resting heart rate, sleep, and activity trends from available stored data.
- Continue showing clear empty states when those stored metrics do not exist.

This change does not delete the WHOOP API routes, tokens, Profile controls, database columns, or historical rows.

## Components and Boundaries

### Training import

- A pure schema module parses, normalizes, and reports field-level errors.
- A preview component renders only validated normalized data.
- An authenticated import endpoint owns persistence and active-plan transition.
- A database operation provides atomic creation.
- The external prompt is a version-controlled document tied to schema `1.0`.

### Nutrition

- Upload validation continues to own PDF type and size checks.
- Manual target validation is a separate pure function shared by create and update endpoints.
- The plan card communicates processing boundaries and exposes target editing.
- Daily nutrition presentation resolves its source by tracking mode.

### Trends

- Trends consumes stored health metrics only.
- WHOOP connection management remains outside Trends.

## Error Handling

- Invalid JSON reports syntax failure without sending or storing the content.
- Structurally invalid plans report paths such as `weeks[1].sessions[0].exercises[2].sets`.
- Unsupported schema versions explain that the prompt and importer versions must match.
- Duplicate weeks, invalid dates, or unsafe numeric values block preview and import.
- Persistence failure keeps the prior active plan intact.
- Nutrition upload failure removes any partially uploaded storage object.
- Manual nutrition values outside accepted physiological input bounds are rejected with field-specific messages. These bounds validate data entry only and do not constitute dietary advice.
- Removing WHOOP controls must not suppress recovery charts when stored data is present.

## Testing and Acceptance Criteria

### Automated tests

- Runtime schema accepts a complete four-week plan.
- Runtime schema accepts nullable prescription fields.
- Runtime schema rejects malformed JSON, unknown versions, unknown fields, duplicate/nonconsecutive weeks, invalid days, negative values, and out-of-range RPE.
- Import mapping preserves exercise order and suggested weight.
- Atomic import failure does not deactivate the current plan.
- Actual set weight remains independent from prescribed weight.
- Nutrition target validation accepts omitted targets and rejects invalid values.
- Nutrition source selection uses active-plan values only in `plan_document` mode.
- Trends has no WHOOP status dependency or synchronization control.
- Spanish, English, and German message catalogs contain all new keys.

### Manual acceptance

1. Generate a four-week HYROX plan externally, paste it, preview it, and import it.
2. Confirm the imported plan appears by week and day with suggested weights.
3. Complete a set with a different actual weight and verify both values remain distinct.
4. Attempt an invalid import and verify the previous plan remains active.
5. Upload a PDF without macros and see a clear manual-configuration action.
6. Upload or edit a plan with manual calories and macros and see them as today's objectives.
7. Open the food catalog and understand its purpose without prior explanation.
8. Open Trends and see no WHOOP connection or synchronization prompt.
9. Confirm existing stored recovery data still renders after the WHOOP card is removed.

## Delivery Order

1. Add the versioned training-plan schema, fixtures, and external prompt.
2. Add preview and atomic import.
3. Clarify prescribed versus performed weight.
4. Add manual macro fields and explanatory nutrition copy.
5. Clarify daily objectives, fuel, and personal catalog language.
6. Remove WHOOP controls from Trends.
7. Run focused tests, full tests, typecheck, lint, and responsive manual verification.
