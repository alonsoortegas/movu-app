import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type BodyMeasurementInsert = Database['public']['Tables']['body_measurements']['Insert']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { muscle_mass_kg, fat_percentage, weight_kg } = body

  if (muscle_mass_kg === undefined || fat_percentage === undefined) {
    return NextResponse.json({ error: 'muscle_mass_kg and fat_percentage are required' }, { status: 400 })
  }

  const row: BodyMeasurementInsert = {
    user_id: user.id,
    muscle_mass_kg: Number(muscle_mass_kg),
    fat_percentage: Number(fat_percentage),
    measured_at: new Date().toISOString(),
  }

  if (weight_kg !== undefined && weight_kg !== null) {
    row.weight_kg = Number(weight_kg)
    row.fat_mass_kg = Number(weight_kg) * (Number(fat_percentage) / 100)
  }

  const { data: measurement, error } = await supabase
    .from('body_measurements')
    .insert(row)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ measurement }, { status: 201 })
}
