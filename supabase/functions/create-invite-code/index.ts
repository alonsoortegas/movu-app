import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Verify caller is an admin via service role header
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders })
  }

  const { code, max_uses = 1, note, expires_at } = await req.json()
  if (!code) {
    return new Response(
      JSON.stringify({ error: 'code is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('invite_codes')
    .insert({ code, max_uses, note, expires_at: expires_at ?? null })
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ invite: data }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
