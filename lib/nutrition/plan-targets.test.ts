import { describe, expect, it } from 'vitest'
import {
  parsePlanTargets,
  planTargetInsert,
  resolveNutritionTarget,
} from './plan-targets'

describe('parsePlanTargets', () => {
  it('parses a complete manual target with decimal commas', () => {
    expect(parsePlanTargets({
      calories_target: '2400',
      protein_target_g: '170,5',
      carbs_target_g: '280',
      fat_target_g: '75',
    })).toEqual({
      ok: true,
      targets: { calories: 2400, protein_g: 170.5, carbs_g: 280, fat_g: 75 },
    })
  })

  it('treats four blank fields as no target', () => {
    expect(parsePlanTargets({
      calories_target: '',
      protein_target_g: '',
      carbs_target_g: '',
      fat_target_g: '',
    })).toEqual({ ok: true, targets: null })
  })

  it('rejects partial, negative, nonnumeric, and excessive values', () => {
    expect(parsePlanTargets({
      calories_target: '2400',
      protein_target_g: '',
      carbs_target_g: '280',
      fat_target_g: '75',
    })).toEqual({ ok: false, field: 'protein_target_g', code: 'required_with_targets' })
    expect(parsePlanTargets({
      calories_target: '2400',
      protein_target_g: '-1',
      carbs_target_g: '280',
      fat_target_g: '75',
    })).toEqual({ ok: false, field: 'protein_target_g', code: 'invalid_value' })
    expect(parsePlanTargets({
      calories_target: '10001',
      protein_target_g: '170',
      carbs_target_g: '280',
      fat_target_g: '75',
    })).toEqual({ ok: false, field: 'calories_target', code: 'invalid_value' })
  })
})

describe('planTargetInsert', () => {
  it('maps complete and absent targets to database columns', () => {
    expect(planTargetInsert({ calories: 2400, protein_g: 170, carbs_g: 280, fat_g: 75 })).toEqual({
      calories_target: 2400,
      protein_target_g: 170,
      carbs_target_g: 280,
      fat_target_g: 75,
    })
    expect(planTargetInsert(null)).toEqual({
      calories_target: null,
      protein_target_g: null,
      carbs_target_g: null,
      fat_target_g: null,
    })
  })
})

describe('resolveNutritionTarget', () => {
  const plan = { calories: 2400, protein_g: 170, carbs_g: 280, fat_g: 75 }
  const day = { calories: 2600, protein_g: 180, carbs_g: 320, fat_g: 70 }

  it('uses exactly the source selected by tracking mode', () => {
    expect(resolveNutritionTarget('plan_document', plan, day)).toEqual(plan)
    expect(resolveNutritionTarget('plan_document', null, day)).toBeNull()
    expect(resolveNutritionTarget('macro_targets', plan, day)).toEqual(day)
    expect(resolveNutritionTarget('macro_targets', plan, null)).toBeNull()
  })
})
