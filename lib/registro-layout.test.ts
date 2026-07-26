import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const registroSource = readFileSync(
  resolve(process.cwd(), 'app/[locale]/registro/page.tsx'),
  'utf8',
)

describe('registration page layout', () => {
  it('does not render or submit the standalone daily metrics card', () => {
    expect(registroSource).not.toContain('dailyLogTitle')
    expect(registroSource).not.toContain('handleDailySave')
    expect(registroSource).not.toContain('/api/daily-log')
  })
})
