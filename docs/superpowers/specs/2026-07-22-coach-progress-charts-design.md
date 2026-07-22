# Coach Progress Charts Design

**Date:** 2026-07-22  
**Status:** Approved design  
**Branch:** `main`

## Goal

Make the coach client detail page immediately understandable and more useful for weekly follow-up. Stored profile goal keys must render as localized product copy, while recent nutrition and weight data must become compact, honest trend visualizations that remain read-only for the coach.

## Product Decisions

### Localized goal

The client header resolves known stored goal keys through the existing Profile goal translations. For example, `loseGainMuscle` renders as “Perder grasa y ganar músculo” in Spanish and its equivalent in English or German.

Unknown or blank legacy values must not break the page. A blank value uses the existing localized “no goal” copy; an unknown non-empty value is shown as-is so information is not silently discarded.

### Weight trend

The coach sees a weight card covering the last four weeks:

- Plot each recorded `body_measurements.weight_kg` value chronologically.
- Label points with their measurement date and value in kilograms.
- Show the net change from the first visible measurement to the last visible measurement.
- With one measurement, show the value and a localized insufficient-history note instead of implying a trend.
- With no measurements, show a weight-specific empty state instead of an empty or invented chart.

The existing headline weight metric remains the member's latest known measurement, even when that measurement is older than four weeks.

### Nutrition trend

The coach sees a daily calorie chart for the most recent seven calendar days, including today:

- Consumed calories are aggregated from meal-log items for each day.
- The calorie target follows the member's selected `nutrition_tracking_mode`.
- In `plan_document` mode, use the active plan's `calories_target` for each day.
- In `macro_targets` mode, use the target matching the recorded `nutrition_days.day_type`; when a day has no recorded type, use the moderate target.
- A day without any meal log is “no data,” not zero calories.
- When a calorie target is unavailable, show consumption where available and omit the target rather than falling back to the other nutrition mode.

The card communicates consumed versus target with distinct visual treatments and localized labels. It does not expose editing controls.

## Page Layout

The existing client header, metric summary, recent workouts and nutrition-plan/target summary stay intact.

A responsive two-card progress section is added below the headline metrics and before the longer workout/nutrition summaries:

1. **Weight · last 4 weeks** — line trend, current value and net change.
2. **Nutrition · last 7 days** — daily calories consumed compared with the applicable target.

Cards stack on small screens and form a two-column grid where space permits. They reuse the application's chart primitives, tokens and interaction patterns rather than embedding the full member Trends page.

## Data and Query Boundaries

The server-rendered coach client page performs all reads with the signed-in coach's Supabase client and existing active-grant RLS policies. It must not use a service-role client.

In addition to the existing latest-measurement query, fetch:

- `body_measurements.measured_at, weight_kg` within the four-week window, oldest first.
- `meal_logs.id, logged_at` within the seven-day window plus their `meal_log_items.calories`.
- `nutrition_days.date, day_type` within the seven-day window.

The page already fetches the active nutrition plan, the member's nutrition mode and all nutrition targets; those results are reused for nutrition target resolution.

Date windows are calculated as calendar dates in the application's existing date conventions. Display labels use the active locale. Aggregation and presentation structures are prepared outside the chart components so rendering remains simple.

## Components and Pure Logic

Create a coaching progress helper that:

- Generates the seven inclusive calendar-day keys.
- Aggregates meal-item calories by day while preserving the distinction between “no meal log” and a logged zero.
- Resolves each day's target from nutrition mode, plan, day type and target rows.
- Normalizes chronological weight points and calculates first-to-last change.

Create a client-side `ClientProgressCharts` presentation component. It accepts prepared serializable points and localized labels; it does not query Supabase or decide access. The component owns hover presentation, responsive layout and empty/single-point states.

Known goal localization is handled at the server-page boundary with a small safe resolver so unknown legacy keys do not cause a translation exception.

## Security and Privacy

- The coach remains read-only.
- Revoking the active coaching grant hides all chart data immediately through existing RLS.
- No new tables, policies, migrations, mutation endpoints or service-role paths are introduced.
- The charts expose only data already available elsewhere to the authorized coach.

## Localization and Accessibility

Add all new titles, ranges, legends, summaries and empty states in Spanish, English and German. Reuse existing goal translations instead of duplicating goal wording under Coaching.

Charts must not rely on color alone: legends and hover/value labels identify consumed calories, calorie targets and weight values. Empty and single-measurement states remain readable without a chart. Dates and signed numeric changes use locale-aware formatting.

## Error and Empty States

- Unknown goal key: show the stored text safely.
- Blank goal: show the existing localized no-goal state.
- No weight in four weeks: show the weight-specific empty state; keep the latest-ever headline metric if one exists.
- One weight point: show that point plus the insufficient-history note; do not calculate a misleading trend.
- No meal logs on a day: mark the day as no data rather than zero.
- No meal logs for the entire week: show a nutrition-specific empty state.
- Missing target for the selected mode: retain observed consumption and explain that no calorie target is configured.
- Individual query failure: render the affected section's unavailable state without granting broader access or fabricating values.

## Testing

### Unit tests

- Goal resolver localizes every known goal key.
- Goal resolver safely handles blank and unknown stored values.
- Seven-day series includes exactly seven ordered dates, including today.
- Multiple meal items and meal logs aggregate into the correct daily total.
- A missing meal log remains `null`; a logged zero remains `0`.
- PDF mode uses only the active plan calorie target.
- Macro mode uses the recorded day type and defaults an unrecorded day to moderate.
- Missing selected-mode targets do not fall back across modes.
- Weight points sort chronologically and ignore missing weights.
- Weight change is calculated only when at least two measurements exist.

### Integration and regression verification

- Sebas can see Alonso's chart data with an active coaching grant.
- Revoked or unrelated coaches receive no client data through RLS.
- Coach cannot mutate measurements, meals, nutrition days, plans or targets.
- Run focused tests, the full Vitest suite, TypeScript, ESLint and the production build.
- Verify the Spanish coach page visually at desktop and mobile widths, including hover labels and empty states.

## Acceptance Scenario

Sebas opens Alonso's Coaching detail page in Spanish. The header says “Perder grasa y ganar músculo,” not `loseGainMuscle`. The weight card displays Alonso's measurements from the last four weeks and the net change across the visible period. The nutrition card shows the last seven days of consumed calories against the target selected by Alonso's current nutrition mode. Missing meal days say “sin datos,” and Sebas cannot edit any of the underlying information.
