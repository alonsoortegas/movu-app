export const NUTRITION_PLAN_MAX_BYTES = 10 * 1024 * 1024

export type NutritionPlanUpload = { name: string; type: string; size: number }

export function normalizeNutritionPlanFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() || 'nutrition-plan.pdf'
  const withoutExtension = base.replace(/\.pdf$/i, '')
  const normalized = withoutExtension
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
  return `${normalized || 'nutrition-plan'}.pdf`
}

export function validateNutritionPlanUpload(file: NutritionPlanUpload) {
  if (file.type !== 'application/pdf' || !/\.pdf$/i.test(file.name)) {
    throw new Error('Nutrition plans must be a PDF')
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > NUTRITION_PLAN_MAX_BYTES) {
    throw new Error('Nutrition plan PDFs must be 10 MiB or smaller')
  }
  return {
    filename: normalizeNutritionPlanFilename(file.name),
    mimeType: 'application/pdf' as const,
    size: file.size,
  }
}

export function buildNutritionPlanStoragePath(userId: string, planId: string, filename: string) {
  return `${userId}/${planId}/${normalizeNutritionPlanFilename(filename)}`
}

export function isValidNutritionPlanRange(startsOn: string, endsOn: string | null) {
  return /^\d{4}-\d{2}-\d{2}$/.test(startsOn)
    && (endsOn === null || (/^\d{4}-\d{2}-\d{2}$/.test(endsOn) && endsOn >= startsOn))
}
