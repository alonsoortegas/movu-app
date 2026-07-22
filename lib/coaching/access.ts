export type CoachAccessStatus = 'pending' | 'active' | 'revoked'

export interface CoachAccessRelationship {
  coachId: string
  clientId: string
  coachRole: string
  status: CoachAccessStatus
}

export function normalizeCoachInviteEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid coach email')
  }
  return email
}

export function canCoachReadClient(
  coachId: string,
  clientId: string,
  relationship: CoachAccessRelationship | null,
): boolean {
  return Boolean(
    relationship &&
      relationship.coachId === coachId &&
      relationship.clientId === clientId &&
      relationship.coachRole === 'coach' &&
      relationship.status === 'active',
  )
}
