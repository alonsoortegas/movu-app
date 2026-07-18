// Running-specific trend functions. Same contract as compute.ts: pure
// (rows, params) → series/summary, no I/O. Callers map DB rows to RunRow and
// run dedupeRuns before computeRunningTrends.
import {
  dateKey,
  dayNumber,
  linearSlopePerDay,
  weekStartKey,
  type Chip,
  type DatedValue,
} from './compute'

export interface RunRow {
  start: string
  source: string
  distanceM: number | null
  movingTimeS: number | null
  avgHrBpm: number | null
  hrZones: RunZones | null
}

// Structural mirror of types/database HrZones — zones store minutes or seconds.
export type RunZones = {
  z0_min?: number
  z1_min?: number
  z2_min?: number
  z3_min?: number
  z4_min?: number
  z5_min?: number
  z1_s?: number
  z2_s?: number
  z3_s?: number
  z4_s?: number
  z5_s?: number
}

export interface RunningWeek {
  week: string
  km: number
  runs: number
  longestKm: number
}

export interface RunningTrends {
  weeks: RunningWeek[]
  pace: {
    points: DatedValue[]
    /** Negative = getting faster. */
    slopeSPerKmPerWeek: number | null
    /** Inverted semantics: 'up' means improving (pace dropping). */
    chip: Chip | null
    avg4wS: number | null
    bestS: number | null
  }
  efficiency: {
    points: DatedValue[]
    slopePctPerWeek: number | null
    chip: Chip | null
    latest: number | null
  }
  zoneMix: { easyPct: number; modPct: number; hardPct: number } | null
  vo2: { points: DatedValue[]; latest: number | null; delta: number | null }
  summary: {
    thisWeekKm: number
    avg4wKmPerWeek: number | null
    totalRuns: number
    totalKm: number
  }
}

/** Pace sanity window: 2:30–15:00 min/km filters GPS junk and mislabeled walks. */
const PACE_MIN_S = 150
const PACE_MAX_S = 900
const MIN_PACE_DISTANCE_M = 1000

