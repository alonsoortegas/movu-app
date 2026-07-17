import * as fs from 'fs'
import * as readline from 'readline'

export interface HKWorkout {
  activityType: string
  startDate: string        // ISO 8601
  endDate: string          // ISO 8601
  duration: number         // minutes
  totalEnergyBurned?: number  // kcal — from WorkoutStatistics ActiveEnergyBurned
  totalDistance?: number      // metres — from WorkoutStatistics Distance*
  sourceName: string
}

export interface HKSleepRecord {
  value: string    // e.g. "HKCategoryValueSleepAnalysisAsleepREM"
  startDate: string
  endDate: string
}

export interface HKDailyRecord {
  date: string                // YYYY-MM-DD
  restingHeartRate?: number   // bpm
  hrv?: number                // ms SDNN
  respiratoryRate?: number    // breaths/min — last value seen for the day
  activeEnergyKcal?: number   // sum
  basalEnergyKcal?: number    // sum
  exerciseMinutes?: number    // sum
  vo2Max?: number             // mL/kg/min — last value seen for the day
  physicalEffort?: number     // MET — daily average
  steps?: number              // daily sum
}

export interface AppleHealthExport {
  workouts: HKWorkout[]
  sleepRecords: HKSleepRecord[]
  dailySummaries: Map<string, HKDailyRecord>
}

// Apple Health exports dates as "YYYY-MM-DD HH:MM:SS ±HHMM"; convert to ISO 8601.
function toIso(appleDate: string): string {
  const m = appleDate.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/)
  if (!m) return appleDate
  return `${m[1]}T${m[2]}${m[3]}${m[4]}:${m[5]}`
}

function localDate(iso: string): string {
  return iso.slice(0, 10)
}

function attr(line: string, name: string): string | undefined {
  const re = new RegExp(`${name}="([^"]*)"`)
  const m = line.match(re)
  return m ? m[1] : undefined
}

function getOrCreate(map: Map<string, HKDailyRecord>, date: string): HKDailyRecord {
  let rec = map.get(date)
  if (!rec) {
    rec = { date }
    map.set(date, rec)
  }
  return rec
}

type ParserState = 'root' | 'workout'

export async function parseAppleHealthExport(filePath: string): Promise<AppleHealthExport> {
  const workouts: HKWorkout[] = []
  const sleepRecords: HKSleepRecord[] = []
  const dailySummaries = new Map<string, HKDailyRecord>()

  // Physical effort requires a running sum+count to produce a daily average.
  const effortSum = new Map<string, number>()
  const effortCount = new Map<string, number>()

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  })

  let state: ParserState = 'root'
  let currentWorkout: Partial<HKWorkout> | null = null

  for await (const line of rl) {
    const t = line.trim()

    // ── <Workout …> ──────────────────────────────────────────────────────────
    if (t.startsWith('<Workout ')) {
      const activityType = attr(t, 'workoutActivityType')
      const startRaw = attr(t, 'startDate')
      const endRaw = attr(t, 'endDate')
      const durationStr = attr(t, 'duration')
      const sourceName = attr(t, 'sourceName')

      if (activityType && startRaw && endRaw && durationStr && sourceName) {
        currentWorkout = {
          activityType,
          startDate: toIso(startRaw),
          endDate: toIso(endRaw),
          duration: parseFloat(durationStr),
          sourceName,
        }
        state = t.endsWith('/>') ? 'root' : 'workout'
        if (t.endsWith('/>')) {
          workouts.push(currentWorkout as HKWorkout)
          currentWorkout = null
        }
      }
      continue
    }

    // ── Inside <Workout>: accumulate WorkoutStatistics ────────────────────────
    if (state === 'workout' && currentWorkout) {
      if (t.startsWith('<WorkoutStatistics ')) {
        const type = attr(t, 'type')
        const sumStr = attr(t, 'sum')
        const unit = attr(t, 'unit')
        if (type && sumStr) {
          const value = parseFloat(sumStr)
          if (type === 'HKQuantityTypeIdentifierActiveEnergyBurned') {
            currentWorkout.totalEnergyBurned = (currentWorkout.totalEnergyBurned ?? 0) + value
          } else if (
            type === 'HKQuantityTypeIdentifierDistanceCycling' ||
            type === 'HKQuantityTypeIdentifierDistanceWalkingRunning' ||
            type === 'HKQuantityTypeIdentifierDistanceSwimming'
          ) {
            const metres = unit === 'km' ? value * 1000 : value
            currentWorkout.totalDistance = (currentWorkout.totalDistance ?? 0) + metres
          }
        }
        continue
      }

      if (t === '</Workout>') {
        workouts.push(currentWorkout as HKWorkout)
        currentWorkout = null
        state = 'root'
      }
      continue
    }

    // ── <Record …/> ──────────────────────────────────────────────────────────
    if (t.startsWith('<Record ')) {
      const type = attr(t, 'type')
      if (!type) continue

      if (type === 'HKCategoryTypeIdentifierSleepAnalysis') {
        const value = attr(t, 'value')
        const startRaw = attr(t, 'startDate')
        const endRaw = attr(t, 'endDate')
        if (value && startRaw && endRaw) {
          sleepRecords.push({ value, startDate: toIso(startRaw), endDate: toIso(endRaw) })
        }
        continue
      }

      const startRaw = attr(t, 'startDate')
      const valueStr = attr(t, 'value')
      if (!startRaw || !valueStr) continue
      const value = parseFloat(valueStr)
      if (isNaN(value)) continue

      const dateKey = localDate(toIso(startRaw))
      const day = getOrCreate(dailySummaries, dateKey)

      switch (type) {
        case 'HKQuantityTypeIdentifierRestingHeartRate':
          day.restingHeartRate = value
          break
        case 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN':
          day.hrv = value
          break
        case 'HKQuantityTypeIdentifierRespiratoryRate':
          day.respiratoryRate = value
          break
        case 'HKQuantityTypeIdentifierActiveEnergyBurned':
          day.activeEnergyKcal = (day.activeEnergyKcal ?? 0) + value
          break
        case 'HKQuantityTypeIdentifierBasalEnergyBurned':
          day.basalEnergyKcal = (day.basalEnergyKcal ?? 0) + value
          break
        case 'HKQuantityTypeIdentifierAppleExerciseTime':
          day.exerciseMinutes = (day.exerciseMinutes ?? 0) + value
          break
        case 'HKQuantityTypeIdentifierVO2Max':
          day.vo2Max = value
          break
        case 'HKQuantityTypeIdentifierPhysicalEffort':
          effortSum.set(dateKey, (effortSum.get(dateKey) ?? 0) + value)
          effortCount.set(dateKey, (effortCount.get(dateKey) ?? 0) + 1)
          break
      }
    }
  }

  for (const [dateKey, sum] of effortSum) {
    const count = effortCount.get(dateKey) ?? 1
    const day = dailySummaries.get(dateKey)
    if (day) day.physicalEffort = sum / count
  }

  return { workouts, sleepRecords, dailySummaries }
}
