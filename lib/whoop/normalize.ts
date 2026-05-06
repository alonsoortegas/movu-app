import type { NewActivity, NewSleepLog, NewDailyMetric, ActivityCategory } from '@/db/schema'

// Raw WHOOP API types (v2)
export type WhoopWorkout = {
  id: string
  user_id: number
  start: string
  end: string
  timezone_offset: string
  sport_name: string
  score_state: string
  score: {
    strain: number
    average_heart_rate: number
    max_heart_rate: number
    kilojoule: number
    percent_recorded: number
    distance_meter: number | null
    zone_durations: {
      zone_zero_milli: number
      zone_one_milli: number
      zone_two_milli: number
      zone_three_milli: number
      zone_four_milli: number
      zone_five_milli: number
    }
  } | null
}

export type WhoopSleep = {
  id: string
  cycle_id: number
  user_id: number
  start: string
  end: string
  nap: boolean
  score_state: string
  score: {
    stage_summary: {
      total_in_bed_time_milli: number
      total_awake_time_milli: number
      total_light_sleep_time_milli: number
      total_slow_wave_sleep_time_milli: number
      total_rem_sleep_time_milli: number
      sleep_cycle_count: number
      disturbance_count: number
    }
    sleep_needed: {
      baseline_milli: number
      need_from_sleep_debt_milli: number
      need_from_recent_strain_milli: number
    }
    respiratory_rate: number
    sleep_performance_percentage: number
    sleep_consistency_percentage: number
    sleep_efficiency_percentage: number
  } | null
}

export type WhoopCycle = {
  id: number
  user_id: number
  start: string
  end: string | null
  score_state: string
  score: {
    strain: number
    kilojoule: number
    average_heart_rate: number
    max_heart_rate: number
  } | null
}

const SPORT_CATEGORY_MAP: Record<string, ActivityCategory> = {
  'weightlifting': 'strength',
  'functional-fitness': 'strength',
  'barrys': 'hiit',
  'cycling': 'ride',
  'hiit': 'hiit',
  'yoga': 'mobility',
  'running': 'run',
  'walking': 'walk',
  'commuting': 'walk',
  'swimming': 'swim',
}

const MUSCLE_MAP: Record<string, string[]> = {
  run: ['legs', 'cardio'],
  strength: ['full_body'],
  hiit: ['full_body', 'cardio'],
  ride: ['legs', 'cardio'],
  mobility: ['mobility'],
  walk: ['legs'],
  swim: ['full_body', 'cardio'],
}

function utcDate(isoString: string): string {
  return isoString.slice(0, 10)
}

function localIso(utcIso: string, offset: string): string {
  // offset is like "+02:00" or "-05:00"
  const sign = offset[0] === '-' ? -1 : 1
  const [hh, mm] = offset.slice(1).split(':').map(Number)
  const offsetMs = sign * (hh * 60 + mm) * 60_000
  const local = new Date(Date.parse(utcIso) + offsetMs)
  return local.toISOString().replace('Z', '')
}

export function normalizeWhoopWorkout(raw: WhoopWorkout, userId: string): NewActivity | null {
  if (!raw.score || raw.score_state !== 'SCORED') return null

  const category: ActivityCategory = SPORT_CATEGORY_MAP[raw.sport_name] ?? 'other'
  const elapsedMs = Date.parse(raw.end) - Date.parse(raw.start)
  const elapsed_time_s = Math.round(elapsedMs / 1000)
  const { zone_durations: z } = raw.score

  return {
    user_id: userId,
    whoop_activity_id: raw.id,
    source: 'whoop',
    activity_type: raw.sport_name,
    activity_category: category,
    activity_name: raw.sport_name,
    start_date_utc: new Date(raw.start),
    start_date_local: new Date(localIso(raw.start, raw.timezone_offset)),
    timezone: raw.timezone_offset,
    elapsed_time_s,
    moving_time_s: elapsed_time_s,
    distance_m: raw.score.distance_meter ?? null,
    avg_hr_bpm: raw.score.average_heart_rate,
    max_hr_bpm: raw.score.max_heart_rate,
    strain: raw.score.strain,
    calories_kcal: raw.score.kilojoule / 4.184,
    hr_zones: {
      z0_min: z.zone_zero_milli / 60_000,
      z1_min: z.zone_one_milli / 60_000,
      z2_min: z.zone_two_milli / 60_000,
      z3_min: z.zone_three_milli / 60_000,
      z4_min: z.zone_four_milli / 60_000,
      z5_min: z.zone_five_milli / 60_000,
    },
    inferred_muscle_groups: MUSCLE_MAP[category] ?? null,
    elevation_gain_m: null,
    avg_pace_per_km_s: null,
    avg_cadence_spm: null,
    rpe: null,
    trainer: false,
  }
}

export function normalizeWhoopSleep(raw: WhoopSleep, userId: string): NewSleepLog | null {
  if (!raw.score || raw.score_state !== 'SCORED' || raw.nap) return null

  const s = raw.score
  const ss = s.stage_summary
  const sn = s.sleep_needed

  return {
    user_id: userId,
    date: utcDate(raw.start),
    source: 'whoop',
    whoop_sleep_id: raw.id,
    hours: ss.total_in_bed_time_milli / 3_600_000,
    quality: null,
    notes: null,
    performance_pct: s.sleep_performance_percentage,
    consistency_pct: s.sleep_consistency_percentage,
    efficiency_pct: s.sleep_efficiency_percentage,
    respiratory_rate: s.respiratory_rate,
    rem_hours: ss.total_rem_sleep_time_milli / 3_600_000,
    deep_hours: ss.total_slow_wave_sleep_time_milli / 3_600_000,
    light_hours: ss.total_light_sleep_time_milli / 3_600_000,
    awake_hours: ss.total_awake_time_milli / 3_600_000,
    cycle_count: ss.sleep_cycle_count,
    disturbance_count: ss.disturbance_count,
    sleep_needed_baseline_h: sn.baseline_milli / 3_600_000,
    sleep_needed_debt_h: sn.need_from_sleep_debt_milli / 3_600_000,
    sleep_needed_strain_h: sn.need_from_recent_strain_milli / 3_600_000,
  }
}

export function normalizeWhoopCycle(raw: WhoopCycle, userId: string): NewDailyMetric | null {
  if (!raw.score || raw.score_state !== 'SCORED') return null

  return {
    user_id: userId,
    date: utcDate(raw.start),
    source: 'whoop',
    whoop_cycle_id: raw.id,
    daily_strain: raw.score.strain,
    total_calories_kcal: raw.score.kilojoule / 4.184,
    daily_avg_hr: raw.score.average_heart_rate,
    daily_max_hr: raw.score.max_heart_rate,
    recovery_score: null,
    hrv_ms: null,
    resting_hr_bpm: null,
    spo2_pct: null,
    skin_temp_c: null,
    active_min: null,
  }
}
