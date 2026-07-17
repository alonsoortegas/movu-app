import { describe, expect, it } from 'vitest'
import { dedupeAppleHealthActivityRows } from './dedupe'

describe('dedupeAppleHealthActivityRows', () => {
  it('keeps one row per Apple Health natural key before RPC upsert', () => {
    const rows = [
      {
        user_id: 'user-1',
        start_date_utc: '2026-07-17T08:00:00.000Z',
        activity_type: 'HKWorkoutActivityTypeRunning',
        calories_kcal: 300,
      },
      {
        user_id: 'user-1',
        start_date_utc: '2026-07-17T08:00:00.000Z',
        activity_type: 'HKWorkoutActivityTypeRunning',
        calories_kcal: 325,
      },
      {
        user_id: 'user-1',
        start_date_utc: '2026-07-18T08:00:00.000Z',
        activity_type: 'HKWorkoutActivityTypeRunning',
        calories_kcal: 280,
      },
    ]

    expect(dedupeAppleHealthActivityRows(rows)).toEqual([
      {
        user_id: 'user-1',
        start_date_utc: '2026-07-17T08:00:00.000Z',
        activity_type: 'HKWorkoutActivityTypeRunning',
        calories_kcal: 325,
      },
      {
        user_id: 'user-1',
        start_date_utc: '2026-07-18T08:00:00.000Z',
        activity_type: 'HKWorkoutActivityTypeRunning',
        calories_kcal: 280,
      },
    ])
  })
})
