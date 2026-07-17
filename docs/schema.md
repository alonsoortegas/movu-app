# Movu — Schema Documentation

## Entity Relationship Overview

```
┌──────────────────┐
│   UserProfile    │
│──────────────────│
│ id  (PK)         │
│ name             │
│ goal             │
│ weeklyGoal       │
│ muscleMassKg     │
│ bodyFatPct       │
│ heightM          │
│ weightKg         │
│ maxHeartRate     │
└────────┬─────────┘
         │ 1
         │
    ─────┴─────────────────────────────────────────
    │                                              │
    │ *                                            │ *
┌───┴──────────────────────┐      ┌───────────────┴──────────────┐
│         Workout          │      │          DayMetrics          │
│──────────────────────────│      │──────────────────────────────│
│ id         (PK)          │      │ userId  (PK, FK)             │
│ userId     (FK)          │      │ date    (PK)                 │
│ date                     │      │ totalCalories                │
│ type                     │      │ activeMin                    │
│ durationMin              │      │ sleepHours                   │
│ calories                 │      │ sleepPerformancePct          │
│ source                   │      │ sleepConsistencyPct          │
│ className                │      │ sleepEfficiencyPct           │
│ studio                   │      │ respiratoryRate              │
│ effort                   │      │ recoveryScore                │
│ distanceKm               │      │ hrv                          │
│ whoopId                  │      │ restingHeartRate             │
│ strain                   │      │ spo2Pct                      │
│ avgHeartRate             │      │ skinTempCelsius              │
│ maxHeartRate             │      │ dailyStrain                  │
│ heartRateZones ──────────┼──┐   │ dailyAvgHeartRate            │
│ source                   │  │   │ dailyMaxHeartRate            │
└──────────────────────────┘  │   │ sleepStages ─────────────────┼──┐
                               │   │ sleepNeeded ─────────────────┼──┼──┐
                               │   │ source                       │  │  │
                               │   └──────────────────────────────┘  │  │
                               │                                      │  │
                        ┌──────┴──────────┐    ┌─────────────────────┘  │
                        │ HeartRateZones  │    │  SleepStages           │
                        │─────────────────│    │────────────────────    │
                        │ zone0Min        │    │ remHours               │
                        │ zone1Min        │    │ deepHours              │
                        │ zone2Min        │    │ lightHours             │
                        │ zone3Min        │    │ awakeHours             │
                        │ zone4Min        │    │ cycleCount             │
                        │ zone5Min        │    │ disturbanceCount       │
                        └─────────────────┘    └────────────────────────┘
                                                                         │
                                                              ┌──────────┘
                                                              │  SleepNeeded
                                                              │────────────────
                                                              │ baselineHours
                                                              │ debtHours
                                                              │ strainDebtHours
                                                              └────────────────
```

---

## Class Diagrams

### UserProfile

```
┌─────────────────────────────────────────────┐
│                 UserProfile                 │
├─────────────────────────────────────────────┤
│ id             : string  (Supabase UUID)    │  ← PK
│ name           : string                     │
│ goal           : string                     │
│ weeklyGoal     : number                     │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│  ── InBody (manual input) ──                │
│ muscleMassKg   : number?                    │
│ bodyFatPct     : number?                    │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│  ── WHOOP /v2/user/measurement/body ──      │
│ heightM        : number?                    │
│ weightKg       : number?                    │
│ maxHeartRate   : number?                    │
└─────────────────────────────────────────────┘
```

---

### Workout

```
┌─────────────────────────────────────────────┐
│                   Workout                   │
├─────────────────────────────────────────────┤
│ id             : string                     │  ← PK
│ userId         : string                     │  ← FK → UserProfile.id
│ date           : string  (ISO 8601)         │
│ type           : WorkoutType                │
│ durationMin    : number                     │
│ calories       : number                     │
│ source         : "manual" | "whoop"         │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│  ── Manual only ──                          │
│ className      : string?                    │
│ studio         : string?                    │
│ effort         : number?  (RPE 1–10)        │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│  ── Both / WHOOP ──                         │
│ distanceKm     : number?                    │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│  ── WHOOP only ──                           │
│ whoopId        : string?                    │
│ strain         : number?  (0–21)            │
│ avgHeartRate   : number?                    │
│ maxHeartRate   : number?                    │
│ heartRateZones : HeartRateZones?            │──────┐
└─────────────────────────────────────────────┘      │
                                                      │ composition
                                             ┌────────┴────────────┐
                                             │    HeartRateZones   │
                                             ├─────────────────────┤
                                             │ zone0Min : number   │ rest / very light
                                             │ zone1Min : number   │ warm-up
                                             │ zone2Min : number   │ easy aerobic
                                             │ zone3Min : number   │ aerobic
                                             │ zone4Min : number   │ threshold
                                             │ zone5Min : number   │ max effort
                                             └─────────────────────┘
```

