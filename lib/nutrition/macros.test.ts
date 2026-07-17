import { describe, expect, it } from 'vitest'
import {
  EMPTY_MACRO_TOTALS,
  MEAL_ORDER,
  calculateConsumed,
  calculateMacroCalories,
  calculateRemaining,
  getSubstitutions,
  parseGenericFoodDraft,
  scaleFood,
} from './macros'

describe('calculateMacroCalories', () => {
  it('uses 4/4/9 kcal per gram', () => {
    expect(calculateMacroCalories({ protein_g: 30, carbs_g: 50, fat_g: 10 })).toBe(410)
  })
})

describe('calculateConsumed', () => {
  it('sums item macros, treating nulls as zero', () => {
    const totals = calculateConsumed([
      { calories: 300, protein_g: 25, carbs_g: 30, fat_g: 8 },
      { calories: 150, protein_g: null, carbs_g: 20.5, fat_g: null },
    ])
    expect(totals).toEqual({ calories: 450, protein_g: 25, carbs_g: 50.5, fat_g: 8 })
  })

  it('returns zeros for no items', () => {
    expect(calculateConsumed([])).toEqual(EMPTY_MACRO_TOTALS)
  })
})

describe('calculateRemaining', () => {
  it('rounds target minus consumed', () => {
    const remaining = calculateRemaining(
      { calories: 2800, protein_g: 165, carbs_g: 330, fat_g: 80 },
      { calories: 450, protein_g: 25.4, carbs_g: 50.5, fat_g: 8 },
    )
    expect(remaining).toEqual({ calories: 2350, protein_g: 140, carbs_g: 280, fat_g: 72 })
  })
})

describe('scaleFood', () => {
  it('rounds calories to integers and macros to 0.1', () => {
    const scaled = scaleFood({ calories: 155, protein_g: 12.6, carbs_g: 1.1, fat_g: 10.6 }, 1.5)
    expect(scaled).toEqual({ quantity: 1.5, calories: 233, protein_g: 18.9, carbs_g: 1.7, fat_g: 15.9 })
  })
})

describe('parseGenericFoodDraft', () => {
  it('parses a full draft', () => {
    const result = parseGenericFoodDraft({
      name: '  Tacos al pastor ',
      calories: '520',
      protein_g: '28',
      carbs_g: '45',
      fat_g: '24',
    })
    expect(result).toEqual({
      ok: true,
      value: { name: 'Tacos al pastor', calories: 520, protein_g: 28, carbs_g: 45, fat_g: 24 },
    })
  })

  it('derives calories from macros when blank', () => {
    const result = parseGenericFoodDraft({
      name: 'Skyr',
      calories: '',
      protein_g: '11',
      carbs_g: '4',
      fat_g: '0.2',
    })
    expect(result.ok && result.value.calories).toBe(Math.round(11 * 4 + 4 * 4 + 0.2 * 9))
  })

  it('rejects empty names, negative macros, and all-zero drafts', () => {
    expect(parseGenericFoodDraft({ name: '', calories: '1', protein_g: '0', carbs_g: '0', fat_g: '0' }).ok).toBe(false)
    expect(parseGenericFoodDraft({ name: 'x', calories: '', protein_g: '-1', carbs_g: '0', fat_g: '0' }).ok).toBe(false)
    expect(parseGenericFoodDraft({ name: 'x', calories: '', protein_g: '0', carbs_g: '0', fat_g: '0' }).ok).toBe(false)
  })
})

describe('getSubstitutions', () => {
  const foods = [
    { id: 'oats', name: 'Oats', calories: 180, protein_g: 6, carbs_g: 30, fat_g: 3 },
    { id: 'potato', name: 'Potato', calories: 160, protein_g: 4, carbs_g: 36, fat_g: 0.2 },
    { id: 'rice', name: 'Rice', calories: 170, protein_g: 3.5, carbs_g: 37, fat_g: 0.5 },
  ]
  const groupItems = [
    { groupName: 'carb_30g', foodItemId: 'oats', quantity: 1, label: '1/2 cup oats' },
    { groupName: 'carb_30g', foodItemId: 'potato', quantity: 1.2, label: '250g potato' },
    { groupName: 'carb_30g', foodItemId: 'rice', quantity: 1, label: '1/2 cup rice' },
  ]

  it('lists scaled alternatives from the shared group, excluding the source food', () => {
    const subs = getSubstitutions('oats', foods, groupItems)
    expect(subs.map((s) => s.foodItemId)).toEqual(['potato', 'rice'])
    expect(subs[0]).toMatchObject({
      foodName: 'Potato',
      quantity: 1.2,
      calories: Math.round(160 * 1.2),
      carbs_g: 43.2,
      groupName: 'carb_30g',
    })
  })

  it('returns empty when the food is in no group', () => {
    expect(getSubstitutions('missing', foods, groupItems)).toEqual([])
  })
})

describe('MEAL_ORDER', () => {
  it('keeps the lifeos meal sequence', () => {
    expect(MEAL_ORDER).toEqual(['breakfast', 'midday', 'pre_workout', 'post_workout', 'dinner', 'snack'])
  })
})
