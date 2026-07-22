import { notFound, redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import PerformedWorkoutLogger from '@/components/workout/PerformedWorkoutLogger'

export default async function PerformedWorkoutPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/${locale}/registro/${id}`)

  const [{ data: workout }, { data: exercises }, { data: logs }] = await Promise.all([
    supabase
      .from('performed_workouts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('performed_workout_exercises')
      .select('*')
      .eq('performed_workout_id', id)
      .eq('user_id', user.id)
      .order('order_index'),
    supabase
      .from('workout_set_logs')
      .select('*')
      .eq('performed_workout_id', id)
      .eq('user_id', user.id)
      .order('logged_at'),
  ])

  if (!workout) notFound()
  const exerciseRows = exercises ?? []
  const exerciseNames = exerciseRows.map((exercise) => exercise.exercise_name)
  const { data: historyLogs } = exerciseNames.length
    ? await supabase
        .from('workout_set_logs')
        .select('*')
        .eq('user_id', user.id)
        .in('exercise_name', exerciseNames)
        .neq('performed_workout_id', id)
        .order('logged_at', { ascending: false })
        .limit(100)
    : { data: [] }

  return (
    <div className="boot mx-auto max-w-3xl p-4 pb-28 md:p-8">
      <PerformedWorkoutLogger
        initialWorkout={workout}
        initialExercises={exerciseRows}
        initialLogs={logs ?? []}
        historyLogs={historyLogs ?? []}
      />
    </div>
  )
}
