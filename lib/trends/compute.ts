// Pure trend-metric functions ported from lifeos lib/trends.ts.
// No I/O here — everything is (rows, params) → series/summary, unit-tested next to it.
// Adaptations from lifeos: date bucketing defaults to Mexico City, strength logs
// store kg directly, load takes pre-shaped activity rows, fuel takes pre-aggregated
// days (movu queries return flat rows, not nested Supabase joins).

export const APP_TIMEZONE = 'America/Mexico_City'

// ── Phase constants ───────────────────────────────────────────────────────────
export type PhaseKind = 'bulk' | 'cut' | 'maintenance'

export interface TrainingPhase {
  phase: PhaseKind
  started_on: string
  target_rate_kg_per_week: number | null
}

export const PHASE_DEFAULT_RATE: Record<PhaseKind, number> = {
  bulk: 0.25,
  cut: -0.5,
  maintenance: 0,
}
export const MAINTENANCE_BAND_KG = 0.15

// ── Dates & weeks ─────────────────────────────────────────────────────────────
const DATE_KEY_FORMATTERS = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = DATE_KEY_FORMATTERS.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    DATE_KEY_FORMATTERS.set(timeZone, formatter)
  }
  return formatter
}

export function dateKey(iso: string, timeZone: string = APP_TIMEZONE): string {
  return formatterFor(timeZone).format(new Date(iso))
}

function dayNumber(key: string): number {
  return Math.floor(Date.parse(`${key}T00:00:00Z`) / 86400000)
}

