export type PerformedWorkoutOrigin = 'planned' | 'manual' | 'whoop' | 'apple_health'
export type PerformedWorkoutStatus = 'draft' | 'in_progress' | 'completed'

export interface PerformedWorkoutInput {
  userId: string
  planSessionId?: string | null
  activityId?: string | null
  origin: PerformedWorkoutOrigin
  title: string
  workoutType: string
  performedOn: string
  startedAt: string
  endedAt?: string | null
  durationMin?: number | null
  notes?: string | null
  status?: PerformedWorkoutStatus
}

export interface PerformedWorkoutInsert {
  user_id: string
  plan_session_id: string | null
  activity_id: string | null
  origin: PerformedWorkoutOrigin
  title: string
  workout_type: string
  performed_on: string
  started_at: string
  ended_at: string | null
  duration_min: number | null
  notes: string | null
  status: PerformedWorkoutStatus
}

function isoTimestamp(value: string, field: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field} must be a valid timestamp`)
  return parsed.toISOString()
}

export function buildPerformedWorkoutInsert(input: PerformedWorkoutInput): PerformedWorkoutInsert {
  const title = input.title.trim()
  if (!title) throw new Error('title is required')
  if (input.origin === 'planned' && !input.planSessionId) {
    throw new Error('Planned workouts require planSessionId')
  }
  if (input.durationMin != null && input.durationMin < 0) {
    throw new Error('durationMin must be non-negative')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.performedOn)) {
    throw new Error('performedOn must use YYYY-MM-DD')
  }

  const status = input.status ?? 'in_progress'
  if (status === 'completed' && !input.endedAt) {
    throw new Error('Completed workouts require endedAt')
  }

  return {
    user_id: input.userId,
    plan_session_id: input.planSessionId ?? null,
    activity_id: input.activityId ?? null,
    origin: input.origin,
    title,
    workout_type: input.workoutType,
    performed_on: input.performedOn,
    started_at: isoTimestamp(input.startedAt, 'startedAt'),
    ended_at: input.endedAt ? isoTimestamp(input.endedAt, 'endedAt') : null,
    duration_min: input.durationMin ?? null,
    notes: input.notes?.trim() || null,
    status,
  }
}

export interface PerformedExerciseSnapshotInput {
  catalogExerciseId?: string | null
  exerciseName: string
  primaryMuscleGroup?: string | null
  prescribedSets?: number | null
  prescribedReps?: string | null
  prescribedWeightKg?: number | null
  targetRpe?: string | null
  targetRir?: string | null
  restSeconds?: number | null
  orderIndex: number
  notes?: string | null
}

export function snapshotPerformedExercise(input: PerformedExerciseSnapshotInput) {
  return {
    catalog_exercise_id: input.catalogExerciseId ?? null,
    exercise_name: input.exerciseName.trim(),
    primary_muscle_group: input.primaryMuscleGroup ?? null,
    prescribed_sets: input.prescribedSets ?? null,
    prescribed_reps: input.prescribedReps ?? null,
    prescribed_weight_kg: input.prescribedWeightKg ?? null,
    target_rpe: input.targetRpe ?? null,
    target_rir: input.targetRir ?? null,
    rest_seconds: input.restSeconds ?? null,
    order_index: input.orderIndex,
    notes: input.notes?.trim() || null,
  }
}
