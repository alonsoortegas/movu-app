// Portion options ported from lifeos lib/nutrition-portions.ts, with uuid string ids.
import type { ParsedGenericFood } from './macros'

export type PortionOption = {
  key: string
  source: 'catalog' | 'saved'
  sourceId: string
  name: string
  portionLabel: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface CatalogFoodLike {
  id: string
  name: string
  portion_label: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface SavedPortionLike {
  id: string
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export function normalizeSavedPortionName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function savedFoodPortionPayload(food: ParsedGenericFood) {
  const name = food.name.trim().replace(/\s+/g, ' ')

  return {
    normalized_name: normalizeSavedPortionName(name),
    name,
    calories: food.calories,
    protein_g: food.protein_g,
    carbs_g: food.carbs_g,
    fat_g: food.fat_g,
  }
}

export function buildPortionOptions(
  foods: CatalogFoodLike[],
  savedPortions: SavedPortionLike[],
): PortionOption[] {
  return [
    ...foods.map((food) => ({
      key: `catalog:${food.id}`,
      source: 'catalog' as const,
      sourceId: food.id,
      name: food.name,
      portionLabel: food.portion_label,
      calories: food.calories,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
    })),
    ...savedPortions.map((portion) => ({
      key: `saved:${portion.id}`,
      source: 'saved' as const,
      sourceId: portion.id,
      name: portion.name,
      portionLabel: '1 saved portion',
      calories: portion.calories,
      protein_g: portion.protein_g,
      carbs_g: portion.carbs_g,
      fat_g: portion.fat_g,
    })),
  ]
}

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10
}

export function scalePortionOption(option: PortionOption, quantity: number) {
  return {
    quantity,
    calories: Math.round(option.calories * quantity),
    protein_g: roundMacro(option.protein_g * quantity),
    carbs_g: roundMacro(option.carbs_g * quantity),
    fat_g: roundMacro(option.fat_g * quantity),
  }
}

export function mergeSavedFoodPortion<T extends { id: string; name: string }>(
  portions: T[],
  savedPortion: T,
): T[] {
  return [...portions.filter((portion) => portion.id !== savedPortion.id), savedPortion].sort(
    (a, b) => a.name.localeCompare(b.name),
  )
}
