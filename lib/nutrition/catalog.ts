import type { NutritionDayType } from './macros'

export const TARGET_DAY_TYPES: NutritionDayType[] = ['hard', 'moderate', 'rest']

export interface TargetDraft {
  calories: string
  protein: string
  carbs: string
  fat: string
}

export type TargetDrafts = Record<NutritionDayType, TargetDraft>

export interface TargetRowPayload {
  day_type: NutritionDayType
  calories_target: number
  protein_target: number
  carbs_target: number
  fat_target: number
}

function parseTarget(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null
}

export function buildTargetRows(
  drafts: TargetDrafts,
  sameEveryDay: boolean,
): TargetRowPayload[] | null {
  const rows: TargetRowPayload[] = []

  for (const dayType of TARGET_DAY_TYPES) {
    const draft = sameEveryDay ? drafts.moderate : drafts[dayType]
    const calories = parseTarget(draft.calories)
    const protein = parseTarget(draft.protein)
    const carbs = parseTarget(draft.carbs)
    const fat = parseTarget(draft.fat)
    if (calories == null || protein == null || carbs == null || fat == null) return null

    rows.push({
      day_type: dayType,
      calories_target: calories,
      protein_target: protein,
      carbs_target: carbs,
      fat_target: fat,
    })
  }

  return rows
}
