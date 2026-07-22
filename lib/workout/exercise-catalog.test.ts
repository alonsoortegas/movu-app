import { describe, expect, it } from 'vitest'
import { buildCustomExerciseInsert, rankExercises, slugifyExerciseName } from './exercise-catalog'

const catalog = [
  {
    id: '1',
    userId: null,
    name: 'Wall balls',
    primaryMuscleGroup: 'legs',
    secondaryMuscleGroups: ['shoulders'],
    workoutTypes: ['functional-fitness'],
  },
  {
    id: '2',
    userId: null,
    name: 'Leg press',
    primaryMuscleGroup: 'legs',
    secondaryMuscleGroups: ['glutes'],
    workoutTypes: ['strength'],
  },
  {
    id: '3',
    userId: 'member-1',
    name: 'Wall ball pesado',
    primaryMuscleGroup: 'shoulders',
    secondaryMuscleGroups: ['legs'],
    workoutTypes: ['functional-fitness'],
  },
]

describe('rankExercises', () => {
  it('ranks an exact accent-insensitive text match first', () => {
    const result = rankExercises(catalog, { query: 'wall balls' })
    expect(result.map((exercise) => exercise.id)).toEqual(['1'])
  })

  it('ranks the selected workout type before unrelated exercises', () => {
    const result = rankExercises(catalog, { query: '', workoutType: 'functional-fitness' })
    expect(result.slice(0, 2).map((exercise) => exercise.id)).toEqual(['1', '3'])
  })

  it('ranks a primary muscle match above a secondary muscle match', () => {
    const result = rankExercises(catalog, { query: '', muscleGroup: 'shoulders' })
    expect(result[0].id).toBe('3')
    expect(result[1].id).toBe('1')
  })

  it('keeps custom exercises searchable', () => {
    const result = rankExercises(catalog, { query: 'pesado' })
    expect(result.map((exercise) => exercise.id)).toEqual(['3'])
  })
})

describe('slugifyExerciseName', () => {
  it('creates a stable accent-free slug', () => {
    expect(slugifyExerciseName('  Press de Pecho — Máquina  ')).toBe('press-de-pecho-maquina')
  })
})

describe('buildCustomExerciseInsert', () => {
  it('normalizes a member-owned custom exercise', () => {
    expect(
      buildCustomExerciseInsert('member-1', {
        name: '  Press Arnold ',
        primaryMuscleGroup: 'shoulders',
        workoutTypes: ['strength'],
      }),
    ).toEqual({
      user_id: 'member-1',
      slug: 'press-arnold',
      name_es: 'Press Arnold',
      name_en: 'Press Arnold',
      name_de: 'Press Arnold',
      primary_muscle_group: 'shoulders',
      secondary_muscle_groups: [],
      workout_types: ['strength'],
      default_tracking: 'reps',
    })
  })

  it('rejects an empty custom exercise name', () => {
    expect(() => buildCustomExerciseInsert('member-1', { name: '   ' })).toThrow(
      'Exercise name is required',
    )
  })
})
