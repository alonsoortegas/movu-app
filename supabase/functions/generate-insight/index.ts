import { createAdminClient } from '../_shared/supabase-admin.ts'

const SYSTEM_PROMPT = `Eres un coach profesional de resistencia y fuerza para atletas de fitness boutique en Ciudad de México.
Analiza los últimos 7 días de datos de entrenamiento del atleta y genera un resumen semanal de coaching conciso.

Formato de salida (usa exactamente estas secciones en markdown):
## Semana en números
Una oración con estadísticas clave: tiempo total, distribución de zonas, sueño promedio.

## Lo que hiciste bien
2-3 puntos específicos. Referencia sesiones y métricas reales.

## Ajustes para esta semana
2-3 puntos accionables, basados en los datos.

## Carga y recuperación
Una oración sobre la tendencia de carga de entrenamiento y estado de recuperación.
Un párrafo corto con la recomendación principal para la semana que viene.

Reglas:
- Escribe en español
- Sé directo y basado en datos; sin frases genéricas
- Si faltan datos de sueño, menciónalo y pídelos
- Si faltan RPE de sesiones, menciónalo brevemente
- Respuesta total de menos de 400 palabras`

Deno.serve(async (req) => {
  const { user_id, trigger } = await req.json()
  const supabase = createAdminClient()

  const userIds: string[] = []

  if (user_id) {
    userIds.push(user_id)
  } else if (trigger === 'cron') {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('onboarding_complete', true)
    profiles?.forEach(p => userIds.push(p.id))
  }

  const now = new Date()
  const periodEnd = now.toISOString().split('T')[0]
  const periodStart = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]

  const results = await Promise.allSettled(
    userIds.map(uid => generateForUser(supabase, uid, periodStart, periodEnd))
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  return new Response(
    JSON.stringify({ processed: userIds.length, succeeded }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

async function generateForUser(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  periodStart: string,
  periodEnd: string
) {
  const [{ data: profile }, { data: activities }, { data: sleep }, { data: bodyComp }] =
    await Promise.all([
      supabase
        .from('user_profiles')
        .select('goal, max_hr_bpm, weight_kg')
        .eq('id', userId)
        .single(),
      supabase
        .from('activities')
        .select('activity_category, activity_name, moving_time_s, avg_hr_bpm, hr_zones, rpe, start_date_local')
        .eq('user_id', userId)
        .gte('start_date_utc', `${periodStart}T00:00:00Z`)
        .lte('start_date_utc', `${periodEnd}T23:59:59Z`),
      supabase
        .from('sleep_logs')
        .select('date, hours, quality')
        .eq('user_id', userId)
        .gte('date', periodStart)
        .lte('date', periodEnd),
      supabase
        .from('body_measurements')
        .select('weight_kg, muscle_mass_kg, fat_percentage, measured_at')
        .eq('user_id', userId)
        .order('measured_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const context = { profile, activities, sleep, bodyComp }

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Datos del atleta:\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nGenera el resumen semanal de coaching.`,
      }],
    }),
  })

  const claudeData = await claudeRes.json()
  const content = claudeData.content?.[0]?.text
  if (!content) throw new Error('No content from Claude')

  await supabase.from('insights').insert({
    user_id: userId,
    period_start: periodStart,
    period_end: periodEnd,
    type: 'weekly_summary',
    content,
    model_used: 'claude-sonnet-4-20250514',
  })
}
