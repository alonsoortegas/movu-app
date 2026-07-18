import { describe, expect, it } from 'vitest'
import de from '@/messages/de.json'
import en from '@/messages/en.json'
import es from '@/messages/es.json'

describe('navigation copy', () => {
  it.each([
    ['es', es, 'Registrar entrenamiento'],
    ['en', en, 'Log workout'],
    ['de', de, 'Training erfassen'],
  ] as const)('uses Plan as a destination and exposes the registration action in %s', (_, messages, action) => {
    expect(messages.sidebar.nav.plan).toBe('Plan')
    expect(messages.bottomNav.plan).toBe('Plan')
    expect(messages.plan.registerWorkout).toBe(action)
  })
})
