const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? '').split(',').filter(Boolean)

export function isAdmin(userId: string): boolean {
  return ADMIN_IDS.includes(userId)
}
