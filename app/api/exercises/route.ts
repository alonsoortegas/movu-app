import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildCustomExerciseInsert, rankExercises } from '@/lib/workout/exercise-catalog'

const SUPPORTED_LOCALES = new Set(['es', 'en', 'de'])

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const localeParam = searchParams.get('locale') ?? 'es'
  const locale = SUPPORTED_LOCALES.has(localeParam) ? localeParam : 'es'
  const { data, error } = await supabase
    .from('exercise_catalog')
    .select('id, user_id, name_es, name_en, name_de, primary_muscle_group, secondary_muscle_groups, workout_types, default_tracking')
    .eq('active', true)
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ranked = rankExercises(
    (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row[`name_${locale}` as 'name_es' | 'name_en' | 'name_de'],
      primaryMuscleGroup: row.primary_muscle_group,
      secondaryMuscleGroups: row.secondary_muscle_groups,
      workoutTypes: row.workout_types,
      defaultTracking: row.default_tracking,
    })),
    {
      query: searchParams.get('q') ?? '',
      workoutType: searchParams.get('workout_type') ?? undefined,
      muscleGroup: searchParams.get('muscle_group') ?? undefined,
      limit: 20,
    },
  )

  return NextResponse.json({ exercises: ranked })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const insert = buildCustomExerciseInsert(user.id, await request.json())
    const { data: exercise, error } = await supabase
      .from('exercise_catalog')
      .insert(insert)
      .select()
      .single()

    if (error?.code === '23505') {
      return NextResponse.json({ error: 'An exercise with this name already exists' }, { status: 409 })
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ exercise }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid exercise' },
      { status: 400 },
    )
  }
}
