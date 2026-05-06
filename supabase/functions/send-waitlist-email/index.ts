import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { email, name, position } = await req.json()
  const resendKey = Deno.env.get('RESEND_API_KEY')

  if (!resendKey) {
    // Resend not configured yet — log and return success so callers aren't blocked
    console.log(`[send-waitlist-email] Resend not configured. Would send to ${email}`)
    return new Response(JSON.stringify({ sent: false, reason: 'resend_not_configured' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'hola@movu.app',
      to: email,
      subject: 'Estás en la lista — Movu',
      html: `
        <h2>Hola ${name}, ¡ya estás en la lista! 🏃</h2>
        <p>Eres el número <strong>#${position}</strong> en la lista de espera de Movu.</p>
        <p>Movu está en beta cerrada en CDMX. Te avisaremos en cuanto haya un lugar disponible.</p>
        <p>— El equipo de Movu</p>
      `,
    }),
  })

  return new Response(
    JSON.stringify({ sent: res.ok }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
