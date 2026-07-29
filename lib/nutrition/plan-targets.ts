import type { MacroTotals } from './macros'
import type { NutritionTrackingMode } from './tracking-mode'

export type PlanTargetFields = {
  calories_target: string
  protein_target_g: string
  carbs_target_g: string
  fat_target_g: string
}

export type PlanTargetParseResult =
  | { ok: true; targets: MacroTotals | null }
  | { ok: false; field: keyof PlanTargetFields; code: string }

const FIELD_LIMITS: Record<keyof PlanTargetFields, { min: number; max: number; integer?: boolean }> = {
  calories_target: { min: 500, max: 10000, integer: true },
  protein_target_g: { min: 0, max: 1000 },
  carbs_target_g: { min: 0, max: 1000 },
  fat_target_g: { min: 0, max: 500 },
}

function parseField(value: string): number {
  return Number(value.trim().replace(',', '.'))
}

export function parsePlanTargets(fields: PlanTargetFields): PlanTargetParseResult {
  const keys = Object.keys(FIELD_LIMITS) as Array<keyof PlanTargetFields>
  if (keys.every((key) => !fields[key].trim())) return { ok: true, targets: null }

  const values = {} as Record<keyof PlanTargetFields, number>
  for (const key of keys) {
    if (!fields[key].trim()) return { ok: false, field: key, code: 'required_with_targets' }
    const value = parseField(fields[key])
    const limit = FIELD_LIMITS[key]
    if (
      !Number.isFinite(value) ||
      value < limit.min ||
      value > limit.max ||
      (limit.integer && !Number.isInteger(value))
    ) {
      return { ok: false, field: key, code: 'invalid_value' }
    }
    values[key] = value
  }

  return {
    ok: true,
    targets: {
      calories: values.calories_target,
      protein_g: values.protein_target_g,
      carbs_g: values.carbs_target_g,
      fat_g: values.fat_target_g,
    },
  }
}

export function planTargetInsert(targets: MacroTotals | null) {
  return {
    calories_target: targets?.calories ?? null,
    protein_target_g: targets?.protein_g ?? null,
    carbs_target_g: targets?.carbs_g ?? null,
    fat_target_g: targets?.fat_g ?? null,
  }
}

export function resolveNutritionTarget(
  mode: NutritionTrackingMode,
  planTargets: MacroTotals | null,
  dayTarget: MacroTotals | null,
): MacroTotals | null {
  return mode === 'plan_document' ? planTargets : dayTarget
}
