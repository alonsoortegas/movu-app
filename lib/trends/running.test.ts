import { describe, expect, it } from 'vitest'
import {
  computeRunningTrends,
  dedupeRuns,
  formatPace,
  type RunRow,
} from './running'

const TODAY = '2026-07-16'

// Noon UTC = 6am CDMX, so the date key always matches the calendar date used here.
function run(overrides: Partial<RunRow> & { date: string }): RunRow {
  const { date, ...rest } = overrides
  return {
    start: `${date}T12:00:00Z`,
    source: 'whoop',
    distanceM: 5000,
    movingTimeS: 1800,
    avgHrBpm: null,
    hrZones: null,
    ...rest,
  }
}

describe('formatPace', () => {
  it('formats seconds per km as m:ss', () => {
    expect(formatPace(342)).toBe('5:42')
    expect(formatPace(360)).toBe('6:00')
  })
  it('rounds to the nearest second', () => {
    expect(formatPace(341.6)).toBe('5:42')
  })
  it('returns a dash for null', () => {
    expect(formatPace(null)).toBe('—')
  })
})

describe('dedupeRuns', () => {
  const whoop = run({ date: '2026-07-10', source: 'whoop', movingTimeS: 3000 })
  const appleOverlap: RunRow = {
    ...run({ date: '2026-07-10', source: 'apple_health', movingTimeS: 2900 }),
    start: '2026-07-10T12:10:00Z',
  }

  it('keeps the whoop row when an apple run overlaps in time', () => {
    expect(dedupeRuns([whoop, appleOverlap])).toEqual([whoop])
  })

  it('prefers whoop regardless of input order', () => {
    expect(dedupeRuns([appleOverlap, whoop])).toEqual([whoop])
  })

  it('keeps non-overlapping runs from both sources', () => {
    const appleNextDay = run({ date: '2026-07-11', source: 'apple_health' })
    expect(dedupeRuns([whoop, appleNextDay])).toHaveLength(2)
  })

  it('keeps the first row when two same-source runs overlap', () => {
    const dupe: RunRow = { ...whoop, start: '2026-07-10T12:05:00Z' }
    expect(dedupeRuns([whoop, dupe])).toEqual([whoop])
  })

  it('drops an overlapping run even when its duration is missing', () => {
    const appleNoTime: RunRow = {
      ...run({ date: '2026-07-10', source: 'apple_health', movingTimeS: null }),
      start: '2026-07-10T12:20:00Z',
    }
    expect(dedupeRuns([whoop, appleNoTime])).toEqual([whoop])
  })
})

describe('computeRunningTrends — weekly volume & summary', () => {
  const runs = [
    run({ date: '2026-07-06', distanceM: 8000, movingTimeS: 2880 }),
    run({ date: '2026-07-08', distanceM: 10000, movingTimeS: 3600 }),
    run({ date: '2026-07-14', distanceM: 5000, movingTimeS: 1500 }),
    run({ date: '2026-07-15', distanceM: null, movingTimeS: 1800 }),
  ]
  const result = computeRunningTrends(runs, [], TODAY)

  it('buckets km into Monday-start weeks with counts and longest run', () => {
    expect(result.weeks).toEqual([
      { week: '2026-07-06', km: 18, runs: 2, longestKm: 10 },
      { week: '2026-07-13', km: 5, runs: 2, longestKm: 5 },
    ])
  })

  it('counts distance-less runs as sessions contributing 0 km', () => {
    expect(result.summary.totalRuns).toBe(4)
    expect(result.summary.totalKm).toBe(23)
  })

  it('reports this-week km and the trailing 4-week average', () => {
    expect(result.summary.thisWeekKm).toBe(5)
    expect(result.summary.avg4wKmPerWeek).toBe(5.8) // 23 km over 28 days / 4
  })
})

