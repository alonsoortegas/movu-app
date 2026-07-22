import type { NutritionTrackingMode } from './tracking-mode'

export function getNutritionPlanModeTransition(
  operation: 'upload' | 'archive',
): NutritionTrackingMode {
  return operation === 'upload' ? 'plan_document' : 'macro_targets'
}
