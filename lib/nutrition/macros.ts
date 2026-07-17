// Pure nutrition macro logic ported from lifeos lib/nutrition.ts.
// Personal meal templates, Whoop calibration, and normalized-plan helpers were
// dropped — movu users author their own catalog and targets.

export interface MacroTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export const EMPTY_MACRO_TOTALS: MacroTotals = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
}

export type NutritionDayType = 'hard' | 'moderate' | 'rest'

export type MealName = 'breakfast' | 'midday' | 'pre_workout' | 'post_workout' | 'dinner' | 'snack'

export const MEAL_ORDER: MealName[] = [
  'breakfast',
  'midday',
  'pre_workout',
  'post_workout',
  'dinner',
  'snack',
]

export interface MacroItem {
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

export interface FoodLike {
  id: string
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface SubstitutionOption {
  foodItemId: string
  foodName: string
  label: string
  quantity: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  groupName: string
}

export type GenericFoodDraft = {
  name: string
  calories: string
  protein_g: string
  carbs_g: string
  fat_g: string
}

export type ParsedGenericFood = {
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export type GenericFoodParseResult =
  | { ok: true; value: ParsedGenericFood }
  | { ok: false; error: string }

export function calculateMacroCalories(
  macros: Pick<MacroTotals, 'protein_g' | 'carbs_g' | 'fat_g'>,
): number {
  return Math.round(macros.protein_g * 4 + macros.carbs_g * 4 + macros.fat_g * 9)
}

export function calculateConsumed(items: MacroItem[]): MacroTotals {
  return items.reduce<MacroTotals>(
    (totals, item) => {
      totals.calories += Number(item.calories) || 0
      totals.protein_g += Number(item.protein_g) || 0
      totals.carbs_g += Number(item.carbs_g) || 0
      totals.fat_g += Number(item.fat_g) || 0
      return totals
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  )
}

export function calculateRemaining(targets: MacroTotals, consumed: MacroTotals): MacroTotals {
  return {
    calories: Math.round(targets.calories - consumed.calories),
    protein_g: Math.round(targets.protein_g - consumed.protein_g),
    carbs_g: Math.round(targets.carbs_g - consumed.carbs_g),
    fat_g: Math.round(targets.fat_g - consumed.fat_g),
  }
}

export function scaleFood(
  food: Pick<FoodLike, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'>,
  quantity: number,
) {
  return {
    quantity,
    calories: Math.round(food.calories * quantity),
    protein_g: roundMacro(food.protein_g * quantity),
    carbs_g: roundMacro(food.carbs_g * quantity),
    fat_g: roundMacro(food.fat_g * quantity),
  }
}

function parseNonnegativeNumber(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return roundMacro(parsed)
}

export function parseGenericFoodDraft(draft: GenericFoodDraft): GenericFoodParseResult {
  const name = draft.name.trim()
  if (!name) return { ok: false, error: 'name' }

  const protein = parseNonnegativeNumber(draft.protein_g)
  const carbs = parseNonnegativeNumber(draft.carbs_g)
  const fat = parseNonnegativeNumber(draft.fat_g)
  if (protein === null || carbs === null || fat === null) {
    return { ok: false, error: 'macros' }
  }

  const calories = draft.calories.trim()
    ? parseNonnegativeNumber(draft.calories)
    : calculateMacroCalories({ protein_g: protein, carbs_g: carbs, fat_g: fat })
  if (calories === null) return { ok: false, error: 'calories' }
  if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
    return { ok: false, error: 'empty' }
  }

  return {
    ok: true,
    value: {
      name,
      calories: Math.round(calories),
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
    },
  }
}

export function getSubstitutions(
  foodItemId: string,
  foods: FoodLike[],
  groupItems: { groupName: string; foodItemId: string; quantity: number; label: string }[],
): SubstitutionOption[] {
  const groupNames = groupItems
    .filter((item) => item.foodItemId === foodItemId)
    .map((item) => item.groupName)

  return groupItems
    .filter((item) => groupNames.includes(item.groupName) && item.foodItemId !== foodItemId)
    .map((item) => {
      const food = foods.find((candidate) => candidate.id === item.foodItemId)
      if (!food) return null
      return {
        foodItemId: food.id,
        foodName: food.name,
        label: item.label,
        quantity: item.quantity,
        calories: Math.round(food.calories * item.quantity),
        protein_g: roundMacro(food.protein_g * item.quantity),
        carbs_g: roundMacro(food.carbs_g * item.quantity),
        fat_g: roundMacro(food.fat_g * item.quantity),
        groupName: item.groupName,
      }
    })
    .filter((item): item is SubstitutionOption => Boolean(item))
}

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10
}
