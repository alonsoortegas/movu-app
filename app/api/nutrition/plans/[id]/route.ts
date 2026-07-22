import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: plan } = await supabase
    .from('nutrition_plans')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const { data, error } = await supabase.storage
    .from('nutrition-plans')
    .createSignedUrl(plan.storage_path, 600)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan, signedUrl: data.signedUrl, expiresIn: 600 })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: plan, error } = await supabase
    .from('nutrition_plans')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  return NextResponse.json({ plan })
}
