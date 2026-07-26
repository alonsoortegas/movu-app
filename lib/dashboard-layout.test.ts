import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const weekStripSource = readFileSync(
  resolve(process.cwd(), 'components/dashboard/WeekStrip.tsx'),
  'utf8',
)
const dashboardSource = readFileSync(
  resolve(process.cwd(), 'app/[locale]/dashboard/page.tsx'),
  'utf8',
)

describe('dashboard responsive layout', () => {
  it('waits for a wide desktop content area before showing three week cards', () => {
    expect(weekStripSource).toContain('sm:grid-cols-2 xl:grid-cols-3')
    expect(weekStripSource).not.toContain('md:grid-cols-3')
  })

  it('does not show a disclosure arrow on non-interactive recent workout rows', () => {
    expect(dashboardSource).not.toContain(
      '<span className="data text-sm text-muted">→</span>',
    )
  })
})
