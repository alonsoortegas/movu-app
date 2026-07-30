import type { Json } from '@/types/database'

export const PLAN_IMPORT_SCHEMA_VERSION = '1.0' as const
export const PLAN_IMPORT_MAX_BYTES = 500 * 1024

export const IMPORTED_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const
export type ImportedDay = (typeof IMPORTED_DAYS)[number]

export const IMPORTED_SESSION_TYPES = ['strength', 'activation', 'cardio', 'other'] as const
export type ImportedSessionType = (typeof IMPORTED_SESSION_TYPES)[number]

export interface ImportedExerciseV1 {
  name: string
  sets: number | null
  reps: string | null
  suggested_weight_kg: number | null
  target_rpe: string | null
  rest_seconds: number | null
  superset_group: number | null
  is_isometric: boolean
  notes: string | null
}

export interface ImportedSessionV1 {
  day_of_week: ImportedDay
  title: string
  session_type: ImportedSessionType
  notes: string | null
  exercises: ImportedExerciseV1[]
}

export interface ImportedWeekV1 {
  week_number: number
  sessions: ImportedSessionV1[]
}

export interface ImportedPlanV1 {
  schema_version: typeof PLAN_IMPORT_SCHEMA_VERSION
  name: string
  start_date: string
  weeks: ImportedWeekV1[]
}

export interface PlanImportIssue {
  path: string
  code: string
}

export type PlanImportResult =
  | { ok: true; plan: ImportedPlanV1 }
  | { ok: false; issues: PlanImportIssue[] }

type UnknownRecord = Record<string, unknown>

const ROOT_FIELDS = ['schema_version', 'name', 'start_date', 'weeks']
const WEEK_FIELDS = ['week_number', 'sessions']
const SESSION_FIELDS = ['day_of_week', 'title', 'session_type', 'notes', 'exercises']
const EXERCISE_FIELDS = [
  'name',
  'sets',
  'reps',
  'suggested_weight_kg',
  'target_rpe',
  'rest_seconds',
  'superset_group',
  'is_isometric',
  'notes',
]

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function firstUnknownField(value: UnknownRecord, allowed: string[], path: string): PlanImportIssue | null {
  const key = Object.keys(value).find((field) => !allowed.includes(field))
  return key ? { path: path ? `${path}.${key}` : key, code: 'unknown_field' } : null
}

function requiredText(value: unknown, path: string): string | PlanImportIssue {
  if (typeof value !== 'string' || !value.trim()) return { path, code: 'required_text' }
  return value.trim()
}

function nullableText(value: unknown, path: string): string | null | PlanImportIssue {
  if (value == null) return null
  if (typeof value !== 'string') return { path, code: 'invalid_text' }
  return value.trim() || null
}

function nullableNonnegativeNumber(
  value: unknown,
  path: string,
  integer: boolean,
): number | null | PlanImportIssue {
  if (value == null) return null
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    (integer && !Number.isInteger(value))
  ) {
    return { path, code: integer ? 'nonnegative_integer' : 'nonnegative_number' }
  }
  return value
}

function isIssue(value: unknown): value is PlanImportIssue {
  return isRecord(value) && typeof value.path === 'string' && typeof value.code === 'string'
}

function validIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function normalizeRpe(value: unknown, path: string): string | null | PlanImportIssue {
  const text = nullableText(value, path)
  if (isIssue(text) || text === null) return text
  const match = text.match(/^(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?$/)
  if (!match) return { path, code: 'invalid_rpe' }
  const low = Number(match[1])
  const high = match[2] == null ? low : Number(match[2])
  if (low < 1 || high > 10 || high < low) return { path, code: 'invalid_rpe' }
  return text
}

function normalizeSupersetGroup(value: unknown, path: string): number | null | PlanImportIssue {
  if (typeof value === 'string' && /^[a-z]$/i.test(value.trim())) {
    return value.trim().toUpperCase().charCodeAt(0) - 64
  }
  return nullableNonnegativeNumber(value, path, true)
}

function parseExercise(value: unknown, path: string): ImportedExerciseV1 | PlanImportIssue {
  if (!isRecord(value)) return { path, code: 'expected_object' }
  const unknown = firstUnknownField(value, EXERCISE_FIELDS, path)
  if (unknown) return unknown

  const name = requiredText(value.name, `${path}.name`)
  if (isIssue(name)) return name
  const sets = nullableNonnegativeNumber(value.sets, `${path}.sets`, true)
  if (isIssue(sets)) return sets
  const reps = nullableText(value.reps, `${path}.reps`)
  if (isIssue(reps)) return reps
  const weight = nullableNonnegativeNumber(
    value.suggested_weight_kg,
    `${path}.suggested_weight_kg`,
    false,
  )
  if (isIssue(weight)) return weight
  const rpe = normalizeRpe(value.target_rpe, `${path}.target_rpe`)
  if (isIssue(rpe)) return rpe
  const rest = nullableNonnegativeNumber(value.rest_seconds, `${path}.rest_seconds`, true)
  if (isIssue(rest)) return rest
  const superset = normalizeSupersetGroup(value.superset_group, `${path}.superset_group`)
  if (isIssue(superset)) return superset
  if (value.is_isometric != null && typeof value.is_isometric !== 'boolean') {
    return { path: `${path}.is_isometric`, code: 'invalid_boolean' }
  }
  const notes = nullableText(value.notes, `${path}.notes`)
  if (isIssue(notes)) return notes

  return {
    name,
    sets,
    reps,
    suggested_weight_kg: weight,
    target_rpe: rpe,
    rest_seconds: rest,
    superset_group: superset,
    is_isometric: value.is_isometric ?? false,
    notes,
  }
}

function parseSession(value: unknown, path: string): ImportedSessionV1 | PlanImportIssue {
  if (!isRecord(value)) return { path, code: 'expected_object' }
  const unknown = firstUnknownField(value, SESSION_FIELDS, path)
  if (unknown) return unknown
  if (!IMPORTED_DAYS.includes(value.day_of_week as ImportedDay)) {
    return { path: `${path}.day_of_week`, code: 'invalid_day' }
  }
  const title = requiredText(value.title, `${path}.title`)
  if (isIssue(title)) return title
  if (!IMPORTED_SESSION_TYPES.includes(value.session_type as ImportedSessionType)) {
    return { path: `${path}.session_type`, code: 'invalid_session_type' }
  }
  const notes = nullableText(value.notes, `${path}.notes`)
  if (isIssue(notes)) return notes
  if (!Array.isArray(value.exercises) || value.exercises.length > 40) {
    return { path: `${path}.exercises`, code: 'invalid_exercise_count' }
  }
  const exercises: ImportedExerciseV1[] = []
  for (const [index, exerciseValue] of value.exercises.entries()) {
    const exercise = parseExercise(exerciseValue, `${path}.exercises[${index}]`)
    if (isIssue(exercise)) return exercise
    exercises.push(exercise)
  }
  return {
    day_of_week: value.day_of_week as ImportedDay,
    title,
    session_type: value.session_type as ImportedSessionType,
    notes,
    exercises,
  }
}

function parseWeek(value: unknown, index: number): ImportedWeekV1 | PlanImportIssue {
  const path = `weeks[${index}]`
  if (!isRecord(value)) return { path, code: 'expected_object' }
  const unknown = firstUnknownField(value, WEEK_FIELDS, path)
  if (unknown) return unknown
  if (value.week_number !== index + 1) {
    return { path: `${path}.week_number`, code: 'nonconsecutive_week' }
  }
  if (!Array.isArray(value.sessions) || value.sessions.length > 7) {
    return { path: `${path}.sessions`, code: 'invalid_session_count' }
  }
  const sessions: ImportedSessionV1[] = []
  for (const [sessionIndex, sessionValue] of value.sessions.entries()) {
    const session = parseSession(sessionValue, `${path}.sessions[${sessionIndex}]`)
    if (isIssue(session)) return session
    sessions.push(session)
  }
  return { week_number: index + 1, sessions }
}

export function parseImportedPlanJson(text: string): PlanImportResult {
  if (new TextEncoder().encode(text).byteLength > PLAN_IMPORT_MAX_BYTES) {
    return { ok: false, issues: [{ path: '$', code: 'too_large' }] }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, issues: [{ path: '$', code: 'invalid_json' }] }
  }
  if (!isRecord(parsed)) return { ok: false, issues: [{ path: '$', code: 'expected_object' }] }

  const unknown = firstUnknownField(parsed, ROOT_FIELDS, '')
  if (unknown) return { ok: false, issues: [unknown] }
  if (parsed.schema_version !== PLAN_IMPORT_SCHEMA_VERSION) {
    return { ok: false, issues: [{ path: 'schema_version', code: 'unsupported_version' }] }
  }
  const name = requiredText(parsed.name, 'name')
  if (isIssue(name)) return { ok: false, issues: [name] }
  if (!validIsoDate(parsed.start_date)) {
    return { ok: false, issues: [{ path: 'start_date', code: 'invalid_date' }] }
  }
  if (!Array.isArray(parsed.weeks) || parsed.weeks.length < 1 || parsed.weeks.length > 52) {
    return { ok: false, issues: [{ path: 'weeks', code: 'invalid_week_count' }] }
  }
  const weeks: ImportedWeekV1[] = []
  for (const [index, weekValue] of parsed.weeks.entries()) {
    const week = parseWeek(weekValue, index)
    if (isIssue(week)) return { ok: false, issues: [week] }
    weeks.push(week)
  }
  return {
    ok: true,
    plan: {
      schema_version: PLAN_IMPORT_SCHEMA_VERSION,
      name,
      start_date: parsed.start_date,
      weeks,
    },
  }
}

export function toImportRpcPayload(plan: ImportedPlanV1): Json {
  return JSON.parse(JSON.stringify(plan)) as Json
}
