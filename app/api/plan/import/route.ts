import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseImportedPlanJson, toImportRpcPayload } from '@/lib/workout/plan-import'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const result = parseImportedPlanJson(
    typeof body?.json === 'string' ? body.json : '',
  )
  if (!result.ok) {
    return NextResponse.json(
      { error: 'Invalid plan', issues: result.issues },
      { status: 400 },
    )
  }

  const { data: planId, error } = await supabase.rpc('import_workout_plan', {
    p_plan: toImportRpcPayload(result.plan),
  })
  if (error) {
    console.error('Workout plan import failed', {
      code: error.code,
      message: error.message,
    })
    return NextResponse.json({ error: 'Plan import failed' }, { status: 500 })
  }

  return NextResponse.json({ planId }, { status: 201 })
}
