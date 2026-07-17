import type { NewActivity, NewSleepLog, NewDailyMetric, ActivityCategory } from '@/db/schema'
import { formatActivityDisplayName } from '@/lib/activities/display-name'
import type { HKWorkout, HKSleepRecord, HKDailyRecord } from './parser'

const HK_CATEGORY_MAP: Record<string, ActivityCategory> = {
  HKWorkoutActivityTypeCycling: 'ride',
  HKWorkoutActivityTypeWalking: 'walk',
  HKWorkoutActivityTypeHiking: 'walk',
  HKWorkoutActivityTypeFunctionalStrengthTraining: 'strength',
  HKWorkoutActivityTypePilates: 'mobility',
  HKWorkoutActivityTypeYoga: 'mobility',
  HKWorkoutActivityTypeRunning: 'run',
  HKWorkoutActivityTypeSwimming: 'swim',
  HKWorkoutActivityTypeHighIntensityIntervalTraining: 'hiit',
  HKWorkoutActivityTypeCrossTraining: 'hiit',
}

const MUSCLE_MAP: Record<ActivityCategory, string[]> = {
  run: ['legs', 'cardio'],
  ride: ['legs', 'cardio'],
  strength: ['full_body'],
  hiit: ['full_body', 'cardio'],
  mobility: ['mobility'],
  walk: ['legs'],
  swim: ['full_body', 'cardio'],
  other: [],
}

// Apple Health ISO dates include an offset (e.g. "2024-01-15T22:30:00-06:00").
// start_date_utc: the true moment in time (UTC).
// start_date_local: the wall-clock local time stored as a UTC timestamp so callers
//   can display it without a timezone lookup.
function localWallClock(iso: string): Date {
  // Strip the offset and treat the local time as UTC.
  return new Date(iso.replace(/[+-]\d{2}:\d{2}$/, 'Z'))
}

export function normalizeWorkouts(workouts: HKWorkout[], userId: string): NewActivity[] {
  return workouts.map((w) => {
    const category: ActivityCategory = HK_CATEGORY_MAP[w.activityType] ?? 'other'
    const elapsed_time_s = Math.round(w.duration * 60)
    const muscles = MUSCLE_MAP[category]

    return {
      user_id: userId,
      source: 'apple_health',
      activity_type: w.activityType,
      activity_category: category,
      activity_name: formatActivityDisplayName({
        activity_type: w.activityType,
        activity_category: category,
      }),
      start_date_utc: new Date(w.startDate),
      start_date_local: localWallClock(w.startDate),
      elapsed_time_s,
      moving_time_s: elapsed_time_s,
      calories_kcal: w.totalEnergyBurned,
      distance_m: w.totalDistance,
      inferred_muscle_groups: muscles.length > 0 ? muscles : undefined,
      // Fields unavailable from Apple Health passive export
      whoop_activity_id: undefined,
      timezone: undefined,
      elevation_gain_m: undefined,
      avg_hr_bpm: undefined,
      max_hr_bpm: undefined,
      avg_pace_per_km_s: undefined,
      avg_cadence_spm: undefined,
      strain: undefined,
      hr_zones: undefined,
      rpe: undefined,
      trainer: undefined,
    } satisfies NewActivity
  })
}

// Apple Health sleep stages use these value strings.
const SLEEP_REM = 'HKCategoryValueSleepAnalysisAsleepREM'
const SLEEP_DEEP = 'HKCategoryValueSleepAnalysisAsleepDeep'
const SLEEP_CORE = 'HKCategoryValueSleepAnalysisAsleepCore'   // "light" in WHOOP terms
const SLEEP_AWAKE = 'HKCategoryValueSleepAnalysisAwake'

function spanHours(startIso: string, endIso: string): number {
  return (Date.parse(endIso) - Date.parse(startIso)) / 3_600_000
}

export function normalizeSleep(
  records: HKSleepRecord[],
  userId: string,
  dailySummaries?: Map<string, HKDailyRecord>
): NewSleepLog[] {
  // Group records by calendar date derived from startDate.
  const byDate = new Map<string, HKSleepRecord[]>()
  for (const r of records) {
    const dateKey = r.startDate.slice(0, 10)
    const bucket = byDate.get(dateKey)
    if (bucket) {
      bucket.push(r)
    } else {
      byDate.set(dateKey, [r])
    }
  }

  // Accumulate all candidates, then deduplicate keeping the most-hours record per date.
  const candidates: NewSleepLog[] = []

  for (const [dateKey, recs] of byDate) {
    let rem_hours = 0
    let deep_hours = 0
    let light_hours = 0
    let awake_hours = 0

    for (const r of recs) {
      const span = spanHours(r.startDate, r.endDate)
      switch (r.value) {
        case SLEEP_REM:
          rem_hours += span
          break
        case SLEEP_DEEP:
          deep_hours += span
          break
        case SLEEP_CORE:
          light_hours += span
          break
        case SLEEP_AWAKE:
          awake_hours += span
          break
      }
    }

    const hours = rem_hours + deep_hours + light_hours
    const respiratory_rate = dailySummaries?.get(dateKey)?.respiratoryRate

    candidates.push({
      user_id: userId,
      date: dateKey,
      source: 'apple_health',
      hours,
      rem_hours,
      deep_hours,
      light_hours,
      awake_hours,
      respiratory_rate,
      // Fields not available from Apple Health
      quality: undefined,
      notes: undefined,
      whoop_sleep_id: undefined,
      performance_pct: undefined,
      consistency_pct: undefined,
      efficiency_pct: undefined,
      cycle_count: undefined,
      disturbance_count: undefined,
      sleep_needed_baseline_h: undefined,
      sleep_needed_debt_h: undefined,
      sleep_needed_strain_h: undefined,
    } satisfies NewSleepLog)
  }

  // Deduplicate by date — keep the record with the most sleep hours.
  const bestByDate = new Map<string, NewSleepLog>()
  for (const row of candidates) {
    const existing = bestByDate.get(row.date as string)
    if (!existing || (row.hours ?? 0) > (existing.hours ?? 0)) {
      bestByDate.set(row.date as string, row)
    }
  }

  return [...bestByDate.values()]
}

export function normalizeDailyMetrics(
  summaries: Map<string, HKDailyRecord>,
  userId: string
): NewDailyMetric[] {
  const result: NewDailyMetric[] = []

  for (const [, s] of summaries) {
    const total_calories_kcal =
      s.activeEnergyKcal !== undefined || s.basalEnergyKcal !== undefined
        ? (s.activeEnergyKcal ?? 0) + (s.basalEnergyKcal ?? 0)
        : undefined

    result.push({
      user_id: userId,
      date: s.date,
      source: 'apple_health',
      resting_hr_bpm: s.restingHeartRate,
      hrv_ms: s.hrv,
      total_calories_kcal,
      active_min: s.exerciseMinutes !== undefined ? Math.round(s.exerciseMinutes) : undefined,
      steps_count: s.steps !== undefined ? Math.round(s.steps) : undefined,
      vo2_max: s.vo2Max,
      physical_effort: s.physicalEffort,
      // Fields not produced by Apple Health passive export
      whoop_cycle_id: undefined,
      recovery_score: undefined,
      spo2_pct: undefined,
      skin_temp_c: undefined,
      daily_strain: undefined,
      daily_avg_hr: undefined,
      daily_max_hr: undefined,
    } satisfies NewDailyMetric)
  }

  return result
}
