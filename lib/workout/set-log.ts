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
