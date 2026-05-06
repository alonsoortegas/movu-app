import { createAdminClient } from '@/lib/supabase/admin'

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'
const WHOOP_API_URL = 'https://api.prod.whoop.com/developer/v2'

export async function getValidWhoopToken(userId: string): Promise<string> {
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('whoop_access_token, whoop_refresh_token, whoop_token_expires')
    .eq('id', userId)
    .single()

  if (!profile?.whoop_access_token) throw new Error('whoop_not_connected')

  const expiresAt = profile.whoop_token_expires
    ? new Date(profile.whoop_token_expires)
    : new Date(0)

  if (expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
    return profile.whoop_access_token
  }

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
      refresh_token: profile.whoop_refresh_token ?? '',
    }),
  })

  if (res.status === 401) throw new Error('whoop_reauth_required')

  const tokens = await res.json()

  if (!res.ok || tokens.error === 'invalid_grant') {
    throw new Error('whoop_reauth_required')
  }

  await supabase
    .from('user_profiles')
    .update({
      whoop_access_token: tokens.access_token,
      whoop_refresh_token: tokens.refresh_token,
      whoop_token_expires: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq('id', userId)

  return tokens.access_token
}

export async function whoopGet(token: string, path: string): Promise<unknown> {
  const res = await fetch(`${WHOOP_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`WHOOP API error: ${res.status}`)
  return res.json()
}
