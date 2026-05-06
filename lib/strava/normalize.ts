import { ActivityCategory, ActivitySource, HrZones } from '@/types/database'

export type StravaActivity = {
  strava_id: number
  activity_type: string
  activity_name: string
  start_date_utc: string
  start_date_local: string
  timezone: string
  elapsed_time_s: number
  moving_time_s: number
  distance_m: number
  avg_hr_bpm: number | null
  max_hr_bpm: number | null
  hr_zones: { z1_s: number; z2_s: number; z3_s: number; z4_s: number; z5_s: number } | null
  trainer: boolean
  elevation_gain_m: number | null
  avg_cadence_spm: number | null
}

export type NormalizedActivity = {
  user_id: string
  strava_id: number
  activity_category: ActivityCategory
  activity_name: string
  activity_type: string
  avg_cadence_spm: number | null
  avg_hr_bpm: number | null
  avg_pace_per_km_s: number | null
  distance_m: number | null
  elapsed_time_s: number
  elevation_gain_m: number | null
  hr_zones: HrZones | null
  inferred_muscle_groups: string[] | null
  max_hr_bpm: number | null
  moving_time_s: number
  rpe: null
  source: ActivitySource
  start_date_local: string
  start_date_utc: string
  timezone: string
  trainer: boolean
}

const CATEGORY_MAP: Record<string, ActivityCategory> = {
  Run: 'run',
  VirtualRun: 'run',
  TrailRun: 'run',
  Ride: 'ride',
  VirtualRide: 'ride',
  EBikeRide: 'ride',
  WeightTraining: 'strength',
  Crossfit: 'strength',
  Workout: 'hiit',
  HIIT: 'hiit',
  Yoga: 'mobility',
  Pilates: 'mobility',
  Stretching: 'mobility',
  Walk: 'walk',
  Hike: 'walk',
  Swim: 'swim',
}

const MUSCLE_MAP: Record<string, string[]> = {
  run: ['legs', 'cardio'],
  strength: ['full_body'],
  hiit: ['full_body', 'cardio'],
  ride: ['legs', 'cardio'],
  mobility: ['mobility'],
}

export function normalizeActivity(raw: StravaActivity, userId: string): NormalizedActivity {
  const activity_category: ActivityCategory = CATEGORY_MAP[raw.activity_type] ?? 'other'

  const avg_pace_per_km_s =
    activity_category === 'run' && raw.distance_m > 0
      ? Math.round(raw.moving_time_s / (raw.distance_m / 1000))
      : null

  return {
    user_id: userId,
    strava_id: raw.strava_id,
    activity_category,
    activity_name: raw.activity_name,
    activity_type: raw.activity_type,
    avg_cadence_spm: raw.avg_cadence_spm,
    avg_hr_bpm: raw.avg_hr_bpm,
    avg_pace_per_km_s,
    distance_m: raw.distance_m || null,
    elapsed_time_s: raw.elapsed_time_s,
    elevation_gain_m: raw.elevation_gain_m,
    hr_zones: raw.hr_zones,
    inferred_muscle_groups: MUSCLE_MAP[activity_category] ?? null,
    max_hr_bpm: raw.max_hr_bpm,
    moving_time_s: raw.moving_time_s,
    rpe: null,
    source: 'strava',
    start_date_local: raw.start_date_local,
    start_date_utc: raw.start_date_utc,
    timezone: raw.timezone,
    trainer: raw.trainer,
  }
}