describe('computeRunningTrends — pace', () => {
  // Exactly linear: 360 → 348 → 336 s/km over two weeks.
  const improving = [
    run({ date: '2026-07-01', distanceM: 6000, movingTimeS: 2160 }),
    run({ date: '2026-07-08', distanceM: 6000, movingTimeS: 2088 }),
    run({ date: '2026-07-15', distanceM: 6000, movingTimeS: 2016 }),
  ]

  it('derives per-run pace and an improving slope reads as up', () => {
    const { pace } = computeRunningTrends(improving, [], TODAY)
    expect(pace.points.map((p) => p.value)).toEqual([360, 348, 336])
    expect(pace.slopeSPerKmPerWeek).toBe(-12)
    expect(pace.chip).toBe('up')
    expect(pace.avg4wS).toBe(348)
    expect(pace.bestS).toBe(336)
  })

  it('a worsening slope reads as down', () => {
    const worsening = [
      run({ date: '2026-07-01', distanceM: 6000, movingTimeS: 2016 }),
      run({ date: '2026-07-08', distanceM: 6000, movingTimeS: 2088 }),
      run({ date: '2026-07-15', distanceM: 6000, movingTimeS: 2160 }),
    ]
    const { pace } = computeRunningTrends(worsening, [], TODAY)
    expect(pace.slopeSPerKmPerWeek).toBe(12)
    expect(pace.chip).toBe('down')
  })

  it('a stable pace reads as flat', () => {
    const flat = ['2026-07-01', '2026-07-08', '2026-07-15'].map((date) =>
      run({ date, distanceM: 6000, movingTimeS: 2100 }),
    )
    const { pace } = computeRunningTrends(flat, [], TODAY)
    expect(pace.chip).toBe('flat')
  })

  it('excludes short runs, missing durations, and implausible paces', () => {
    const junk = [
      run({ date: '2026-07-05', distanceM: 800, movingTimeS: 300 }),          // < 1 km
      run({ date: '2026-07-06', distanceM: 5000, movingTimeS: null }),        // no duration
      run({ date: '2026-07-07', distanceM: 5000, movingTimeS: 500 }),         // 100 s/km — junk
      run({ date: '2026-07-08', distanceM: 2000, movingTimeS: 1900 }),        // 950 s/km — walk
      run({ date: '2026-07-09', distanceM: 5000, movingTimeS: 1800 }),        // valid: 360
    ]
    const { pace } = computeRunningTrends(junk, [], TODAY)
    expect(pace.points).toEqual([{ date: '2026-07-09', value: 360 }])
    expect(pace.slopeSPerKmPerWeek).toBeNull() // fewer than 3 points
    expect(pace.chip).toBeNull()
  })
})

describe('computeRunningTrends — aerobic efficiency', () => {
  it('computes meters per beat for runs with heart rate', () => {
    const runs = [
      run({ date: '2026-07-01', distanceM: 6000, movingTimeS: 2160, avgHrBpm: 150 }),
      run({ date: '2026-07-08', distanceM: 6000, movingTimeS: 2088, avgHrBpm: 150 }),
      run({ date: '2026-07-15', distanceM: 6000, movingTimeS: 2016, avgHrBpm: 148 }),
    ]
    const { efficiency } = computeRunningTrends(runs, [], TODAY)
    expect(efficiency.points.map((p) => p.value)).toEqual([1.11, 1.15, 1.21])
    expect(efficiency.latest).toBe(1.21)
    expect(efficiency.slopePctPerWeek).toBe(4.3)
    expect(efficiency.chip).toBe('up')
  })

  it('skips runs without heart rate and yields no trend below 3 points', () => {
    const runs = [
      run({ date: '2026-07-08', distanceM: 6000, movingTimeS: 2088 }),
      run({ date: '2026-07-15', distanceM: 6000, movingTimeS: 2016, avgHrBpm: 148 }),
    ]
    const { efficiency } = computeRunningTrends(runs, [], TODAY)
    expect(efficiency.points).toHaveLength(1)
    expect(efficiency.slopePctPerWeek).toBeNull()
    expect(efficiency.chip).toBeNull()
  })
})

describe('computeRunningTrends — intensity mix', () => {
  it('aggregates zone minutes into easy/moderate/hard percentages', () => {
    const runs = [
      run({ date: '2026-07-06', hrZones: { z1_min: 30, z2_min: 30 } }),
      run({ date: '2026-07-08', hrZones: { z3_min: 15 } }),
      run({ date: '2026-07-10', hrZones: { z4_min: 3, z5_s: 120 } }),
    ]
    const { zoneMix } = computeRunningTrends(runs, [], TODAY)
    expect(zoneMix).toEqual({ easyPct: 75, modPct: 19, hardPct: 6 })
  })

  it('is null when no run has zone data', () => {
    const { zoneMix } = computeRunningTrends([run({ date: '2026-07-06' })], [], TODAY)
    expect(zoneMix).toBeNull()
  })
})

describe('computeRunningTrends — VO2max', () => {
  it('filters nulls and reports latest and delta', () => {
    const rows = [
      { date: '2026-06-20', vo2: 45.2 },
      { date: '2026-07-01', vo2: null },
      { date: '2026-07-10', vo2: 46.1 },
    ]
    const { vo2 } = computeRunningTrends([], rows, TODAY)
    expect(vo2.points).toEqual([
      { date: '2026-06-20', value: 45.2 },
      { date: '2026-07-10', value: 46.1 },
    ])
    expect(vo2.latest).toBe(46.1)
    expect(vo2.delta).toBe(0.9)
  })
})

describe('computeRunningTrends — empty input', () => {
  const result = computeRunningTrends([], [], TODAY)

  it('returns empty series and null trends', () => {
    expect(result.weeks).toEqual([])
    expect(result.pace.points).toEqual([])
    expect(result.pace.slopeSPerKmPerWeek).toBeNull()
    expect(result.pace.chip).toBeNull()
    expect(result.efficiency.chip).toBeNull()
    expect(result.zoneMix).toBeNull()
    expect(result.vo2.latest).toBeNull()
    expect(result.vo2.delta).toBeNull()
  })

  it('returns zeroed summary', () => {
    expect(result.summary).toEqual({
      thisWeekKm: 0,
      avg4wKmPerWeek: null,
      totalRuns: 0,
      totalKm: 0,
    })
  })
})
