import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('whoop_user_id, whoop_access_token, whoop_refresh_token, whoop_token_expires, data_source')
    .eq('id', user.id)
    .single()

  const connected = !!profile?.whoop_user_id && !!profile?.whoop_access_token
  const tokenExpired = profile?.whoop_token_expires
    ? new Date(profile.whoop_token_expires) < new Date()
    : true
  const reauth_required = connected && tokenExpired && !profile?.whoop_refresh_token

  return NextResponse.json({
    connected,
    reauth_required,
    data_source: profile?.data_source ?? null,
  })
}
