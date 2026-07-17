import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const capacitorState = vi.hoisted(() => ({
  native: true,
  platform: 'ios',
}))

const healthKitState = vi.hoisted(() => ({
  queryHealthData: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => capacitorState.native,
    getPlatform: () => capacitorState.platform,
  },
}))

vi.mock('@/lib/healthkit/plugin', () => ({
  MovuHealthKit: {
    queryHealthData: healthKitState.queryHealthData,
  },
}))

function createStorage() {
  const values = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key)
    }),
  }
}

describe('runHealthKitSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-04T12:00:00.000Z'))
    capacitorState.native = true
    capacitorState.platform = 'ios'
    healthKitState.queryHealthData.mockReset()
    vi.stubGlobal('localStorage', createStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('queries from lastSyncAt minus 48 hours and posts the native payload', async () => {
    const payload = {
      workouts: [
        {
          activityType: 'HKWorkoutActivityTypeRunning',
          startDate: '2026-07-04T07:30:00-06:00',
          endDate: '2026-07-04T08:10:00-06:00',
          duration: 40,
          sourceName: 'Apple Watch',
        },
      ],
      sleepRecords: [],
      dailySummaries: {
        '2026-07-04': { date: '2026-07-04', steps: 10432 },
      },
      weightSamples: [{ date: '2026-07-04', weightKg: 71.4 }],
    }
    healthKitState.queryHealthData.mockResolvedValue(payload)

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          lastSyncAt: '2026-07-04T09:00:00.000Z',
          dataSource: 'manual',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          synced: { activities: 1, sleep: 0, daily_metrics: 1, weight_samples: 1 },
          lastSyncAt: '2026-07-04T12:00:00.000Z',
        }),
      })
    vi.stubGlobal('fetch', fetchMock)
    localStorage.setItem('movu_hk_enabled', '1')

    const { runHealthKitSync } = await import('./sync')
    const result = await runHealthKitSync({ force: true })

    expect(healthKitState.queryHealthData).toHaveBeenCalledWith({
      startDate: '2026-07-02T09:00:00.000Z',
      endDate: '2026-07-04T12:00:00.000Z',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/healthkit/sync')
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/healthkit/sync',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, syncedThrough: '2026-07-04T12:00:00.000Z' }),
      }),
    )
    expect(result).toEqual({
      synced: { activities: 1, sleep: 0, daily_metrics: 1, weight_samples: 1 },
      lastSyncAt: '2026-07-04T12:00:00.000Z',
    })
  })

  it('skips when native HealthKit has not been enabled by the user', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { runHealthKitSync } = await import('./sync')
    const result = await runHealthKitSync()

    expect(result).toEqual({ skipped: true, reason: 'not_enabled' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(healthKitState.queryHealthData).not.toHaveBeenCalled()
  })

  it('reports visible progress stages while syncing', async () => {
    healthKitState.queryHealthData.mockResolvedValue({
      workouts: [],
      sleepRecords: [],
      dailySummaries: {},
      weightSamples: [],
    })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          lastSyncAt: '2026-07-04T09:00:00.000Z',
          dataSource: 'manual',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          synced: { activities: 0, sleep: 0, daily_metrics: 0, weight_samples: 0 },
          lastSyncAt: '2026-07-04T12:00:00.000Z',
        }),
      })
    vi.stubGlobal('fetch', fetchMock)
    localStorage.setItem('movu_hk_enabled', '1')
    const onProgress = vi.fn()

    const { runHealthKitSync } = await import('./sync')
    await runHealthKitSync({ force: true, onProgress })

    expect(onProgress.mock.calls.map(([progress]) => progress.stage)).toEqual([
      'checking',
      'reading',
      'uploading',
      'complete',
    ])
    expect(onProgress).toHaveBeenLastCalledWith({ stage: 'complete', progress: 100 })
  })

  it('splits first-time backfills into smaller HealthKit queries and uploads each chunk', async () => {
    healthKitState.queryHealthData.mockResolvedValue({
      workouts: [],
      sleepRecords: [],
      dailySummaries: {},
      weightSamples: [],
    })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lastSyncAt: null, dataSource: 'manual' }),
      })

    for (let i = 0; i < 13; i += 1) {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          synced: { activities: 1, sleep: 2, daily_metrics: 3, weight_samples: 4 },
          lastSyncAt: '2026-07-04T12:00:00.000Z',
        }),
      })
    }

    vi.stubGlobal('fetch', fetchMock)
    localStorage.setItem('movu_hk_enabled', '1')

    const { runHealthKitSync } = await import('./sync')
    const result = await runHealthKitSync({ force: true })

    expect(healthKitState.queryHealthData).toHaveBeenCalledTimes(13)
    expect(fetchMock).toHaveBeenCalledTimes(14)
    expect(result).toEqual({
      synced: { activities: 13, sleep: 26, daily_metrics: 39, weight_samples: 52 },
      lastSyncAt: '2026-07-04T12:00:00.000Z',
    })
  })
})
