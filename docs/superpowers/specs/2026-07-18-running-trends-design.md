# Running Trends — Design Spec

**Date:** 2026-07-18
**Status:** Approved (chat) — Phase 1 only
**Mockup:** https://claude.ai/code/artifact/71a1d9c2-1fec-4033-b29f-25c5673bb262

## Goal

Add a "Running" section to the Trends page (`/[locale]/trends`) showing running-specific
progress computed entirely from data already in Supabase. No schema changes.

## Data sources (Phase 1)

| Metric | Source columns | Notes |
|---|---|---|
| Weekly volume | `activities.distance_m`, `moving_time_s` where `activity_category = 'run'` | WHOOP + Apple Health |
| Pace | derived: `moving_time_s / (distance_m / 1000)` | `avg_pace_per_km_s` is never populated by either normalizer — derive, don't read it |
| Aerobic efficiency | derived: speed (m/min) ÷ `avg_hr_bpm` → meters per heartbeat | WHOOP runs only today (Apple runs lack per-workout HR until the iOS plugin is extended — Phase 2) |
| Intensity mix | `activities.hr_zones` on runs | WHOOP only; easy = Z0–Z2, moderate = Z3, hard = Z4–Z5 |
| VO₂max | `daily_metrics.vo2_max` | Apple Health only; WHOOP API does not expose VO₂max (verified against developer.whoop.com, Jul 2026) |

## Metric definitions

- **Weekly volume**: km per Monday-start week (`weekStartKey`), run count, longest single run (km).
  Runs without distance count toward run count but contribute 0 km.
- **Pace series**: one point per eligible run (date = CDMX date key of `start_date_utc`),
  value = seconds per km. Eligible: `distance_m ≥ 1000`, `moving_time_s > 0`, and pace
  within 150–900 s/km (filters GPS junk and mislabeled activities).
  Trend = least-squares slope × 7 (s/km per week), needs ≥ 3 points.
  Chip semantics are inverted: slope ≤ −2 s/km/wk → `up` (faster = improving),
  ≥ +2 → `down`, else `flat`.
- **Aerobic efficiency (EF)**: per eligible run with `avg_hr_bpm > 0`:
  `(distance_m / moving_time_s) × 60 / avg_hr_bpm` (meters per beat, 2 decimals).
  Trend = slope as %/week of mean (like strength e1RM); chip ±1%/wk.
- **Intensity mix**: total run minutes per zone band across the range;
  `easyPct` (Z0+Z1+Z2), `modPct` (Z3), `hardPct` (Z4+Z5). Null when no zone data.
  Displayed with the 80% easy guideline as context.
- **VO₂max**: series of non-null `daily_metrics.vo2_max`; latest value and delta
  (latest − first in range, 1 decimal).
- **Summary stats**: this-week km, 4-week km/wk (total km in trailing 28 days ÷ 4),
  4-week avg pace, best pace in range.

## Cross-source dedupe

A run recorded on both WHOOP and Apple Watch appears twice in `activities`
(existing dedupe is only within `apple_health`). The compute layer collapses runs
whose time intervals `[start, start + moving_time_s]` overlap, keeping the WHOOP row
(it carries HR/zones). Same-source overlaps keep the first row. This is display-layer
dedupe only — no DB changes.

## Architecture

Follows the existing trends pattern exactly:

- `lib/trends/running.ts` — pure functions, no I/O: `dedupeRuns`, `computeRunningTrends`,
  `formatPace`. Reuses `dateKey`, `weekStartKey`, `linearSlopePerDay`, `DatedValue`,
  `Chip` from `lib/trends/compute.ts` (exports `dayNumber` from compute for reuse).
- `lib/trends/running.test.ts` — vitest unit tests next to the module.
- `app/[locale]/trends/page.tsx` — new Running section between **Load** and **Fuel**,
  built from existing primitives (`BarChart`, `BigSpark`, `MiniStat`, `ChartTitle`,
  `AxisRow`, `StatChip`). Pace sparkline plots negated values so faster reads as up.
  No new queries — filters the already-fetched `activities` and `daily_metrics`.
- Messages added to `messages/en.json`, `es.json`, `de.json` under `trends`.

Section renders an empty-state note when the range contains no runs (same idiom as
other sections).

## Out of scope (explicitly)

- Best-effort PRs (5k/10k splits) — no split/GPS data from either source.
- Cadence, elevation, per-run HR for Apple runs — Phase 2 (iOS plugin extension).
- Populating `avg_pace_per_km_s` in normalizers.
