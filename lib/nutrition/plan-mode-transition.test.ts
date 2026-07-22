import { describe, expect, it } from 'vitest'
import { getNutritionPlanModeTransition } from './plan-mode-transition'

describe('getNutritionPlanModeTransition', () => {
  it('makes an uploaded plan the shared primary workflow', () => {
    expect(getNutritionPlanModeTransition('upload')).toBe('plan_document')
  })

  it('returns to macro targets when the active PDF is archived', () => {
    expect(getNutritionPlanModeTransition('archive')).toBe('macro_targets')
  })
})
