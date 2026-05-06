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
  ■ source        [M/W]
  □ className     [M]
  □ studio        [M]
  □ effort        [M]    RPE 1–10
  □ distanceKm    [M/W]  WHOOP: distance_meter / 1000 (runs only)
  □ whoopId       [W]
  □ strain        [W]    0–21
  □ avgHeartRate  [W]
  □ maxHeartRate  [W]
  □ heartRateZones[W]

DayMetrics
  ■ userId              [M/W]  Supabase auth UUID — composite PK with date
  ■ date                [M/W]
  ■ totalCalories       [M/W]  WHOOP: cycle.kilojoule / 4.184
  ■ activeMin           [M/W]  WHOOP: sum of workout durations
  ■ sleepHours          [M/W]  WHOOP: total_in_bed_time_milli
  ■ source              [M/W]
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
  □ weightKg      [W]    WHOOP: /v2/user/measurement/body
  □ maxHeartRate  [W]    WHOOP: /v2/user/measurement/body
```
