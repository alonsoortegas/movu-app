import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'
import { calculateFatMassKg } from '@/lib/body-composition'

type BodyMeasurementInsert = Database['public']['Tables']['body_measurements']['Insert']

const NUMERIC_FIELDS = [
  'weight_kg',
  'muscle_mass_kg',
  'fat_percentage',
  'visceral_fat_level',
  'bmr_kcal',
  'phase_angle',
  'total_body_water_l',
  'protein_kg',
  'mineral_kg',
  'waist_hip_ratio',
  'muscle_left_arm',
  'muscle_right_arm',
  'muscle_left_leg',
  'muscle_right_leg',
  'muscle_trunk',
] as const

type NumericField = (typeof NUMERIC_FIELDS)[number]

function numberOrNull(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: measurements, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', user.id)
    .order('measured_at', { ascending: false })
    .limit(8)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    measurements: measurements ?? [],
    latest: measurements?.[0] ?? null,
    previous: measurements?.[1] ?? null,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const measuredAt = typeof body.measured_at === 'string' && body.measured_at
    ? body.measured_at
    : new Date().toISOString().slice(0, 10)

  const row: BodyMeasurementInsert = {
    user_id: user.id,
    measured_at: measuredAt,
  }

  let hasMeasurement = false
  for (const field of NUMERIC_FIELDS) {
    const value = numberOrNull(body[field])
    if (value !== null) {
      row[field as NumericField] = value
      hasMeasurement = true
    }
  }

  if (!hasMeasurement) {
    return NextResponse.json({ error: 'At least one body measurement is required' }, { status: 400 })
  }

  row.fat_mass_kg = calculateFatMassKg(row.weight_kg, row.fat_percentage)

  if (typeof body.notes === 'string' && body.notes.trim()) row.notes = body.notes.trim()

  const { data: measurement, error } = await supabase
    .from('body_measurements')
    .insert(row)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ measurement }, { status: 201 })
}
