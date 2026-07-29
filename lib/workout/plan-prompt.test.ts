import { describe, expect, it } from 'vitest'
import { buildPlanPrompt } from './plan-prompt'

const brief = {
  goal: 'HYROX Acapulco',
  event_date: '2026-08-29',
  available_days: ['monday', 'wednesday', 'friday', 'sunday'] as const,
  session_duration_min: 60,
  training_level: 'intermediate' as const,
  equipment: 'Full gym and sled',
  limitations: 'None reported',
  current_performance: '5 km in 25 minutes',
}

describe('buildPlanPrompt', () => {
  it('includes reviewed context, rules, schema version, and a JSON example', () => {
    const prompt = buildPlanPrompt(brief, {
      includeWeight: true,
      weightKg: 72,
      includeSex: false,
      sex: 'male',
    })

    expect(prompt).toContain('HYROX Acapulco')
    expect(prompt).toContain('2026-08-29')
    expect(prompt).toContain('"schema_version": "1.0"')
    expect(prompt).toContain('Return JSON only')
    expect(prompt).toContain('72 kg')
    expect(prompt).not.toContain('male')
  })

  it('omits every optional profile value that was not approved', () => {
    const prompt = buildPlanPrompt(brief, {
      includeWeight: false,
      weightKg: 72,
      includeSex: false,
      sex: 'female',
    })
    expect(prompt).not.toContain('72 kg')
    expect(prompt).not.toContain('female')
  })
})