/** Monday-start week key for a YYYY-MM-DD date key. */
export function weekStartKey(key: string): string {
  const d = new Date(`${key}T12:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

// ── Series math ───────────────────────────────────────────────────────────────
export interface DatedValue {
  date: string
  value: number
}

/** Trailing calendar-day rolling average; input need not be contiguous. */
export function rollingAverage(points: DatedValue[], windowDays: number): DatedValue[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((p) => {
    const end = dayNumber(p.date)
    const inWindow = sorted.filter((q) => {
      const d = dayNumber(q.date)
      return d > end - windowDays && d <= end
    })
    const mean = inWindow.reduce((s, q) => s + q.value, 0) / inWindow.length
    return { date: p.date, value: Math.round(mean * 100) / 100 }
  })
}

/** Least-squares slope in value-units per day. Null below 2 points. */
export function linearSlopePerDay(points: DatedValue[]): number | null {
  if (points.length < 2) return null
  const x0 = dayNumber(points[0].date)
  const xs = points.map((p) => dayNumber(p.date) - x0)
  const ys = points.map((p) => p.value)
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  return den === 0 ? null : num / den
}

// ── Body & phase ──────────────────────────────────────────────────────────────
export type Verdict = 'on_track' | 'fast' | 'slow'

export interface BodyTrend {
  weights: DatedValue[]
  rolling7: DatedValue[]
  /** Rolling last-21-days rate — "what is my weight doing right now". */
  ratePerWeek: number | null
  targetRate: number | null
  verdict: Verdict | null
  /** Phase-cumulative view — "how is the whole phase going". Uses 7d-rolling
   *  values at both ends to smooth weigh-in noise. Null without a phase or
   *  with fewer than 2 in-phase weigh-ins. */
  sinceStart: { totalKg: number; avgPerWeek: number | null; days: number } | null
}

function rateVerdict(rate: number, phase: TrainingPhase): Verdict {
  if (phase.phase === 'maintenance') {
    const band = phase.target_rate_kg_per_week != null
      ? Math.abs(phase.target_rate_kg_per_week)
      : MAINTENANCE_BAND_KG
    if (Math.abs(rate) <= band) return 'on_track'
    return rate > 0 ? 'fast' : 'slow'
  }
  const target = phase.target_rate_kg_per_week ?? PHASE_DEFAULT_RATE[phase.phase]
  const ratio = rate / target
  if (ratio > 1.5) return 'fast'
  if (ratio < 0.5) return 'slow'
  return 'on_track'
}

export function computeBodyTrend(
  measurements: { measured_on: string; weight_kg: number | null }[],
  phase: TrainingPhase | null,
  todayKey: string,
): BodyTrend {
  const weights: DatedValue[] = measurements
    .filter((m) => m.weight_kg != null && m.weight_kg > 0)
    .map((m) => ({ date: m.measured_on, value: Number(m.weight_kg) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const rolling7 = rollingAverage(weights, 7)

  // Weekly rate = least-squares fit over the last 21 days; needs ≥5 weigh-ins.
  const cutoff = dayNumber(todayKey) - 21
  const recent = weights.filter((w) => dayNumber(w.date) > cutoff)
  const slope = recent.length >= 5 ? linearSlopePerDay(recent) : null
  const ratePerWeek = slope != null ? Math.round(slope * 7 * 100) / 100 : null

  let targetRate: number | null = null
  let verdict: Verdict | null = null
  let sinceStart: BodyTrend['sinceStart'] = null
  if (phase) {
    targetRate = phase.target_rate_kg_per_week ?? PHASE_DEFAULT_RATE[phase.phase]
    if (ratePerWeek != null) verdict = rateVerdict(ratePerWeek, phase)

    const startDay = dayNumber(phase.started_on)
    const inPhase = weights.filter((w) => dayNumber(w.date) >= startDay)
    if (inPhase.length >= 2) {
      const rollByDate = new Map(rolling7.map((p) => [p.date, p.value]))
      const baseline = rollByDate.get(inPhase[0].date) ?? inPhase[0].value
      const latest = rolling7.length ? rolling7[rolling7.length - 1].value : weights[weights.length - 1].value
      const days = dayNumber(inPhase[inPhase.length - 1].date) - dayNumber(inPhase[0].date)
      const totalKg = Math.round((latest - baseline) * 100) / 100
      sinceStart = {
        totalKg,
        avgPerWeek: days >= 7 ? Math.round(((totalKg / days) * 7) * 100) / 100 : null,
        days,
      }
    }
  }
  return { weights, rolling7, ratePerWeek, targetRate, verdict, sinceStart }
}

// ── Strength (from logged sets) ──────────────────────────────────────────────
export type Chip = 'up' | 'flat' | 'down'

export function epley1RM(weightKg: number, reps: number): number {
  return reps <= 1 ? weightKg : weightKg * (1 + reps / 30)
}

export interface StrengthLogRow {
  logged_at: string
  exercise_name: string
  weight_kg: number | null
  reps: number | null
}

export interface ExerciseTrend {
  exercise: string
  points: DatedValue[]
  slopePctPerWeek: number | null
}

export interface StrengthTrends {
  exercises: ExerciseTrend[]
  weeklyTonnage: { week: string; kg: number }[]
  strengthChip: Chip | null
  volumeChip: Chip | null
}

export function computeStrengthTrends(logs: StrengthLogRow[], todayKey: string, topN = 6): StrengthTrends {
  const sets = logs.flatMap((l) => {
    const kg = l.weight_kg
    if (kg == null || kg <= 0 || !l.reps || l.reps <= 0) return []
    return [{ exercise: l.exercise_name, date: dateKey(l.logged_at), kg, reps: l.reps }]
  })

  // Key lifts = most-logged exercises in range.
  const counts = new Map<string, number>()
  for (const s of sets) counts.set(s.exercise, (counts.get(s.exercise) ?? 0) + 1)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([e]) => e)

  const exercises: ExerciseTrend[] = top.map((exercise) => {
    const best = new Map<string, number>() // date → best e1RM that session
    for (const s of sets) {
      if (s.exercise !== exercise) continue
      const e1 = epley1RM(s.kg, s.reps)
      best.set(s.date, Math.max(best.get(s.date) ?? 0, e1))
    }
    const points = [...best.entries()]
      .map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }))
      .sort((a, b) => a.date.localeCompare(b.date))
    let slopePctPerWeek: number | null = null
    if (points.length >= 3) {
      const slope = linearSlopePerDay(points)
      const mean = points.reduce((s, p) => s + p.value, 0) / points.length
      if (slope != null && mean > 0) slopePctPerWeek = Math.round(((slope * 7) / mean) * 1000) / 10
    }
    return { exercise, points, slopePctPerWeek }
  })

  const tonnage = new Map<string, number>()
  for (const s of sets) {
    const wk = weekStartKey(s.date)
    tonnage.set(wk, (tonnage.get(wk) ?? 0) + s.kg * s.reps)
  }
  const weeklyTonnage = [...tonnage.entries()]
    .map(([week, kg]) => ({ week, kg: Math.round(kg) }))
    .sort((a, b) => a.week.localeCompare(b.week))

  // Strength chip: median e1RM slope across key lifts, ±1%/week.
  const slopes = exercises
    .map((e) => e.slopePctPerWeek)
    .filter((s): s is number => s != null)
    .sort((a, b) => a - b)
  let strengthChip: Chip | null = null
  if (slopes.length) {
    const median = slopes[Math.floor(slopes.length / 2)]
    strengthChip = median > 1 ? 'up' : median < -1 ? 'down' : 'flat'
  }

  // Volume chip: mean of last 3 complete weeks vs the prior 3, ±5%.
  const currentWeek = weekStartKey(todayKey)
  const complete = weeklyTonnage.filter((w) => w.week < currentWeek)
  const last3 = complete.slice(-3)
  const prev3 = complete.slice(-6, -3)
  let volumeChip: Chip | null = null
  if (last3.length && prev3.length) {
    const mean = (a: { kg: number }[]) => a.reduce((s, w) => s + w.kg, 0) / a.length
    const changePct = ((mean(last3) - mean(prev3)) / mean(prev3)) * 100
    volumeChip = changePct > 5 ? 'up' : changePct < -5 ? 'down' : 'flat'
  }

  return { exercises, weeklyTonnage, strengthChip, volumeChip }
}

// ── Load ──────────────────────────────────────────────────────────────────────
export interface LoadActivityRow {
  start: string
  category: 'training' | 'lifestyle'
  minutes: number | null
}

export interface LoadWeek {
  week: string
  trainingMin: number
  lifestyleMin: number
  sessions: number
  strain: number
}

export interface LoadTrends {
  weeks: LoadWeek[]
  totalTrainingMin: number
  totalLifestyleMin: number
}

export function computeLoadTrends(
  activities: LoadActivityRow[],
  dailyStrain: { date: string; strain: number | null }[],
): LoadTrends {
  const weeks = new Map<string, LoadWeek>()
  const get = (wk: string): LoadWeek => {
    if (!weeks.has(wk)) weeks.set(wk, { week: wk, trainingMin: 0, lifestyleMin: 0, sessions: 0, strain: 0 })
    return weeks.get(wk)!
  }

  for (const a of activities) {
    const row = get(weekStartKey(dateKey(a.start)))
    const min = a.minutes ?? 0
    if (a.category === 'training') {
      row.trainingMin += min
      row.sessions += 1
    } else {
      row.lifestyleMin += min
    }
  }
  for (const s of dailyStrain) {
    if (s.strain == null) continue
    get(weekStartKey(s.date)).strain += Number(s.strain)
  }

  const sorted = [...weeks.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((w) => ({
      ...w,
      trainingMin: Math.round(w.trainingMin),
      lifestyleMin: Math.round(w.lifestyleMin),
      strain: Math.round(w.strain * 10) / 10,
    }))

  return {
    weeks: sorted,
    totalTrainingMin: sorted.reduce((s, w) => s + w.trainingMin, 0),
    totalLifestyleMin: sorted.reduce((s, w) => s + w.lifestyleMin, 0),
  }
}

// ── Fuel (nutrition adherence + energy balance) ──────────────────────────────
export interface FuelDay {
  date: string
  kcal: number
  kcalTarget: number | null
  protein: number
  proteinTarget: number | null
  logged: boolean
}

export interface FuelTrends {
  days: FuelDay[]
  /** Denominator is the calendar span (first day → today) so days without any
   *  log still count as unlogged — sparse logging can't masquerade as
   *  compliance. kcal = ±10% window; protein = floor (≥ target). */
  adherence: {
    totalDays: number
    loggedDays: number
    loggedPct: number | null
    kcalWithin10Pct: number | null
    proteinHitPct: number | null
  }
  /** 7-day protein average ÷ current body weight. */
  proteinPerKg: number | null
  /** Logged-day averages over the last 21 days, alongside what the scale
   *  implies (ratePerWeek × 7700 kcal/kg ÷ 7) — the honesty cross-check. */
  energyBalance: {
    avgKcal21d: number | null
    avgDeltaVsTarget21d: number | null
    scaleImpliedKcalPerDay: number | null
  }
}

export function computeFuelTrends(
  inputDays: FuelDay[],
  todayKey: string,
  opts: { actualRatePerWeek?: number | null; latestWeightKg?: number | null } = {},
): FuelTrends {
  const days = [...inputDays].sort((a, b) => a.date.localeCompare(b.date))

  const logged = days.filter((d) => d.logged)
  const totalDays = days.length ? dayNumber(todayKey) - dayNumber(days[0].date) + 1 : 0
  const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : null)

  const kcalEligible = logged.filter((d) => (d.kcalTarget ?? 0) > 0)
  const kcalWithin = kcalEligible.filter((d) => Math.abs(d.kcal - d.kcalTarget!) <= 0.1 * d.kcalTarget!)
  const proteinEligible = logged.filter((d) => (d.proteinTarget ?? 0) > 0)
  const proteinHit = proteinEligible.filter((d) => d.protein >= d.proteinTarget!)

  const adherence = {
    totalDays,
    loggedDays: logged.length,
    loggedPct: pct(logged.length, totalDays),
    kcalWithin10Pct: pct(kcalWithin.length, kcalEligible.length),
    proteinHitPct: pct(proteinHit.length, proteinEligible.length),
  }

  const inWindow = (d: FuelDay, windowDays: number) => dayNumber(d.date) > dayNumber(todayKey) - windowDays
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length

  const last7 = logged.filter((d) => inWindow(d, 7))
  const proteinPerKg = last7.length && opts.latestWeightKg
    ? Math.round((mean(last7.map((d) => d.protein)) / opts.latestWeightKg) * 100) / 100
    : null

  const last21 = logged.filter((d) => inWindow(d, 21))
  const withTarget = last21.filter((d) => (d.kcalTarget ?? 0) > 0)
  const energyBalance = {
    avgKcal21d: last21.length ? Math.round(mean(last21.map((d) => d.kcal))) : null,
    avgDeltaVsTarget21d: withTarget.length ? Math.round(mean(withTarget.map((d) => d.kcal - d.kcalTarget!))) : null,
    scaleImpliedKcalPerDay: opts.actualRatePerWeek != null
      ? Math.round((opts.actualRatePerWeek * 7700) / 7)
      : null,
  }

  return { days, adherence, proteinPerKg, energyBalance }
}
