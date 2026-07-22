import { describe, expect, it } from 'vitest'
import {
  buildPerformedWorkoutInsert,
  snapshotPerformedExercise,
} from './performed-session'

const userId = '11111111-1111-4111-8111-111111111111'
const planSessionId = '22222222-2222-4222-8222-222222222222'

describe('buildPerformedWorkoutInsert', () => {
  it('builds a planned workout linked to its plan session', () => {
    expect(
      buildPerformedWorkoutInsert({
        userId,
        origin: 'planned',
        planSessionId,
        title: ' Lower strength ',
        workoutType: 'strength',
        performedOn: '2026-07-22',
        startedAt: '2026-07-22T08:00:00-06:00',
      }),
    ).toMatchObject({
      user_id: userId,
      origin: 'planned',
      plan_session_id: planSessionId,
      title: 'Lower strength',
      workout_type: 'strength',
      performed_on: '2026-07-22',
      started_at: '2026-07-22T14:00:00.000Z',
      status: 'in_progress',
    })
  })

  it('allows a manual draft without wearable or plan data', () => {
    expect(
      buildPerformedWorkoutInsert({
        userId,
        origin: 'manual',
        title: 'Hyrox class',
        workoutType: 'functional-fitness',
        performedOn: '2026-07-22',
        startedAt: '2026-07-22T18:00:00Z',
        status: 'draft',
      }),
    ).toEqual({
      user_id: userId,
      plan_session_id: null,
      activity_id: null,
      origin: 'manual',
      title: 'Hyrox class',
      workout_type: 'functional-fitness',
      performed_on: '2026-07-22',
      started_at: '2026-07-22T18:00:00.000Z',
      ended_at: null,
      duration_min: null,
      notes: null,
      status: 'draft',
    })
  })

  it('requires an end timestamp for a completed workout', () => {
    expect(() =>
      buildPerformedWorkoutInsert({
        userId,
        origin: 'manual',
        title: 'Run',
        workoutType: 'running',
        performedOn: '2026-07-22',
        startedAt: '2026-07-22T18:00:00Z',
        status: 'completed',
      }),
    ).toThrow('Completed workouts require endedAt')
  })

  it('rejects negative duration', () => {
    expect(() =>
      buildPerformedWorkoutInsert({
        userId,
        origin: 'manual',
        title: 'Run',
        workoutType: 'running',
        performedOn: '2026-07-22',
        startedAt: '2026-07-22T18:00:00Z',
        durationMin: -1,
      }),
    ).toThrow('durationMin must be non-negative')
  })

  it('requires planned origin to include a plan session', () => {
    expect(() =>
      buildPerformedWorkoutInsert({
        userId,
        origin: 'planned',
        title: 'Plan day',
        workoutType: 'strength',
        performedOn: '2026-07-22',
        startedAt: '2026-07-22T18:00:00Z',
      }),
    ).toThrow('Planned workouts require planSessionId')
  })
})

describe('snapshotPerformedExercise', () => {
  it('keeps an immutable name and muscle snapshot from the catalog row', () => {
    const snapshot = snapshotPerformedExercise({
      catalogExerciseId: '33333333-3333-4333-8333-333333333333',
      exerciseName: 'Wall balls',
      primaryMuscleGroup: 'legs',
      prescribedSets: 4,
      prescribedReps: '20',
      orderIndex: 2,
    })

    expect(snapshot.exercise_name).toBe('Wall balls')
    expect(snapshot.primary_muscle_group).toBe('legs')
    expect(snapshot.catalog_exercise_id).toBe('33333333-3333-4333-8333-333333333333')
  })
})