export function formatPace(sPerKm: number | null): string {
  if (sPerKm == null || !Number.isFinite(sPerKm)) return '—'
  const total = Math.round(sPerKm)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** [startMs, endMs] of a run; a missing duration collapses to a point. */
function interval(run: RunRow): [number, number] {
  const start = Date.parse(run.start)
  return [start, start + (run.movingTimeS ?? 0) * 1000]
}

function overlaps(a: [number, number], b: [number, number]): boolean {
  return a[0] <= b[1] && b[0] <= a[1]
}

/**
 * Collapse the same run recorded by multiple sources (time-overlap heuristic).
 * WHOOP wins — it carries HR and zones; same-source overlaps keep the first row.
 */
export function dedupeRuns(runs: RunRow[]): RunRow[] {
  const kept: RunRow[] = []
  // WHOOP rows first so an overlapping other-source row is dropped, not kept.
  const ordered = [...runs].sort((a, b) => {
    if (a.source !== b.source) {
      if (a.source === 'whoop') return -1
      if (b.source === 'whoop') return 1
    }
    return a.start.localeCompare(b.start)
  })
  for (const run of ordered) {
    if (!kept.some((k) => overlaps(interval(k), interval(run)))) kept.push(run)
  }
  // Restore chronological order for series consumers.
  return kept.sort((a, b) => a.start.localeCompare(b.start))
}

function paceSPerKm(run: RunRow): number | null {
  if (run.distanceM == null || run.distanceM < MIN_PACE_DISTANCE_M) return null
  if (run.movingTimeS == null || run.movingTimeS <= 0) return null
  const pace = run.movingTimeS / (run.distanceM / 1000)
  return pace >= PACE_MIN_S && pace <= PACE_MAX_S ? pace : null
}

function zoneBands(zones: RunZones): { easy: number; mod: number; hard: number } {
  const minutes = (min?: number, sec?: number) => min ?? (sec != null ? sec / 60 : 0)
  return {
    easy: minutes(zones.z0_min) + minutes(zones.z1_min, zones.z1_s) + minutes(zones.z2_min, zones.z2_s),
    mod: minutes(zones.z3_min, zones.z3_s),
    hard: minutes(zones.z4_min, zones.z4_s) + minutes(zones.z5_min, zones.z5_s),
  }
}

const round1 = (v: number) => Math.round(v * 10) / 10
const round2 = (v: number) => Math.round(v * 100) / 100

export function computeRunningTrends(
  runs: RunRow[],
  vo2Rows: { date: string; vo2: number | null }[],
  todayKey: string,
): RunningTrends {
  const dated = runs
    .map((run) => ({ run, date: dateKey(run.start) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // ── Weekly volume ──
  const weekMap = new Map<string, RunningWeek>()
  for (const { run, date } of dated) {
    const week = weekStartKey(date)
    const row = weekMap.get(week) ?? { week, km: 0, runs: 0, longestKm: 0 }
    const km = (run.distanceM ?? 0) / 1000
    row.km += km
    row.runs += 1
    row.longestKm = Math.max(row.longestKm, km)
    weekMap.set(week, row)
  }
  const weeks = [...weekMap.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((w) => ({ ...w, km: round1(w.km), longestKm: round1(w.longestKm) }))

  // ── Pace ──
  const pacePoints: DatedValue[] = []
  for (const { run, date } of dated) {
    const pace = paceSPerKm(run)
    if (pace != null) pacePoints.push({ date, value: round1(pace) })
  }
  const paceSlope = pacePoints.length >= 3 ? linearSlopePerDay(pacePoints) : null
  const slopeSPerKmPerWeek = paceSlope != null ? round1(paceSlope * 7) : null
  const paceChip: Chip | null = slopeSPerKmPerWeek == null
    ? null
    : slopeSPerKmPerWeek <= -2 ? 'up' : slopeSPerKmPerWeek >= 2 ? 'down' : 'flat'

  const inWindow = (date: string, days: number) => dayNumber(date) > dayNumber(todayKey) - days
  const pace4w = pacePoints.filter((p) => inWindow(p.date, 28))
  const avg4wS = pace4w.length
    ? Math.round(pace4w.reduce((s, p) => s + p.value, 0) / pace4w.length)
    : null
  const bestS = pacePoints.length ? Math.min(...pacePoints.map((p) => p.value)) : null

  // ── Aerobic efficiency (meters per heartbeat) ──
  const efficiencyPoints: DatedValue[] = []
  for (const { run, date } of dated) {
    if (paceSPerKm(run) == null) continue
    if (run.avgHrBpm == null || run.avgHrBpm <= 0) continue
    const metersPerBeat = ((run.distanceM! / run.movingTimeS!) * 60) / run.avgHrBpm
    efficiencyPoints.push({ date, value: round2(metersPerBeat) })
  }
  let slopePctPerWeek: number | null = null
  if (efficiencyPoints.length >= 3) {
    const slope = linearSlopePerDay(efficiencyPoints)
    const mean = efficiencyPoints.reduce((s, p) => s + p.value, 0) / efficiencyPoints.length
    if (slope != null && mean > 0) slopePctPerWeek = Math.round(((slope * 7) / mean) * 1000) / 10
  }
  const efficiencyChip: Chip | null = slopePctPerWeek == null
    ? null
    : slopePctPerWeek > 1 ? 'up' : slopePctPerWeek < -1 ? 'down' : 'flat'

  // ── Intensity mix ──
  let easy = 0
  let mod = 0
  let hard = 0
  for (const { run } of dated) {
    if (!run.hrZones) continue
    const bands = zoneBands(run.hrZones)
    easy += bands.easy
    mod += bands.mod
    hard += bands.hard
  }
  const zoneTotal = easy + mod + hard
  const zoneMix = zoneTotal > 0
    ? {
        easyPct: Math.round((easy / zoneTotal) * 100),
        modPct: Math.round((mod / zoneTotal) * 100),
        hardPct: Math.round((hard / zoneTotal) * 100),
      }
    : null

  // ── VO2max ──
  const vo2Points: DatedValue[] = vo2Rows
    .filter((r): r is { date: string; vo2: number } => r.vo2 != null)
    .map((r) => ({ date: r.date, value: r.vo2 }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const vo2Latest = vo2Points.length ? vo2Points[vo2Points.length - 1].value : null
  const vo2Delta = vo2Points.length >= 2
    ? round1(vo2Points[vo2Points.length - 1].value - vo2Points[0].value)
    : null

  // ── Summary ──
  const currentWeek = weekStartKey(todayKey)
  const thisWeekKm = weeks.find((w) => w.week === currentWeek)?.km ?? 0
  const km28d = dated
    .filter(({ date }) => inWindow(date, 28))
    .reduce((s, { run }) => s + (run.distanceM ?? 0) / 1000, 0)
  const totalKm = round1(dated.reduce((s, { run }) => s + (run.distanceM ?? 0) / 1000, 0))

  return {
    weeks,
    pace: { points: pacePoints, slopeSPerKmPerWeek, chip: paceChip, avg4wS, bestS },
    efficiency: {
      points: efficiencyPoints,
      slopePctPerWeek,
      chip: efficiencyChip,
      latest: efficiencyPoints.length ? efficiencyPoints[efficiencyPoints.length - 1].value : null,
    },
    zoneMix,
    vo2: { points: vo2Points, latest: vo2Latest, delta: vo2Delta },
    summary: {
      thisWeekKm,
      avg4wKmPerWeek: dated.length ? round1(km28d / 4) : null,
      totalRuns: dated.length,
      totalKm,
    },
  }
}
