export interface SetLogExerciseInput {
  exercise_id?: string | null
  exercise_name?: unknown
}

export interface OwnedExercise {
  id: string
  exercise_name: string
}

export function resolveSetLogExercise(
  input: SetLogExerciseInput,
  ownedExercise: OwnedExercise | null,
): { exercise_id: string | null; exercise_name: string } | null {
  if (input.exercise_id) {
    if (!ownedExercise || ownedExercise.id !== input.exercise_id) return null
    return { exercise_id: ownedExercise.id, exercise_name: ownedExercise.exercise_name }
  }

  if (typeof input.exercise_name !== 'string' || !input.exercise_name.trim()) return null
  return { exercise_id: null, exercise_name: input.exercise_name.trim() }
}

export interface PerformedSetLogInput {
  performed_workout_id?: string | null
  performed_exercise_id?: string | null
}

export interface OwnedPerformedExercise {
  id: string
  performed_workout_id: string
  exercise_name: string
}

export function resolvePerformedSetLogLink(
  input: PerformedSetLogInput,
  ownedExercise: OwnedPerformedExercise | null,
): {
  performed_workout_id: string
  performed_exercise_id: string
  exercise_name: string
} | null {
  if (!input.performed_workout_id || !input.performed_exercise_id) return null
  if (
    !ownedExercise ||
    ownedExercise.id !== input.performed_exercise_id ||
    ownedExercise.performed_workout_id !== input.performed_workout_id
  ) {
    return null
  }

  return {
    performed_workout_id: ownedExercise.performed_workout_id,
    performed_exercise_id: ownedExercise.id,
    exercise_name: ownedExercise.exercise_name,
  }
}
