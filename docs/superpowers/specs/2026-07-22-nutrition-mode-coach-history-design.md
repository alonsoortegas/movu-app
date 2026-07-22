# Shared Nutrition Mode and Coach Workout History Design

**Date:** 2026-07-22  
**Status:** Approved design  
**Branch:** `feedback`

## Goal

Make the member and coach views agree on the member's primary nutrition workflow, while preserving both PDF plans and detailed macro tracking. Make the coach's recent-workout section useful for existing members whose history predates the canonical performed-workout model.

## Product Decisions

### Shared nutrition mode

Each member has one explicit `nutrition_tracking_mode`:

- `plan_document`: the active uploaded PDF is the primary nutrition reference.
- `macro_targets`: calorie and macro targets are the primary nutrition reference.

The setting controls both the member Nutrition page and the coach client summary. There are no separate coach/member preferences.

Existing members default to `macro_targets`, except members with an active nutrition-plan PDF at migration time, who are backfilled to `plan_document`. New members default to `macro_targets`.

Uploading the first active PDF switches the profile to `plan_document`. Archiving the active PDF switches the profile back to `macro_targets`. Members may explicitly switch modes at any time from Profile.

### Recent workouts

The coach client summary shows exactly the latest five available workout occurrences:

1. Canonical `performed_workouts` are authoritative.
2. Legacy `activities` fill gaps in older history.
3. An activity linked to a canonical performed workout is excluded from the legacy candidates.
4. The combined candidates are sorted newest-first and limited to five.

This is a display compatibility layer; it does not manufacture canonical exercise/set data for historical activity rows.

## Data Model

Add `user_profiles.nutrition_tracking_mode text not null default 'macro_targets'` with a check constraint limiting values to `plan_document` and `macro_targets`.

The migration backfills `plan_document` for users who have an active row in `nutrition_plans`. Existing profile ownership and active-coach SELECT policies already cover the new column. Member updates remain restricted to their own profile through the existing API allowlist and RLS policy.

No new cross-user service-role path is introduced.

## Application Behavior

### Profile

Add a localized “Nutrition method” section with two radio/card options. Saving Profile persists the selection through `PATCH /api/me`. `GET /api/me` returns the current mode.

If a member selects PDF mode without an active PDF, Profile may save the preference, but Nutrition must show a prominent upload prompt. It must not silently present macro targets as though they were the selected primary workflow.

### Member Nutrition page

In `plan_document` mode:

- Show the active PDF card first.
- Show provider, effective dates, kcal reference, signed-PDF action, archive action and history.
- Keep macro targets and meal logging under “Detailed logging (optional).”

In `macro_targets` mode:

- Show the daily calorie/macro experience first.
- Show target editing/catalog access normally.
- Keep PDF upload and history under an optional “Plan documents” disclosure.

Uploading a PDF updates the server profile mode and the page state to `plan_document`. Archiving the active PDF updates it to `macro_targets`.

### Coach client summary

The nutrition section follows the member's stored mode:

- PDF mode: active plan metadata and a signed “View PDF” action. If missing, show “Waiting for the member to upload an active PDF.”
- Macro mode: show the hard, moderate and rest calorie/protein/carbohydrate/fat targets. If none exist, show a macro-target-specific empty state.

The coach remains read-only. The signed-PDF route continues to rely on the coach grant and RLS.

The workouts section renders the merged latest-five list. Canonical rows retain their actual status. Legacy activities use a localized “Logged” status and their best available activity name/date.

## Components and Boundaries

### Pure helpers

Create a coaching history helper that accepts normalized performed workouts and activities, removes linked duplicates, sorts them, and returns at most five display rows.

Create a nutrition-mode helper that validates allowed modes and resolves the presentation state from the stored mode plus active-plan/target availability. UI components consume this result instead of duplicating fallback rules.

### Server queries

The coach client server page queries:

- Up to five recent performed workouts.
- Up to ten recent legacy activities so enough remain after linked duplicate removal.
- The profile nutrition mode.
- The active nutrition plan.
- All three nutrition target rows.

All queries use the signed-in coach Supabase client and existing RLS. No service-role client is permitted on coach pages.

### APIs

- `GET /api/me`: include `nutrition_tracking_mode`.
- `PATCH /api/me`: accept only the two legal values.
- PDF upload: after successfully activating the new plan, set the signed-in member's mode to `plan_document`.
- PDF archive: after successfully archiving the active plan, set the signed-in member's mode to `macro_targets`.

If the mode update fails after upload, the endpoint restores the previously active plan, removes the new metadata row and removes the newly uploaded object before returning an error. If the mode update fails after archive, the endpoint reactivates that plan before returning an error. A compensation failure is returned explicitly rather than reporting success with inconsistent state.

## Error and Empty States

- Invalid nutrition mode: field-level `400` response; no profile update.
- PDF mode without active document: upload prompt, not a generic “no nutrition plan” message.
- Macro mode without targets: target-setup prompt.
- No canonical workouts: legacy activities appear.
- No workout history of either kind: existing no-workouts empty state.
- Revoked coach access: all client queries remain hidden immediately through RLS.

## Localization and Responsive UI

All new copy is added in Spanish, English and German. The Profile selector uses 44px minimum interactive targets. Coach nutrition target cards stack on mobile and render in a compact grid on desktop.

## Testing

### Unit tests

- Canonical workouts sort ahead only by date, not by source.
- Linked activity duplicates are removed.
- Legacy activities fill the list to five.
- The result never exceeds five.
- Empty inputs return an empty list.
- Nutrition modes validate strictly.
- PDF mode reports a missing-document state rather than falling back silently.
- Macro mode reports a missing-target state.

### Database and API verification

- Migration constraint rejects unknown modes.
- Backfill selects PDF mode only for members with an active document.
- Member can update their own mode but not another member's.
- Coach can read the mode but cannot change it.
- Upload and archive synchronize the mode.

### Regression verification

Run the focused unit tests, full Vitest suite, TypeScript, ESLint, production build and linked Supabase migration dry-run. Database pgTAP remains available for a configured Supabase test environment without requiring Docker in this workspace.

## Acceptance Scenario

For Alonso's current data, Sebas sees the five newest rows drawn from the 250 legacy activities until new canonical performed workouts become newer. Alonso selects macro mode in Profile, so both Alonso's Nutrition page and Sebas's client summary lead with the three existing macro targets. After Alonso uploads and activates a PDF, both views switch to the PDF workflow; archiving it switches both back to macros.
