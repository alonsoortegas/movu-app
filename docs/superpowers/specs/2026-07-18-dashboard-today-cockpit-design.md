# Dashboard Rework — "Today Cockpit" Design

**Date:** 2026-07-18
**Status:** Approved

## Goal

Rework the dashboard (`app/[locale]/dashboard/page.tsx`) so it reflects the data now
living in the workout plan, nutrition, and trends pages. The AI insight card is removed.
The dashboard's primary job is answering **"what do I do right now?"** — an action-first
today view — backed by a compact week-level strip condensed from trends.

## Approach

Server-component rewrite reusing the existing trends compute layer. The page queries
Supabase directly (same pattern as the trends and plan pages) and reuses
`computeBodyTrend`, `computeFuelTrends`, and `computeLoadTrends` from
`lib/trends/compute.ts`, plus the existing chart primitives in
`components/charts/charts.tsx` and mobile panel components. No new API routes; no new
client state. Logging actions stay on the plan and nutrition pages — the dashboard links
to them.

## Removed

- AI insight card, both the mobile `MobilePanel` variant and the desktop variant, and the
  `insights` table query. (`/api/insights/latest` and the `insights` table remain
  untouched — out of scope.)
- The emoji week-day grid (mobile and desktop variants).
- The generic metric tiles for weekly calories and weekly active time.
- The muscle-group frequency chips panel.
- The weekly progress bars panel (workouts / active minutes / calories vs hardcoded
  targets).
- Obsolete `dashboard.ai*` and other now-unused i18n keys in both locale message files.

## Page sections (top to bottom)

### 1. Today's session (workout plan)

Data: active `workout_plans` row → `getPlanWeek(plan)` → this week's
`workout_plan_sessions` → match today's `day_of_week` → count
`workout_plan_exercises`.

Card shows: session title, session type, exercise count, prescribed set volume. CTA
links to `/{locale}/plan` ("Start session").

States:
- **Rest day** (no session matches today): show "Rest day" and the next upcoming
  session's title/day.
- **No active plan**: CTA to `/{locale}/plan/edit`.
- **Plan inactive** (`getPlanWeek` returns not_started / expired): same treatment as no
  active plan, with the inactive reason.

### 2. Fuel today (nutrition)

Data: today's `nutrition_days` row (day type, default `moderate`), `nutrition_targets`
for that day type, today's `meal_logs` + `meal_log_items` summed.

Card shows: day type, kcal consumed vs target and protein consumed vs target as two
compact horizontal bars, plus a remaining line ("X kcal · Y g protein remaining"; when
over target, "over by X kcal"). CTA links to `/{locale}/nutricion` ("Log meal").

State: nothing logged → consumed 0, remaining = full targets. No targets configured →
show consumed only with CTA to nutrition page.

### 3. Today's inputs

Slim tile row (existing `MetricTile` / equivalent):
- Last-night sleep hours (existing `sleep_logs` query).
- Steps today (existing `daily_metrics` query).
- Recovery % when Whoop data exists (`daily_metrics.recovery_score`); tile hidden when
  absent.

### 4. Week strip (condensed trends)

Every element links to `/{locale}/trends`.

- **Weight verdict chip**: active phase kind + signed kg/week rate + verdict color
  (on_track / fast / slow), via `computeBodyTrend` over a 4-week window of
  `body_measurements` and `training_phases`. Hidden when fewer than 2 weigh-ins.
- **Fuel adherence**: current ISO week's logged-days %, kcal-within-10% %, protein-hit %
  via `computeFuelTrends` over the current week's `meal_logs` / `nutrition_days` /
  `nutrition_targets`.
- **Load bars**: last 6 weeks of training minutes via `computeLoadTrends` rendered with
  the existing `BarChart`, current week highlighted, plus total session count for this
  week.

### 5. Recent workouts

Existing recent-workouts list stays, trimmed to 3 entries, placed under the week strip.

## Structure cleanup

Each section is written once with responsive Tailwind classes instead of the current
duplicated `md:hidden` / `hidden md:block` trees. Existing panel components
(`MobilePanel`, `panel` class, chart primitives) already adapt across breakpoints.

Colors and chip styling follow the trends page constants (MINT/CYAN/VIOLET/CORAL/AMBER,
verdict color mapping) so the dashboard reads as a condensation of the same system.

## i18n

New keys under `dashboard.*` in both locale message files (ES and EN): today-session
card (title, rest day, next session, no-plan/inactive states, CTA), fuel-today card
(consumed/remaining/over, CTA), week-strip labels (phase/rate/verdict, adherence
labels, load label). Removed keys: `dashboard.ai*`, week-day grid keys, progress-bar
keys, muscle-group keys.

## Error handling

Missing data never breaks the page: every section has an explicit empty state (mirrors
the trends page's `EmptyNote` pattern). Supabase query errors are logged server-side
and render the section's empty state.

## Testing

- The compute functions reused here are already covered by existing lib tests.
- Page verification: load `/dashboard` with seeded data and confirm the three main
  empty states (no active plan, rest day, nothing logged today) plus the populated
  happy path render correctly on mobile and desktop widths.
