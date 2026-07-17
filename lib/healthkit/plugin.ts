import { registerPlugin } from '@capacitor/core'
import type { HKDailyRecord, HKSleepRecord, HKWorkout } from '@/lib/apple-health/parser'

export interface HealthKitQueryResult {
  workouts: HKWorkout[]
  sleepRecords: HKSleepRecord[]
  dailySummaries: Record<string, HKDailyRecord>
  weightSamples: { date: string; weightKg: number }[]
}

export interface MovuHealthKitPlugin {
  isAvailable(): Promise<{ available: boolean }>
  requestAuthorization(): Promise<{ requested: boolean }>
  queryHealthData(opts: { startDate: string; endDate: string }): Promise<HealthKitQueryResult>
}

export const MovuHealthKit = registerPlugin<MovuHealthKitPlugin>('MovuHealthKit')
