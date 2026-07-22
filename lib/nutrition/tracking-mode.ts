export const NUTRITION_TRACKING_MODES = ['plan_document', 'macro_targets'] as const
export type NutritionTrackingMode = (typeof NUTRITION_TRACKING_MODES)[number]

export function parseNutritionTrackingMode(value: unknown): NutritionTrackingMode {
  if (value === 'plan_document' || value === 'macro_targets') return value
  throw new Error('Invalid nutrition tracking mode')
}

export type NutritionPresentationState = 'ready' | 'missing_plan' | 'missing_targets'

export function resolveNutritionPresentation({
  mode,
  hasActivePlan,
  hasTargets,
}: {
  mode: NutritionTrackingMode
  hasActivePlan: boolean
  hasTargets: boolean
}): { primary: NutritionTrackingMode; state: NutritionPresentationState } {
  if (mode === 'plan_document') {
    return { primary: mode, state: hasActivePlan ? 'ready' : 'missing_plan' }
  }
  return { primary: mode, state: hasTargets ? 'ready' : 'missing_targets' }
}
