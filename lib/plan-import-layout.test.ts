import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const wizardPath = resolve(process.cwd(), 'components/plan/PlanImportWizard.tsx')
const wizardSource = existsSync(wizardPath) ? readFileSync(wizardPath, 'utf8') : ''
const planViewSource = readFileSync(
  resolve(process.cwd(), 'components/plan/PlanWeekView.tsx'),
  'utf8',
)
const loggerSource = readFileSync(
  resolve(process.cwd(), 'components/workout/PerformedWorkoutLogger.tsx'),
  'utf8',
)

describe('external plan workflow layout', () => {
  it('implements prepare, copy, paste, and review without opening or calling an LLM', () => {
    expect(wizardSource).toContain("'prepare' | 'copy' | 'paste' | 'review'")
    expect(wizardSource).toContain('navigator.clipboard.writeText')
    expect(wizardSource).toContain('parseImportedPlanJson')
    expect(wizardSource).toContain("fetch('/api/plan/import'")
    expect(wizardSource).toContain('accept="application/json,.json"')
    expect(wizardSource).not.toContain('ANTHROPIC_API_KEY')
    expect(wizardSource).not.toContain('window.open(')
  })

  it('labels suggested and performed weight independently', () => {
    expect(planViewSource).toContain("t('logger.suggestedWeight'")
    expect(loggerSource).toContain("t('suggestedWeight'")
    expect(loggerSource).toContain("t('performedWeight')")
  })
})
