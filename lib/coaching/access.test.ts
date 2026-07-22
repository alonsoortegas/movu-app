import { describe, expect, it } from 'vitest'
import { canCoachReadClient, normalizeCoachInviteEmail } from './access'

describe('normalizeCoachInviteEmail', () => {
  it('normalizes whitespace and casing', () => {
    expect(normalizeCoachInviteEmail('  Sebas@Movu.MX ')).toBe('sebas@movu.mx')
  })

  it('rejects malformed email input', () => {
    expect(() => normalizeCoachInviteEmail('sebas')).toThrow('Enter a valid coach email')
  })
})

describe('canCoachReadClient', () => {
  const relationship = {
    coachId: 'coach-1',
    clientId: 'client-1',
    coachRole: 'coach',
    status: 'active',
  } as const

  it('allows the assigned coach to read an active client grant', () => {
    expect(canCoachReadClient('coach-1', 'client-1', relationship)).toBe(true)
  })

  it('rejects pending and revoked grants', () => {
    expect(canCoachReadClient('coach-1', 'client-1', { ...relationship, status: 'pending' })).toBe(false)
    expect(canCoachReadClient('coach-1', 'client-1', { ...relationship, status: 'revoked' })).toBe(false)
  })

  it('rejects unrelated users and non-coach accounts', () => {
    expect(canCoachReadClient('coach-2', 'client-1', relationship)).toBe(false)
    expect(canCoachReadClient('coach-1', 'client-2', relationship)).toBe(false)
    expect(canCoachReadClient('coach-1', 'client-1', { ...relationship, coachRole: 'member' })).toBe(false)
  })
})
