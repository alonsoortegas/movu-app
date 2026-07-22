import { describe, expect, it } from 'vitest'
import {
  buildNutritionPlanStoragePath,
  isValidNutritionPlanRange,
  validateNutritionPlanUpload,
} from './plan-document'

describe('validateNutritionPlanUpload', () => {
  it('accepts a PDF up to 10 MiB and normalizes its filename', () => {
    expect(validateNutritionPlanUpload({ name: 'Plan Nicole Julio 2026.pdf', type: 'application/pdf', size: 1024 }))
      .toEqual({ filename: 'plan-nicole-julio-2026.pdf', mimeType: 'application/pdf', size: 1024 })
  })

  it('rejects non-PDF files and oversized PDFs', () => {
    expect(() => validateNutritionPlanUpload({ name: 'plan.png', type: 'image/png', size: 100 })).toThrow('PDF')
    expect(() => validateNutritionPlanUpload({ name: 'plan.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 + 1 })).toThrow('10 MiB')
  })

  it('removes unsafe filename segments and creates an owner-scoped path', () => {
    expect(buildNutritionPlanStoragePath('user-1', 'plan-1', '../../Mi Plan (final).pdf'))
      .toBe('user-1/plan-1/mi-plan-final.pdf')
  })
})

describe('isValidNutritionPlanRange', () => {
  it('accepts open-ended plans and ordered historical plans', () => {
    expect(isValidNutritionPlanRange('2026-07-01', null)).toBe(true)
    expect(isValidNutritionPlanRange('2026-06-01', '2026-06-30')).toBe(true)
  })

  it('rejects a range ending before it starts', () => {
    expect(isValidNutritionPlanRange('2026-07-01', '2026-06-30')).toBe(false)
  })
})
