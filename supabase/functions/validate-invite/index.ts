import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { code } = await req.json()

  if (!code) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'code_required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createAdminClient()
  const { data: invite } = await supabase
    .from('invite_codes')
    .select('active, uses_count, max_uses, expires_at')
    .eq('code', code)
    .single()

  if (!invite) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'not_found' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!invite.active) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'inactive' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (invite.uses_count >= invite.max_uses) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'used_up' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'expired' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ valid: true, code }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
