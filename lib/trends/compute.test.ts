import { describe, expect, it } from 'vitest'
import {
  computeBodyTrend,
  computeFuelTrends,
  computeLoadTrends,
  computeStrengthTrends,
  dayRangeUtc,
  dateKey,
  epley1RM,
  linearSlopePerDay,
  rollingAverage,
  selectActivePhase,
  weekStartKey,
  type FuelDay,
  type StrengthLogRow,
  type TrainingPhase,
} from './compute'

const TODAY = '2026-07-08'

describe('dateKey', () => {
  it('buckets by Mexico City local day (UTC-6)', () => {
    expect(dateKey('2026-07-08T02:30:00Z')).toBe('2026-07-07')
    expect(dateKey('2026-07-08T10:00:00Z')).toBe('2026-07-08')
  })

  it('accepts an explicit timezone', () => {
    expect(dateKey('2026-07-08T22:30:00Z', 'Europe/Berlin')).toBe('2026-07-09')
  })
})

describe('dayRangeUtc', () => {
  it('returns Mexico City midnight boundaries as UTC instants', () => {
    expect(dayRangeUtc('2026-07-17')).toEqual({
      start: '2026-07-17T06:00:00.000Z',
      end: '2026-07-18T06:00:00.000Z',
    })
  })

  it('supports an explicit timezone', () => {
    expect(dayRangeUtc('2026-07-17', 'Europe/Berlin')).toEqual({
      start: '2026-07-16T22:00:00.000Z',
      end: '2026-07-17T22:00:00.000Z',
    })
  })
})

describe('weekStartKey', () => {
  it('maps Wednesday to its Monday', () => expect(weekStartKey('2026-07-08')).toBe('2026-07-06'))
  it('maps Monday to itself', () => expect(weekStartKey('2026-07-06')).toBe('2026-07-06'))
  it('maps Sunday to the preceding Monday', () => expect(weekStartKey('2026-07-12')).toBe('2026-07-06'))
  it('crosses month boundaries', () => expect(weekStartKey('2026-08-01')).toBe('2026-07-27'))
})

describe('selectActivePhase', () => {
  const phases = [
    { id: 'future', start_date: '2026-08-01', end_date: null },
    { id: 'current', start_date: '2026-07-01', end_date: null },
    { id: 'past', start_date: '2026-06-01', end_date: '2026-06-30' },
  ]

  it('ignores future and ended phases', () => {
    expect(selectActivePhase(phases, '2026-07-17')?.id).toBe('current')
  })

  it('returns null when no phase contains today', () => {
    expect(selectActivePhase(phases, '2026-05-01')).toBeNull()
  })
})

describe('rollingAverage', () => {
  it('averages only points inside the calendar-day window', () => {
    const pts = [
      { date: '2026-07-01', value: 100 },
      { date: '2026-07-02', value: 102 },
      { date: '2026-07-10', value: 110 },
    ]
    expect(rollingAverage(pts, 7)).toEqual([
      { date: '2026-07-01', value: 100 },
      { date: '2026-07-02', value: 101 },
      { date: '2026-07-10', value: 110 },
    ])
  })
})

describe('linearSlopePerDay', () => {
  it('fits a perfect line', () => {
    const pts = [
      { date: '2026-07-01', value: 80 },
      { date: '2026-07-02', value: 80.1 },
      { date: '2026-07-03', value: 80.2 },
    ]
    expect(linearSlopePerDay(pts)!).toBeCloseTo(0.1, 6)
  })
  it('returns null below 2 points', () => {
    expect(linearSlopePerDay([{ date: '2026-07-01', value: 80 }])).toBeNull()
  })
})

function phase(p: TrainingPhase['phase'], target: number | null = null): TrainingPhase {
  return { phase: p, started_on: '2026-06-01', target_rate_kg_per_week: target }
}

/** 7 weigh-ins every 3 days ending today, rising `ratePerWeek`. */
function weights(ratePerWeek: number, base = 80) {
  const dates = ['2026-06-20', '2026-06-23', '2026-06-26', '2026-06-29', '2026-07-02', '2026-07-05', '2026-07-08']
  const perDay = ratePerWeek / 7
  return dates.map((d, i) => ({ measured_on: d, weight_kg: base + perDay * i * 3 }))
}

