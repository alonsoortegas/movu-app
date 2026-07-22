import { describe, expect, it } from 'vitest'
import { buildNutritionModeProfileUpdate } from './nutrition-mode-update'

describe('buildNutritionModeProfileUpdate', () => {
  it('returns an allowlisted update for each legal mode', () => {
    expect(buildNutritionModeProfileUpdate('macro_targets')).toEqual({
      nutrition_tracking_mode: 'macro_targets',
    })
    expect(buildNutritionModeProfileUpdate('plan_document')).toEqual({
      nutrition_tracking_mode: 'plan_document',
    })
  })

  it('rejects values outside the stored enum', () => {
    expect(() => buildNutritionModeProfileUpdate('automatic')).toThrow('Invalid nutrition tracking mode')
    expect(() => buildNutritionModeProfileUpdate(undefined)).toThrow('Invalid nutrition tracking mode')
  })
})
