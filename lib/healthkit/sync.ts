import { Capacitor } from '@capacitor/core'
import { MovuHealthKit } from '@/lib/healthkit/plugin'

const ENABLED_KEY = 'movu_hk_enabled'
const LAST_ATTEMPT_KEY = 'movu_hk_last_attempt_at'
const ONE_HOUR_MS = 60 * 60 * 1000
const TWO_DAYS_MS = 48 * 60 * 60 * 1000
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000
const CHUNK_MS = 7 * 24 * 60 * 60 * 1000
export const HEALTHKIT_SYNC_PROGRESS_EVENT = 'movu:healthkit-sync-progress'

export type HealthKitSyncSkippedReason = 'not_native_ios' | 'not_enabled' | 'throttled'
export type HealthKitSyncStage = 'checking' | 'reading' | 'uploading' | 'complete' | 'error'
export type HealthKitSyncProgress = {
  stage: HealthKitSyncStage
  progress: number
}

type HealthKitSyncOptions = {
  force?: boolean
  onProgress?: (progress: HealthKitSyncProgress) => void
}

export type HealthKitSyncResult =
  | {
      synced: {
        activities: number
        sleep: number
        daily_metrics: number
        weight_samples: number
      }
      lastSyncAt: string
    }
  | { skipped: true; reason: HealthKitSyncSkippedReason }

type SyncStatusResponse = {
  lastSyncAt: string | null
  dataSource: string | null
}

type SyncedCounts = {
  activities: number
  sleep: number
  daily_metrics: number
  weight_samples: number
}

function hasStorage(): boolean {
  return typeof globalThis.localStorage !== 'undefined'
}

function isNativeIos(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

function emitProgress(progress: HealthKitSyncProgress, onProgress?: (progress: HealthKitSyncProgress) => void): void {
  onProgress?.(progress)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<HealthKitSyncProgress>(HEALTHKIT_SYNC_PROGRESS_EVENT, { detail: progress }))
  }
}

function chunkWindows(startTime: number, endTime: number): Array<{ startDate: string; endDate: string }> {
  const chunks: Array<{ startDate: string; endDate: string }> = []
  for (let cursor = startTime; cursor < endTime; cursor += CHUNK_MS) {
    chunks.push({
      startDate: new Date(cursor).toISOString(),
      endDate: new Date(Math.min(cursor + CHUNK_MS, endTime)).toISOString(),
    })
  }
  return chunks
}

function addCounts(total: SyncedCounts, next?: Partial<SyncedCounts>): SyncedCounts {
  return {
    activities: total.activities + (next?.activities ?? 0),
    sleep: total.sleep + (next?.sleep ?? 0),
    daily_metrics: total.daily_metrics + (next?.daily_metrics ?? 0),
    weight_samples: total.weight_samples + (next?.weight_samples ?? 0),
  }
}

export function isHealthKitEnabled(): boolean {
  return hasStorage() && globalThis.localStorage.getItem(ENABLED_KEY) === '1'
}

export function setHealthKitEnabled(enabled: boolean): void {
  if (!hasStorage()) return
  if (enabled) {
    globalThis.localStorage.setItem(ENABLED_KEY, '1')
  } else {
    globalThis.localStorage.removeItem(ENABLED_KEY)
  }
}

export async function runHealthKitSync({ force = false, onProgress }: HealthKitSyncOptions = {}): Promise<HealthKitSyncResult> {
  if (!isNativeIos()) return { skipped: true, reason: 'not_native_ios' }
  if (!isHealthKitEnabled()) return { skipped: true, reason: 'not_enabled' }

  const now = new Date()
  const endDate = now.toISOString()

  if (!force && hasStorage()) {
    const lastAttempt = Number(globalThis.localStorage.getItem(LAST_ATTEMPT_KEY) ?? 0)
    if (Number.isFinite(lastAttempt) && now.getTime() - lastAttempt < ONE_HOUR_MS) {
      return { skipped: true, reason: 'throttled' }
    }
  }

  if (hasStorage()) {
    globalThis.localStorage.setItem(LAST_ATTEMPT_KEY, String(now.getTime()))
  }

  try {
    emitProgress({ stage: 'checking', progress: 15 }, onProgress)
    const statusRes = await fetch('/api/healthkit/sync')
    const status = await statusRes.json().catch(() => ({})) as Partial<SyncStatusResponse> & { error?: string }
    if (!statusRes.ok) throw new Error(status.error ?? 'HealthKit sync status failed')

    const lastSyncTime = status.lastSyncAt ? Date.parse(status.lastSyncAt) : NaN
    const startTime = Number.isFinite(lastSyncTime)
      ? lastSyncTime - TWO_DAYS_MS
      : now.getTime() - NINETY_DAYS_MS
    const chunks = chunkWindows(startTime, now.getTime())
    let totals: SyncedCounts = { activities: 0, sleep: 0, daily_metrics: 0, weight_samples: 0 }
    let lastSyncAt = endDate

    for (const [index, chunk] of chunks.entries()) {
      const baseProgress = 15 + Math.round((index / chunks.length) * 80)
      emitProgress({ stage: 'reading', progress: Math.min(baseProgress + 5, 90) }, onProgress)
      const payload = await MovuHealthKit.queryHealthData(chunk)
      emitProgress({ stage: 'uploading', progress: Math.min(baseProgress + 10, 94) }, onProgress)
      const syncRes = await fetch('/api/healthkit/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, syncedThrough: chunk.endDate }),
      })
      const result = await syncRes.json().catch(() => ({})) as HealthKitSyncResult & { error?: string }
      if (!syncRes.ok) throw new Error(result.error ?? 'HealthKit sync failed')
      if (!('skipped' in result)) {
        totals = addCounts(totals, result.synced)
        lastSyncAt = result.lastSyncAt
      }
    }

    emitProgress({ stage: 'complete', progress: 100 }, onProgress)
    return { synced: totals, lastSyncAt }
  } catch (err) {
    emitProgress({ stage: 'error', progress: 100 }, onProgress)
    throw err
  }
}
