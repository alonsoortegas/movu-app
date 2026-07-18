import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import MobilePageIntro from '@/components/mobile/MobilePageIntro'
import PlanWeekView from '@/components/plan/PlanWeekView'
import { getPlanWeek } from '@/lib/workout/logic'
import { dateKey, dayRangeUtc } from '@/lib/trends/compute'
import type { Database } from '@/types/database'

type SetLog = Database['public']['Tables']['workout_set_logs']['Row']

export default async function PlanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('plan')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/${locale}/plan`)

  const { data: plans } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', user!.id)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
  const plan = plans?.[0] ?? null

  const header = (
    <>
      <MobilePageIntro
        title={t('title')}
        eyebrow={plan ? plan.name : t('subtitle')}
        aside={
          <Link
            href={`/${locale}/plan/edit`}
            className="glass grid min-h-11 min-w-11 place-items-center rounded-full border border-accent px-3 text-lg font-semibold text-accent transition-transform active:scale-95"
          >
            ✎<span className="sr-only">{t('editPlan')}</span>
          </Link>
        }
      />
      <Link
        href={`/${locale}/registro`}
        className="btn-accent mb-5 flex min-h-11 items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold md:hidden"
      >
        {t('registerWorkout')}
      </Link>
      <div className="mb-6 hidden items-end justify-between gap-3 md:flex">
        <div>
          <h1 className="display text-2xl font-bold text-[var(--text)]">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-muted">{plan ? plan.name : t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/registro`}
            className="btn-accent rounded-xl px-4 py-2.5 text-sm font-bold"
          >
            {t('registerWorkout')}
          </Link>
          <Link
            href={`/${locale}/plan/edit`}
            className="glass rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-semibold text-[var(--text-dim)] transition-colors hover:border-accent hover:text-[var(--text)]"
          >
            {t('editPlan')}
          </Link>
        </div>
      </div>
    </>
  )

  if (!plan) {
    return (
      <div className="boot mx-auto max-w-4xl p-4 md:p-8">
        {header}
        <div className="glass ticks rounded-2xl border border-[var(--border-hi)] p-6 text-center">
          <div className="mb-1 text-sm font-bold text-[var(--text)]">{t('empty.title')}</div>
          <p className="mx-auto mb-4 max-w-lg text-sm text-[var(--text-dim)]">{t('empty.body')}</p>
          <Link href={`/${locale}/plan/edit`} className="btn-accent inline-flex rounded-xl px-4 py-2.5 text-sm font-bold">
            {t('empty.action')}
          </Link>
        </div>
      </div>
    )
  }

  const status = getPlanWeek(plan)
  if (!status.active) {
    return (
      <div className="boot mx-auto max-w-4xl p-4 md:p-8">
        {header}
        <div className="glass ticks rounded-2xl border border-[var(--border-hi)] p-6 text-center">
          <div className="mb-1 text-sm font-bold text-[var(--text)]">
            {status.reason === 'not_started'
              ? t('inactive.notStartedTitle', { date: plan.start_date })
              : t('inactive.expiredTitle')}
          </div>
          <p className="mx-auto mb-4 max-w-lg text-sm text-[var(--text-dim)]">
            {status.reason === 'not_started' ? t('inactive.notStartedBody') : t('inactive.expiredBody')}
          </p>
          <Link href={`/${locale}/plan/edit`} className="btn-accent inline-flex rounded-xl px-4 py-2.5 text-sm font-bold">
            {t('editPlan')}
          </Link>
        </div>
      </div>
    )
  }

  const week = status.week!
  const { data: sessions } = await supabase
    .from('workout_plan_sessions')
    .select('*')
    .eq('plan_id', plan.id)
    .eq('week_number', week)
  const sessionIds = (sessions ?? []).map((s) => s.id)

  let exercises: Database['public']['Tables']['workout_plan_exercises']['Row'][] = []
  let lastSets: Record<string, SetLog> = {}
  let historyLogs: SetLog[] = []
  let todayLogs: SetLog[] = []

  if (sessionIds.length) {
    const { data: exerciseRows } = await supabase
      .from('workout_plan_exercises')
      .select('*')
      .in('session_id', sessionIds)
      .order('order_index', { ascending: true })
    exercises = exerciseRows ?? []

    if (exercises.length) {
      const names = [...new Set(exercises.map((e) => e.exercise_name))]
      const today = dateKey(new Date().toISOString())
      const todayRange = dayRangeUtc(today)

      const [lastResult, todayResult] = await Promise.all([
        supabase
          .from('workout_set_logs')
          .select('*')
          .eq('user_id', user!.id)
          .in('exercise_name', names)
          .lt('logged_at', todayRange.start)
          .order('logged_at', { ascending: false })
          .limit(200),
        supabase
          .from('workout_set_logs')
          .select('*')
          .eq('user_id', user!.id)
          .in('exercise_id', exercises.map((e) => e.id))
          .gte('logged_at', todayRange.start)
          .lt('logged_at', todayRange.end)
          .order('logged_at', { ascending: true }),
      ])

      lastSets = {}
      historyLogs = lastResult.data ?? []
      for (const log of historyLogs) {
        if (!lastSets[log.exercise_name]) lastSets[log.exercise_name] = log
      }
      todayLogs = todayResult.data ?? []
    }
  }

  return (
    <div className="boot mx-auto max-w-4xl p-4 md:p-8">
      {header}
      <PlanWeekView
        plan={plan}
        week={week}
        sessions={sessions ?? []}
        exercises={exercises}
        lastSets={lastSets}
        historyLogs={historyLogs}
        todayLogs={todayLogs}
      />
    </div>
  )
}
