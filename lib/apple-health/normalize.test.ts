import { describe, expect, it } from 'vitest'
import { normalizeDailyMetrics, normalizeWorkouts } from './normalize'
import type { HKDailyRecord, HKWorkout } from './parser'

describe('normalizeWorkouts', () => {
  it('stores a friendly activity_name while preserving the raw HealthKit type', () => {
    const workouts: HKWorkout[] = [
      {
        activityType: 'HKWorkoutActivityTypeHighIntensityIntervalTraining',
        startDate: '2026-07-17T08:00:00-06:00',
        endDate: '2026-07-17T08:45:00-06:00',
        duration: 45,
        sourceName: 'Apple Watch',
      },
    ]

    const [row] = normalizeWorkouts(workouts, 'user-1')

    expect(row).toMatchObject({
      user_id: 'user-1',
      source: 'apple_health',
      activity_type: 'HKWorkoutActivityTypeHighIntensityIntervalTraining',
      activity_category: 'hiit',
      activity_name: 'HIIT',
    })
  })
})

describe('normalizeDailyMetrics', () => {
  it('rounds HealthKit step count into daily_metrics.steps_count', () => {
    const summaries = new Map<string, HKDailyRecord>([
      [
        '2026-07-01',
        {
          date: '2026-07-01',
          activeEnergyKcal: 500,
          basalEnergyKcal: 1600,
          steps: 10432.6,
        },
      ],
    ])

    const [row] = normalizeDailyMetrics(summaries, 'user-1')

    expect(row).toMatchObject({
      user_id: 'user-1',
      date: '2026-07-01',
      source: 'apple_health',
      steps_count: 10433,
      total_calories_kcal: 2100,
    })
  })
})