describe('computeBodyTrend', () => {
  it('bulk on pace → on_track', () => {
    const t = computeBodyTrend(weights(0.25), phase('bulk'), TODAY)
    expect(t.ratePerWeek!).toBeCloseTo(0.25, 2)
    expect(t.targetRate).toBe(0.25)
    expect(t.verdict).toBe('on_track')
  })
  it('bulk gaining >1.5x target → fast', () => {
    expect(computeBodyTrend(weights(0.6), phase('bulk'), TODAY).verdict).toBe('fast')
  })
  it('cut losing <0.5x target → slow', () => {
    expect(computeBodyTrend(weights(-0.1), phase('cut'), TODAY).verdict).toBe('slow')
  })
  it('maintenance inside band → on_track, above → fast', () => {
    expect(computeBodyTrend(weights(0.1), phase('maintenance'), TODAY).verdict).toBe('on_track')
    expect(computeBodyTrend(weights(0.3), phase('maintenance'), TODAY).verdict).toBe('fast')
  })
  it('needs ≥5 weigh-ins in 21 days', () => {
    const few = weights(0.25).slice(-4)
    const t = computeBodyTrend(few, phase('bulk'), TODAY)
    expect(t.ratePerWeek).toBeNull()
    expect(t.verdict).toBeNull()
  })
  it('no phase → no target, no verdict, but still series', () => {
    const t = computeBodyTrend(weights(0.25), null, TODAY)
    expect(t.targetRate).toBeNull()
    expect(t.verdict).toBeNull()
    expect(t.weights.length).toBe(7)
    expect(t.rolling7.length).toBe(7)
  })
  it('sinceStart accumulates from the phase start using rolling endpoints', () => {
    const t = computeBodyTrend(weights(0.25), phase('bulk'), TODAY)
    expect(t.sinceStart!.days).toBe(18)
    expect(t.sinceStart!.totalKg).toBeCloseTo(0.54, 2)
    expect(t.sinceStart!.avgPerWeek!).toBeCloseTo(0.21, 2)
  })
  it('sinceStart is null without a phase or with <2 in-phase weigh-ins', () => {
    expect(computeBodyTrend(weights(0.25), null, TODAY).sinceStart).toBeNull()
    const future: TrainingPhase = { phase: 'bulk', started_on: '2026-07-08', target_rate_kg_per_week: null }
    expect(computeBodyTrend(weights(0.25), future, TODAY).sinceStart).toBeNull()
  })
})

function set(logged_at: string, exercise: string, weight_kg: number, reps: number): StrengthLogRow {
  return { logged_at, exercise_name: exercise, weight_kg, reps }
}

describe('epley1RM', () => {
  it('single rep is the weight itself', () => expect(epley1RM(100, 1)).toBe(100))
  it('applies Epley above 1 rep', () => expect(epley1RM(100, 5)).toBeCloseTo(116.67, 1))
})

describe('computeStrengthTrends', () => {
  it('accumulates weekly tonnage in kg', () => {
    const t = computeStrengthTrends([
      set('2026-07-07T10:00:00Z', 'Squat', 100, 5),
      set('2026-07-07T10:05:00Z', 'Squat', 100, 5),
    ], TODAY)
    expect(t.weeklyTonnage).toHaveLength(1)
    expect(t.weeklyTonnage[0].week).toBe('2026-07-06')
    expect(t.weeklyTonnage[0].kg).toBe(1000)
  })
  it('excludes zero-weight and zero-rep sets', () => {
    const t = computeStrengthTrends([
      set('2026-07-07T10:00:00Z', 'Plank', 0, 1),
      set('2026-07-07T10:05:00Z', 'Squat', 100, 0),
    ], TODAY)
    expect(t.weeklyTonnage).toHaveLength(0)
    expect(t.exercises).toHaveLength(0)
  })
  it('keeps the best e1RM set per session', () => {
    const t = computeStrengthTrends([
      set('2026-07-07T10:00:00Z', 'Bench', 100, 5),
      set('2026-07-07T10:10:00Z', 'Bench', 105, 2),
    ], TODAY)
    expect(t.exercises[0].points).toHaveLength(1)
    expect(t.exercises[0].points[0].value).toBeCloseTo(116.7, 1)
  })
  it('rising e1RM over ≥3 sessions → strengthChip up', () => {
    const t = computeStrengthTrends([
      set('2026-06-22T10:00:00Z', 'Squat', 100, 5),
      set('2026-06-29T10:00:00Z', 'Squat', 102, 5),
      set('2026-07-06T10:00:00Z', 'Squat', 104, 5),
    ], TODAY)
    expect(t.exercises[0].slopePctPerWeek!).toBeGreaterThan(1)
    expect(t.strengthChip).toBe('up')
  })
  it('volumeChip compares last 3 complete weeks vs prior 3', () => {
    const logs = [
      set('2026-05-26T10:00:00Z', 'Squat', 100, 10),
      set('2026-06-02T10:00:00Z', 'Squat', 100, 10),
      set('2026-06-09T10:00:00Z', 'Squat', 100, 10),
      set('2026-06-16T10:00:00Z', 'Squat', 110, 10),
      set('2026-06-23T10:00:00Z', 'Squat', 110, 10),
      set('2026-06-30T10:00:00Z', 'Squat', 110, 10),
      set('2026-07-07T10:00:00Z', 'Squat', 200, 10), // current week — excluded
    ]
    expect(computeStrengthTrends(logs, TODAY).volumeChip).toBe('up')
  })
})

