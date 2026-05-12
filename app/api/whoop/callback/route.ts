import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const callbackUrl = new URL(request.url)
  const { searchParams } = callbackUrl
  const code = searchParams.get('code')
  const userId = searchParams.get('state')
  const appUrl = callbackUrl.origin

  try {
    if (!code || !userId) throw new Error('missing_params')

    const tokenRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.WHOOP_CLIENT_ID!,
        client_secret: process.env.WHOOP_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/whoop/callback`,
      }),
    })

    if (!tokenRes.ok) {
      const detail = await tokenRes.text()
      console.error('[whoop/callback] token exchange failed:', tokenRes.status, detail)
      throw new Error('token_exchange_failed')
    }

    const tokens = await tokenRes.json()

    const profileRes = await fetch('https://api.prod.whoop.com/developer/v2/user/profile/basic', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!profileRes.ok) {
      const detail = await profileRes.text()
      console.error('[whoop/callback] profile fetch failed:', profileRes.status, detail)
      throw new Error('profile_fetch_failed')
    }

    const profile = await profileRes.json()

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('user_profiles')
      .update({
        whoop_user_id: profile.user_id,
        whoop_access_token: tokens.access_token,
        whoop_refresh_token: tokens.refresh_token,
        whoop_token_expires: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        data_source: 'whoop',
      })
      .eq('id', userId)

    if (error) {
      console.error('[whoop/callback] profile update failed:', error)
      throw new Error('profile_update_failed')
    }

    return NextResponse.redirect(`${appUrl}/es/perfil?whoop=connected`)
  } catch (error) {
    console.error('[whoop/callback] failed:', error)
    return NextResponse.redirect(`${appUrl}/es/perfil?whoop=error`)
  }
}
