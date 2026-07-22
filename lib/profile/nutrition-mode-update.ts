import { parseNutritionTrackingMode } from '@/lib/nutrition/tracking-mode'

export function buildNutritionModeProfileUpdate(value: unknown) {
  return { nutrition_tracking_mode: parseNutritionTrackingMode(value) }
}
