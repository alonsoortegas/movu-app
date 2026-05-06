import { createAdminClient } from '../_shared/supabase-admin.ts'

const restrictedCorsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? 'https://movu.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: restrictedCorsHeaders })

  const authHeader = req.headers.get('Authorization')
  const expectedSecret = Deno.env.get('FUNCTION_SECRET')
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new Response('Unauthorized', { status: 401, headers: restrictedCorsHeaders })
  }

  const { code, max_uses = 1, note, expires_at } = await req.json()
  if (!code) {
    return new Response(
      JSON.stringify({ error: 'code is required' }),
      { status: 400, headers: { ...restrictedCorsHeaders, 'Content-Type': 'application/json' } }
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
      { status: 500, headers: { ...restrictedCorsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ invite: data }),
    { status: 201, headers: { ...restrictedCorsHeaders, 'Content-Type': 'application/json' } }
  )
})
