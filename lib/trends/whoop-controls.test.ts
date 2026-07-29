import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const trendsPage = readFileSync(
  resolve(process.cwd(), 'app/[locale]/trends/page.tsx'),
  'utf8',
)

describe('Trends WHOOP controls', () => {
  it('does not show connection or sync controls in Trends', () => {
    expect(trendsPage).not.toContain('WhoopStatus')
    expect(trendsPage).not.toContain('whoop_access_token')
    expect(trendsPage).not.toContain("t('syncCta')")
    expect(existsSync(resolve(process.cwd(), 'components/trends/WhoopStatus.tsx'))).toBe(false)
  })

  it('keeps imported activity data available to trend calculations', () => {
    expect(trendsPage).toContain("supabase.from('activities')")
    expect(trendsPage).toContain("supabase.from('sleep_logs')")
    expect(trendsPage).toContain("supabase.from('daily_metrics')")
  })
})
