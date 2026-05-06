import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { code } = await request.json()

  if (!code) {
    return NextResponse.json({ valid: false, reason: 'code_required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: invite } = await supabase
    .from('invite_codes')
    .select('active, uses_count, max_uses, expires_at')
    .eq('code', code.trim().toUpperCase())
    .single()

  if (!invite) return NextResponse.json({ valid: false, reason: 'not_found' })

  if (!invite.active) return NextResponse.json({ valid: false, reason: 'inactive' })

  if (invite.uses_count >= invite.max_uses) return NextResponse.json({ valid: false, reason: 'used_up' })

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'expired' })
  }

  return NextResponse.json({ valid: true })
}
