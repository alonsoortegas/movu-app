import { describe, expect, it } from 'vitest'
import { parseNutritionTrackingMode, resolveNutritionPresentation } from './tracking-mode'

describe('parseNutritionTrackingMode', () => {
  it('accepts only the two stored nutrition modes', () => {
    expect(parseNutritionTrackingMode('plan_document')).toBe('plan_document')
    expect(parseNutritionTrackingMode('macro_targets')).toBe('macro_targets')
    expect(() => parseNutritionTrackingMode('automatic')).toThrow('Invalid nutrition tracking mode')
    expect(() => parseNutritionTrackingMode(null)).toThrow('Invalid nutrition tracking mode')
  })
})

describe('resolveNutritionPresentation', () => {
  it('keeps PDF mode primary and reports a missing PDF without falling back', () => {
    expect(resolveNutritionPresentation({
      mode: 'plan_document',
      hasActivePlan: false,
      hasTargets: true,
    })).toEqual({ primary: 'plan_document', state: 'missing_plan' })
  })

  it('keeps macro mode primary and reports missing targets without falling back', () => {
    expect(resolveNutritionPresentation({
      mode: 'macro_targets',
      hasActivePlan: true,
      hasTargets: false,
    })).toEqual({ primary: 'macro_targets', state: 'missing_targets' })
  })

  it('returns ready when the selected source exists', () => {
    expect(resolveNutritionPresentation({ mode: 'plan_document', hasActivePlan: true, hasTargets: false }))
      .toEqual({ primary: 'plan_document', state: 'ready' })
    expect(resolveNutritionPresentation({ mode: 'macro_targets', hasActivePlan: false, hasTargets: true }))
      .toEqual({ primary: 'macro_targets', state: 'ready' })
  })
})
