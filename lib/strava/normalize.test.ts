import { describe, it, expect } from 'vitest'
import { normalizeActivity, StravaActivity } from './normalize'

const base: StravaActivity = {
  strava_id: 1001,
  activity_type: 'Run',
  activity_name: 'Morning Run',
  start_date_utc: '2026-05-01T07:00:00Z',
  start_date_local: '2026-05-01T02:00:00Z',
  timezone: 'America/Mexico_City',
  elapsed_time_s: 3600,
  moving_time_s: 3500,
  distance_m: 10000,
  avg_hr_bpm: 155,
  max_hr_bpm: 175,
  hr_zones: { z1_s: 100, z2_s: 200, z3_s: 1800, z4_s: 1200, z5_s: 200 },
  trainer: false,
  elevation_gain_m: 50,
  avg_cadence_spm: 170,
}

describe('normalizeActivity', () => {
  it('Case 1 — Run', () => {
    const result = normalizeActivity(base, 'user-abc')

    expect(result.activity_category).toBe('run')
    expect(result.avg_pace_per_km_s).toBe(Math.round(3500 / 10))
    expect(result.avg_pace_per_km_s).toBe(350)
    expect(result.elevation_gain_m).toBe(50)
    expect(result.inferred_muscle_groups).toEqual(['legs', 'cardio'])
    expect(result.rpe).toBe(null)
    expect(result.source).toBe('strava')

    const keys = Object.keys(result)
    expect(keys[0]).toBe('user_id')
    expect(keys[1]).toBe('strava_id')
  })

  it('Case 2 — WeightTraining', () => {
    const result = normalizeActivity(
      { ...base, activity_type: 'WeightTraining', distance_m: 0 },
      'user-abc',
    )

    expect(result.activity_category).toBe('strength')
    expect(result.avg_pace_per_km_s).toBe(null)
    expect(result.inferred_muscle_groups).toEqual(['full_body'])
  })

  it('Case 3 — Unknown activity type', () => {
    const result = normalizeActivity(
      { ...base, activity_type: 'Skateboarding' },
      'user-abc',
    )

    expect(result.activity_category).toBe('other')
    expect(result.avg_pace_per_km_s).toBe(null)
    expect(result.inferred_muscle_groups).toBe(null)
  })
})
