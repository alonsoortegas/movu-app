import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const params = new URLSearchParams({
    client_id: process.env.WHOOP_CLIENT_ID!,
    redirect_uri: `${appUrl}/api/whoop/callback`,
    response_type: 'code',
    scope: 'offline read:recovery read:sleep read:workout read:cycles read:body_measurement read:profile',
    state: user.id,
  })

  return NextResponse.redirect(`https://api.prod.whoop.com/oauth/oauth2/auth?${params}`)
}
