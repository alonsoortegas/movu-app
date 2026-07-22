import { describe, expect, it } from 'vitest'
import { mergeRecentWorkouts } from './recent-workouts'

describe('mergeRecentWorkouts', () => {
  it('merges sources newest-first and removes activities linked to canonical workouts', () => {
    expect(mergeRecentWorkouts(
      [{ id: 'p1', activityId: 'a1', title: 'Strength', date: '2026-07-22T10:00:00Z', status: 'completed' }],
      [
        { id: 'a1', title: 'Duplicate activity', date: '2026-07-22T10:00:00Z' },
        { id: 'a2', title: 'Run', date: '2026-07-21T08:00:00Z' },
      ],
    )).toEqual([
      { id: 'performed:p1', title: 'Strength', date: '2026-07-22T10:00:00Z', status: 'completed', source: 'performed' },
      { id: 'activity:a2', title: 'Run', date: '2026-07-21T08:00:00Z', status: 'logged', source: 'activity' },
    ])
  })

  it('allows a newer legacy activity to sort above an older canonical workout', () => {
    const result = mergeRecentWorkouts(
      [{ id: 'p1', activityId: null, title: 'Old strength', date: '2026-07-19', status: 'completed' }],
      [{ id: 'a1', title: 'New run', date: '2026-07-20T09:00:00Z' }],
    )
    expect(result.map((row) => row.id)).toEqual(['activity:a1', 'performed:p1'])
  })

  it('fills from legacy activities but never returns more than five rows by default', () => {
    const activities = Array.from({ length: 8 }, (_, index) => ({
      id: `a${index}`,
      title: `Activity ${index}`,
      date: `2026-07-${String(20 - index).padStart(2, '0')}T08:00:00Z`,
    }))
    expect(mergeRecentWorkouts([], activities)).toHaveLength(5)
    expect(mergeRecentWorkouts([], activities).map((row) => row.id)).toEqual([
      'activity:a0', 'activity:a1', 'activity:a2', 'activity:a3', 'activity:a4',
    ])
  })

  it('honors a custom limit and returns empty results for empty inputs', () => {
    expect(mergeRecentWorkouts([], [])).toEqual([])
    expect(mergeRecentWorkouts([], [
      { id: 'a1', title: 'One', date: '2026-07-20' },
      { id: 'a2', title: 'Two', date: '2026-07-19' },
    ], 1)).toHaveLength(1)
  })
})
