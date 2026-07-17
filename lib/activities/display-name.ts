import type { ActivityCategory } from '@/db/schema'

type ActivityDisplayInput = {
  activity_name?: string | null
  activity_type?: string | null
  activity_category?: ActivityCategory | string | null
  source?: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  run: 'Run',
  ride: 'Ride',
  strength: 'Strength',
  hiit: 'HIIT',
  mobility: 'Mobility',
  walk: 'Walk',
  swim: 'Swim',
  other: 'Workout',
}

const EXACT_LABELS: Record<string, string> = {
  barrys: "Barry's",
  barry_s: "Barry's",
  barrysbootcamp: "Barry's Bootcamp",
  bootcamp: 'Bootcamp',
  cardio: 'Cardio',
  combined: 'HIIT',
  crosstraining: 'Cross training',
  cycling: 'Ride',
  elliptical: 'Elliptical',
  functionalfitness: 'Functional fitness',
  functionalstrengthtraining: 'Functional strength',
  highintensityintervaltraining: 'HIIT',
  hiking: 'Hike',
  pilates: 'Pilates',
  rowing: 'Rowing',
  running: 'Run',
  stairclimbing: 'Stair climbing',
  swimming: 'Swim',
  traditionalstrengthtraining: 'Strength training',
  walking: 'Walk',
  weightlifting: 'Strength training',
  yoga: 'Yoga',
}

function compactKey(value: string): string {
  return value
    .replace(/^HKWorkoutActivityType/, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
}

function categoryLabel(category: ActivityDisplayInput['activity_category']): string | null {
  if (!category) return null
  return CATEGORY_LABELS[String(category).toLowerCase()] ?? null
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (match) => match.toUpperCase())
}

function humanizeIdentifier(value: string): string {
  return value
    .replace(/^HKWorkoutActivityType/, '')
    .replace(/^HKQuantityTypeIdentifier/, '')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function shouldPreserve(value: string): boolean {
  return /[ ·]/.test(value) && !/^HK[A-Z]/.test(value) && !/[_-]/.test(value)
}

export function formatActivityDisplayName(input: ActivityDisplayInput): string {
  const raw = input.activity_name?.trim() || input.activity_type?.trim()
  const fallback = categoryLabel(input.activity_category) ?? 'Workout'

  if (!raw) return fallback

  const key = compactKey(raw)
  if (key === 'other') return fallback
  if (EXACT_LABELS[key]) return EXACT_LABELS[key]
  if (shouldPreserve(raw)) return raw.replace(/\s+/g, ' ')

  const humanized = humanizeIdentifier(raw)
  if (!humanized || /^other$/i.test(humanized)) return fallback

  return titleCase(humanized)
}
