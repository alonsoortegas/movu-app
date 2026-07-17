import { describe, expect, it } from 'vitest'
import { ownsEveryFoodId, resolveMealLogItem } from './log-entry'

const food = {
  id: 'food-1',
  name: 'Greek yogurt',
  calories: 120,
  protein_g: 20,
  carbs_g: 6,
  fat_g: 1.5,
}

describe('resolveMealLogItem', () => {
  it('uses and scales the owned catalog row instead of client macros', () => {
    expect(resolveMealLogItem({ food_item_id: 'food-1', name: 'Spoofed', quantity: 1.5, calories: 1 }, food)).toEqual({
      food_item_id: 'food-1',
      name: 'Greek yogurt',
      quantity: 1.5,
      calories: 180,
      protein_g: 30,
      carbs_g: 9,
      fat_g: 2.3,
    })
  })

  it('rejects a catalog id without an owned food row', () => {
    expect(resolveMealLogItem({ food_item_id: 'other-user-food', name: 'Rice', quantity: 1 }, null)).toBeNull()
  })

  it('keeps validated custom-entry macros', () => {
    expect(resolveMealLogItem({
      food_item_id: null,
      name: '  Smoothie  ',
      quantity: 1,
      calories: 350,
      protein_g: 25,
      carbs_g: 42,
      fat_g: 9,
    }, null)).toEqual({
      food_item_id: null,
      name: 'Smoothie',
      quantity: 1,
      calories: 350,
      protein_g: 25,
      carbs_g: 42,
      fat_g: 9,
    })
  })
})

describe('ownsEveryFoodId', () => {
  it('requires every requested id to be distinct and owned', () => {
    expect(ownsEveryFoodId(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(ownsEveryFoodId(['a', 'b', 'a'], ['a', 'b'])).toBe(false)
    expect(ownsEveryFoodId(['a', 'b'], ['a'])).toBe(false)
  })
})
