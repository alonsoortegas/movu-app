import { scaleFood } from './macros'

interface MealItemInput {
  food_item_id?: string | null
  name?: unknown
  quantity: number
  calories?: unknown
  protein_g?: unknown
  carbs_g?: unknown
  fat_g?: unknown
}

interface OwnedFood {
  id: string
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

function nonnegative(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : null
}

export function resolveMealLogItem(input: MealItemInput, ownedFood: OwnedFood | null) {
  if (input.food_item_id) {
    if (!ownedFood || ownedFood.id !== input.food_item_id) return null
    const scaled = scaleFood(ownedFood, input.quantity)
    return {
      food_item_id: ownedFood.id,
      name: ownedFood.name,
      ...scaled,
    }
  }

  if (typeof input.name !== 'string' || !input.name.trim()) return null
  const calories = nonnegative(input.calories)
  const protein = nonnegative(input.protein_g)
  const carbs = nonnegative(input.carbs_g)
  const fat = nonnegative(input.fat_g)
  if (calories == null || protein == null || carbs == null || fat == null) return null
  return {
    food_item_id: null,
    name: input.name.trim(),
    quantity: input.quantity,
    calories: Math.round(calories),
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
  }
}

export function ownsEveryFoodId(requestedIds: string[], ownedIds: string[]): boolean {
  const requested = new Set(requestedIds)
  const owned = new Set(ownedIds)
  return requested.size === requestedIds.length && [...requested].every((id) => owned.has(id))
}