---

### WorkoutType enum

```
┌──────────────────────────────────────────────────────────┐
│                       WorkoutType                        │
├──────────────────────────────────────────────────────────┤
│  "weightlifting"    │  "cardio"         │  "running"     │
│  "combined"         │  "bootcamp"       │  "workshop"    │
│  "yoga"             │  "cycling"        │  "hiit"        │
│  "functional-fitness"                   │  "rest"        │
│  "other"                                                  │
└──────────────────────────────────────────────────────────┘

WHOOP sport_name → WorkoutType mapping (WHOOP_SPORT_MAP)
┌──────────────────────┬──────────────────────┐
│ WHOOP sport_name     │ WorkoutType          │
├──────────────────────┼──────────────────────┤
│ weightlifting        │ weightlifting        │
│ functional-fitness   │ functional-fitness   │
│ barrys               │ combined             │
│ cycling              │ cardio               │
│ hiit                 │ hiit                 │
│ yoga                 │ yoga                 │
│ running              │ running              │
│ walking              │ other                │
│ commuting            │ other                │
└──────────────────────┴──────────────────────┘
```

---

### DayMetrics

```
┌─────────────────────────────────────────────┐
│                  DayMetrics                 │
├─────────────────────────────────────────────┤
│ userId         : string                     │  ← FK → UserProfile.id
│ date           : string  (ISO 8601)         │  ← composite PK with userId
│ totalCalories  : number  (TDEE)             │
│ activeMin      : number                     │
│ source         : "manual" | "whoop"         │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│  ── Sleep ──                                │
│ sleepHours           : number               │
│ sleepPerformancePct  : number?  (0–100)     │
│ sleepConsistencyPct  : number?  (0–100)     │
│ sleepEfficiencyPct   : number?  (0–100)     │
│ respiratoryRate      : number?  (brpm)      │
│ sleepStages          : SleepStages?         │──────┐
│ sleepNeeded          : SleepNeeded?         │────┐ │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤    │ │
│  ── Recovery (WHOOP) ──                     │    │ │
│ recoveryScore        : number?  (0–100)     │    │ │
│ hrv                  : number?  (ms RMSSD)  │    │ │
│ restingHeartRate     : number?  (bpm)       │    │ │
│ spo2Pct              : number?  (%)         │    │ │
│ skinTempCelsius      : number?              │    │ │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤    │ │
│  ── Strain & HR (WHOOP) ──                  │    │ │
│ dailyStrain          : number?  (0–21)      │    │ │
│ dailyAvgHeartRate    : number?  (bpm)       │    │ │
│ dailyMaxHeartRate    : number?  (bpm)       │    │ │
└─────────────────────────────────────────────┘    │ │
                                                    │ │
                                        ┌───────────┘ │
                                        │             │
                               ┌────────┴──────┐      │
                               │  SleepNeeded  │      │
                               ├───────────────┤      │
                               │ baselineHours │      │
                               │ debtHours     │      │
                               │ strainDebt    │      │
                               │ Hours         │      │
                               └───────────────┘      │
                                                       │
                                            ┌──────────┴────┐
                                            │  SleepStages  │
                                            ├───────────────┤
                                            │ remHours      │
                                            │ deepHours     │
                                            │ lightHours    │
                                            │ awakeHours    │
                                            │ cycleCount    │
                                            │ disturbance   │
                                            │ Count         │
                                            └───────────────┘
```

---

### Plan types

```
┌─────────────────────────────┐    ┌─────────────────────────────┐
│           WeekDay           │    │           PlanRow           │
├─────────────────────────────┤    ├─────────────────────────────┤
│ label    : string           │    │ day        : string         │
│ short    : string           │    │ muscle     : string         │
│ type     : WorkoutType|"—"  │    │ type       : WorkoutType|"—"│
│ isToday  : boolean?         │    │ durationMin: number         │
└─────────────────────────────┘    └─────────────────────────────┘
```

---

## Data source legend

```
  ■  Required field
  □  Optional field

  [M]   Manual input only — never populated from WHOOP
  [W]   WHOOP only — populated automatically via sync
  [AH]  Apple Health / HealthKit — populated by XML import or native iOS sync
  [M/W] Either source — field present regardless of origin
        source field indicates which
```

## Field source map