describe('computeLoadTrends', () => {
  it('splits training vs lifestyle minutes and counts training sessions only', () => {
    const t = computeLoadTrends([
      { start: '2026-07-07T10:00:00Z', category: 'training', minutes: 60 },
      { start: '2026-07-07T12:00:00Z', category: 'lifestyle', minutes: 17 },
    ], [])
    expect(t.weeks).toHaveLength(1)
    expect(t.weeks[0].trainingMin).toBe(60)
    expect(t.weeks[0].lifestyleMin).toBe(17)
    expect(t.weeks[0].sessions).toBe(1)
  })
  it('buckets Sunday vs Monday into different weeks', () => {
    const t = computeLoadTrends([
      { start: '2026-07-05T10:00:00Z', category: 'training', minutes: 30 },
      { start: '2026-07-06T10:00:00Z', category: 'training', minutes: 30 },
    ], [])
    expect(t.weeks.map((w) => w.week)).toEqual(['2026-06-29', '2026-07-06'])
  })
  it('sums weekly strain from daily metrics', () => {
    const t = computeLoadTrends([], [
      { date: '2026-07-06', strain: 10.5 },
      { date: '2026-07-07', strain: 14.2 },
    ])
    expect(t.weeks[0].strain).toBeCloseTo(24.7, 1)
  })
})

function fuelDay(date: string, kcal: number, protein: number, kcalTarget: number | null, proteinTarget: number | null, logged = true): FuelDay {
  return { date, kcal, protein, kcalTarget, proteinTarget, logged }
}

describe('computeFuelTrends', () => {
  it('kcal adherence is a ±10% window, protein is a floor', () => {
    const t = computeFuelTrends([
      fuelDay('2026-07-05', 2100, 150, 2000, 150),
      fuelDay('2026-07-06', 2500, 155, 2000, 150),
      fuelDay('2026-07-07', 1900, 100, 2000, 150),
    ], TODAY)
    expect(t.adherence.kcalWithin10Pct).toBe(67)
    expect(t.adherence.proteinHitPct).toBe(67)
  })

  it('loggedPct denominator is the calendar span, so gap days count against it', () => {
    const t = computeFuelTrends([
      fuelDay('2026-07-01', 2000, 150, 2000, 150),
      fuelDay('2026-07-08', 2000, 150, 2000, 150),
    ], TODAY)
    expect(t.adherence.totalDays).toBe(8)
    expect(t.adherence.loggedDays).toBe(2)
    expect(t.adherence.loggedPct).toBe(25)
  })

  it('energy balance: 21d averages and scale-implied kcal/day from the weight rate', () => {
    const t = computeFuelTrends([
      fuelDay('2026-07-06', 2400, 160, 2300, 160),
      fuelDay('2026-07-07', 2500, 160, 2300, 160),
    ], TODAY, { actualRatePerWeek: 0.11 })
    expect(t.energyBalance.avgKcal21d).toBe(2450)
    expect(t.energyBalance.avgDeltaVsTarget21d).toBe(150)
    expect(t.energyBalance.scaleImpliedKcalPerDay).toBe(121)
  })

  it('proteinPerKg divides the 7d protein average by current weight', () => {
    const t = computeFuelTrends([
      fuelDay('2026-06-20', 2300, 100, 2300, 160),
      fuelDay('2026-07-06', 2300, 150, 2300, 160),
      fuelDay('2026-07-08', 2300, 170, 2300, 160),
    ], TODAY, { latestWeightKg: 80 })
    expect(t.proteinPerKg).toBeCloseTo(2.0, 2)
  })

  it('returns nulls with no data', () => {
    const t = computeFuelTrends([], TODAY)
    expect(t.days).toHaveLength(0)
    expect(t.adherence.loggedPct).toBeNull()
    expect(t.energyBalance.avgKcal21d).toBeNull()
    expect(t.proteinPerKg).toBeNull()
  })
})
