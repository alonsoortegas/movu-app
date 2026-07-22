export interface RankedExercise {
  id: string
  userId: string | null
  name: string
  primaryMuscleGroup: string | null
  secondaryMuscleGroups: string[]
  workoutTypes: string[]
}

export interface ExerciseRankFilters {
  query?: string
  workoutType?: string
  muscleGroup?: string
  limit?: number
}

export interface CustomExerciseInput {
  name: unknown
  primaryMuscleGroup?: unknown
  secondaryMuscleGroups?: unknown
  workoutTypes?: unknown
  defaultTracking?: unknown
}

export function normalizeExerciseText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function slugifyExerciseName(value: string): string {
  return normalizeExerciseText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildCustomExerciseInsert(userId: string, input: CustomExerciseInput) {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) throw new Error('Exercise name is required')

  const defaultTracking =
    input.defaultTracking === 'time' || input.defaultTracking === 'distance'
      ? input.defaultTracking
      : 'reps'

  return {
    user_id: userId,
    slug: slugifyExerciseName(name),
    name_es: name,
    name_en: name,
    name_de: name,
    primary_muscle_group:
      typeof input.primaryMuscleGroup === 'string' && input.primaryMuscleGroup.trim()
        ? input.primaryMuscleGroup.trim()
        : null,
    secondary_muscle_groups: Array.isArray(input.secondaryMuscleGroups)
      ? input.secondaryMuscleGroups.filter((value): value is string => typeof value === 'string')
      : [],
    workout_types: Array.isArray(input.workoutTypes)
      ? input.workoutTypes.filter((value): value is string => typeof value === 'string')
      : [],
    default_tracking: defaultTracking,
  }
}

export function rankExercises<T extends RankedExercise>(
  catalog: T[],
  filters: ExerciseRankFilters,
): T[] {
  const query = normalizeExerciseText(filters.query ?? '')
  const workoutType = filters.workoutType?.trim() || null
  const muscleGroup = filters.muscleGroup?.trim() || null

  return catalog
    .map((exercise, index) => {
      const name = normalizeExerciseText(exercise.name)
      if (query && !name.includes(query)) return null

      let score = 0
      if (query) {
        if (name === query) score += 1000
        else if (name.startsWith(query)) score += 700
        else score += 500
      }
      if (workoutType && exercise.workoutTypes.includes(workoutType)) score += 200
      if (muscleGroup && exercise.primaryMuscleGroup === muscleGroup) score += 100
      else if (muscleGroup && exercise.secondaryMuscleGroups.includes(muscleGroup)) score += 50

      return { exercise, score, index }
    })
    .filter((item): item is { exercise: T; score: number; index: number } => item != null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, filters.limit ?? 20)
    .map(({ exercise }) => exercise)
}