```
Workout
  ■ id            [M/W]
  ■ userId        [M/W]  Supabase auth UUID — always required
  ■ date          [M/W]
  ■ type          [M/W]  via WHOOP_SPORT_MAP when source=whoop
  ■ durationMin   [M/W]  WHOOP: end - start
  ■ calories      [M/W]  WHOOP: kilojoule / 4.184
  ■ source        [M/W/AH]
  □ className     [M]
  □ studio        [M]
  □ effort        [M]    RPE 1–10
  □ distanceKm    [M/W/AH]  WHOOP: distance_meter / 1000 (runs only); Apple Health: metres from workout statistics
  □ whoopId       [W]
  □ strain        [W]    0–21
  □ avgHeartRate  [W]
  □ maxHeartRate  [W]
  □ heartRateZones[W]
  □ appleHealthNaturalKey [AH] userId + startDateUtc + activityType, unique only where source=apple_health

DayMetrics
  ■ userId              [M/W]  Supabase auth UUID — composite PK with date
  ■ date                [M/W]
  ■ totalCalories       [M/W]  WHOOP: cycle.kilojoule / 4.184
  ■ activeMin           [M/W]  WHOOP: sum of workout durations
  ■ sleepHours          [M/W]  WHOOP: total_in_bed_time_milli
  ■ source              [M/W/AH]
  □ stepsCount          [M/AH] Manual daily log or HealthKit stepCount
  □ sleepPerformancePct [W]
  □ sleepConsistencyPct [W]
  □ sleepEfficiencyPct  [W]
  □ respiratoryRate     [W]
  □ sleepStages         [W]
  □ sleepNeeded         [W]
  □ recoveryScore       [W]
  □ hrv                 [W]
  □ restingHeartRate    [W]
  □ spo2Pct             [W]
  □ skinTempCelsius     [W]
  □ dailyStrain         [W]
  □ dailyAvgHeartRate   [W]
  □ dailyMaxHeartRate   [W]

UserProfile
  ■ id            [M]    Supabase auth UUID — PK, set on signup
  ■ name          [M]
  ■ goal          [M]
  ■ weeklyGoal    [M]
  □ muscleMassKg  [M]    InBody
  □ bodyFatPct    [M]    InBody — not available via WHOOP API
  □ heightM       [W]    WHOOP: /v2/user/measurement/body
  □ weightKg      [W/AH] WHOOP: /v2/user/measurement/body; HealthKit: newest bodyMass sample
  □ maxHeartRate  [W]    WHOOP: /v2/user/measurement/body
  □ dataSource    [M/W/AH] Active preferred data source; HealthKit sync only sets this from null/manual
  □ healthkitLastSyncAt [AH] Server-side incremental sync anchor
```

---

## Productized workout, nutrition, and training-phase tables

Migration: `supabase/migrations/20260717130000_lifeos_port.sql`.

All top-level rows are scoped to `user_profiles.id`, cascade when the user is
deleted, and are protected by owner-only RLS. Join rows inherit ownership through
their parent group or meal log.

### Workout planning and logging

| Table | Purpose | Key relationships |
|---|---|---|
| `workout_plans` | User-authored multi-week plans and active-plan state | `user_id → user_profiles.id` |
| `workout_plan_sessions` | Day/session definitions for each plan week | `plan_id → workout_plans.id` |
| `workout_plan_exercises` | Ordered prescriptions, RPE, rest, supersets, and isometrics | `session_id → workout_plan_sessions.id` |
| `workout_set_logs` | Historical kg/reps/RPE entries used by progression and strength trends | Optional `exercise_id → workout_plan_exercises.id` |

Weights are stored in kilograms. Exercise names are denormalized into set logs so
history survives plan edits or deletion.

### Nutrition

| Table | Purpose | Key relationships |
|---|---|---|
| `food_items` | Per-user food and macro catalog | `user_id → user_profiles.id` |
| `saved_food_portions` | Reusable ad-hoc portions normalized by name | `user_id → user_profiles.id` |
| `food_substitution_groups` | Protein or carbohydrate equivalence groups | `user_id → user_profiles.id` |
| `food_substitution_group_items` | Portion-sized foods offered as logging swaps | Parent group and `food_item_id → food_items.id` |
| `nutrition_targets` | Hard, moderate, and rest-day macro targets | Unique `(user_id, day_type)` |
| `nutrition_days` | Day-type selection for a calendar date | Unique `(user_id, date)` |
| `meal_logs` | Meal container by date and meal slot | `user_id → user_profiles.id` |
| `meal_log_items` | Denormalized macros captured at log time | `meal_log_id → meal_logs.id`; optional food item |

Targets are resolved at read time from `nutrition_days.day_type`; historical meal
macros are never recalculated after catalog edits.

### Trends

| Table | Purpose | Key relationships |
|---|---|---|
| `training_phases` | Bulk, cut, and maintenance periods with target weekly rate | `user_id → user_profiles.id` |

The trends page combines these rows with existing `body_measurements`,
`daily_metrics`, `sleep_logs`, and `activities`. Calendar bucketing uses
`America/Mexico_City`.
