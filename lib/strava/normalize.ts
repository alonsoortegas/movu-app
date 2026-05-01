export type StravaActivity = {
  strava_id: number
  source: string
  activity_type: string
  activity_name: string
  start_date_utc: string
  start_date_local: string
  elapsed_time_s: number
  moving_time_s: number
  distance_m: number
  avg_hr_bpm: number | null
  max_hr_bpm: number | null
  hr_zones: { z1_s: number; z2_s: number; z3_s: number; z4_s: number; z5_s: number } | null
  trainer: boolean
  elevation_gain_m?: number | null
  avg_cadence_spm?: number | null
}

const CATEGORY_MAP: Record<string, string> = {
  Run: 'run',
  VirtualRun: 'run',
  TrailRun: 'run',
  WeightTraining: 'strength',
  Crossfit: 'strength',
  Workout: 'hiit',
  HIIT: 'hiit',
  Yoga: 'mobility',
  Stretching: 'mobility',
  Pilates: 'mobility',
}

const MUSCLE_MAP: Record<string, string[]> = {
  run: ['legs', 'core'],
  strength: ['full_body'],
  hiit: ['full_body', 'core'],
  mobility: ['full_body'],
  other: [],
}

export function normalizeActivity(raw: StravaActivity, userId: string) {
  const category = (CATEGORY_MAP[raw.activity_type] ?? 'other') as import('@/types/database').ActivityCategory

  const avgPacePerKmS =
    raw.distance_m > 0 && category === 'run'
      ? Math.round((raw.moving_time_s / raw.distance_m) * 1000)
      : null

  return {
    user_id: userId,
    strava_id: raw.strava_id,
    source: 'strava',
    activity_type: raw.activity_type,
    activity_category: category,
    activity_name: raw.activity_name,
    start_date_utc: raw.start_date_utc,
    start_date_local: raw.start_date_local,
    moving_time_s: raw.moving_time_s,
    elapsed_time_s: raw.elapsed_time_s,
    distance_m: raw.distance_m || null,
    elevation_gain_m: raw.elevation_gain_m ?? null,
    avg_hr_bpm: raw.avg_hr_bpm ?? null,
    max_hr_bpm: raw.max_hr_bpm ?? null,
    avg_pace_per_km_s: avgPacePerKmS,
    avg_cadence_spm: raw.avg_cadence_spm ?? null,
    rpe: null,
    inferred_muscle_groups: MUSCLE_MAP[category] ?? [],
    hr_zones: raw.hr_zones ?? null,
    trainer: raw.trainer ?? false,
  }
}
