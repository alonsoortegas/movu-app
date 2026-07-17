import { describe, expect, it } from 'vitest'
import { resolveSetLogExercise } from './set-log'

describe('resolveSetLogExercise', () => {
  it('uses the canonical name of an owned plan exercise', () => {
    expect(resolveSetLogExercise({ exercise_id: 'ex-1', exercise_name: 'Spoofed' }, { id: 'ex-1', exercise_name: 'Deadlift' })).toEqual({
      exercise_id: 'ex-1',
      exercise_name: 'Deadlift',
    })
  })

  it('rejects a linked exercise that is not owned by the user', () => {
    expect(resolveSetLogExercise({ exercise_id: 'other-user-ex', exercise_name: 'Deadlift' }, null)).toBeNull()
  })

  it('allows a trimmed ad-hoc exercise name without an id', () => {
    expect(resolveSetLogExercise({ exercise_id: null, exercise_name: '  Farmer carry  ' }, null)).toEqual({
      exercise_id: null,
      exercise_name: 'Farmer carry',
    })
  })

  it('rejects an empty ad-hoc name', () => {
    expect(resolveSetLogExercise({ exercise_id: null, exercise_name: '   ' }, null)).toBeNull()
  })
})
