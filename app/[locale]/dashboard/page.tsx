import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { formatActivityDisplayName } from '@/lib/activities/display-name'
import {
  APP_TIMEZONE,
  computeBodyTrend,
  computeFuelTrends,
  computeLoadTrends,
  dateKey,
  dayRangeUtc,
  selectActivePhase,
  weekStartKey,
  type FuelDay,
  type PhaseKind,
  type TrainingPhase,
} from '@/lib/trends/compute'
import { getPlanWeek, getTodayKey } from '@/lib/workout/logic'
import { fuelTargetsForDayType, padLoadWeeks, resolveTodaySession } from '@/lib/dashboard/today'
import { calculateConsumed, EMPTY_MACRO_TOTALS, type NutritionDayType } from '@/lib/nutrition/macros'
import MobilePageIntro from '@/components/mobile/MobilePageIntro'
import TodaySessionCard, { type TodaySessionCardProps } from '@/components/dashboard/TodaySessionCard'
import FuelTodayCard from '@/components/dashboard/FuelTodayCard'
import WeekStrip from '@/components/dashboard/WeekStrip'

const CATEGORY_SYMBOL: Record<string, string> = {
  run: '↗',
  ride: '≈',
  strength: '▲',
  hiit: '◆',
  mobility: '○',
  walk: '→',
  swim: '∿',
  other: '·',
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getDisplayName(fullName: string | null | undefined, email: string | undefined): string {
  const name = fullName?.trim()
  if (name) return name
  return email?.split('@')[0] || ''
}

function getInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return initials || 'M'
}

function InputTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl">
      <p className="data text-[10px] uppercase tracking-[0.18em] text-[var(--text-faint)]">{label}</p>
      <p className="data mt-2 text-xl font-bold text-[var(--text)]">
        {value}
        {unit && <span className="ml-1 text-[10px] font-normal text-[var(--text-faint)]">{unit}</span>}
      </p>
    </div>
  )
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('dashboard')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const todayKey = dateKey(now.toISOString())
  const todayDayKey = getTodayKey(now)
  const weekStart = weekStartKey(todayKey)
  const bodyStart = dateKey(new Date(now.getTime() - 28 * 86400000).toISOString())
  const loadStartIso = dayRangeUtc(dateKey(new Date(now.getTime() - 42 * 86400000).toISOString())).start

  const [
    profileResult,
    todaySleepResult,
    todayMetricResult,
    recentResult,
    plansResult,
    weekNutritionDaysResult,
    targetsResult,
    weekMealLogsResult,
    measurementsResult,
    phasesResult,
    loadActivitiesResult,
  ] = await Promise.all([
    supabase.from('user_profiles').select('full_name').eq('id', user!.id).maybeSingle(),
    supabase
      .from('sleep_logs')
      .select('hours')
      .eq('user_id', user!.id)
      .gte('date', dateKey(new Date(now.getTime() - 2 * 86400000).toISOString()))
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('daily_metrics')
      .select('steps_count, recovery_score')
      .eq('user_id', user!.id)
      .eq('date', todayKey)
      .maybeSingle(),
    supabase
      .from('activities')
      .select('id, activity_name, activity_type, activity_category, source, moving_time_s, start_date_utc, coach_name')
      .eq('user_id', user!.id)
      .order('start_date_utc', { ascending: false })
      .limit(3),
    supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', user!.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase.from('nutrition_days').select('date, day_type').eq('user_id', user!.id).gte('date', weekStart),
    supabase.from('nutrition_targets').select('*').eq('user_id', user!.id),
    supabase
      .from('meal_logs')
      .select('id, date, meal_log_items ( calories, protein_g, carbs_g, fat_g )')
      .eq('user_id', user!.id)
      .gte('date', weekStart)
      .lte('date', todayKey),
    supabase
      .from('body_measurements')
      .select('measured_at, weight_kg')
      .eq('user_id', user!.id)
      .gte('measured_at', bodyStart)
      .order('measured_at', { ascending: true }),
    supabase.from('training_phases').select('*').eq('user_id', user!.id).order('start_date', { ascending: false }),
    supabase
      .from('activities')
      .select('start_date_utc, activity_category, moving_time_s')
      .eq('user_id', user!.id)
      .gte('start_date_utc', loadStartIso),
  ])

  const queryError =
    profileResult.error ?? todaySleepResult.error ?? todayMetricResult.error ??
    recentResult.error ?? plansResult.error ?? weekNutritionDaysResult.error ??
    targetsResult.error ?? weekMealLogsResult.error ?? measurementsResult.error ??
    phasesResult.error ?? loadActivitiesResult.error
  if (queryError) {
    console.error('Failed to load dashboard data', JSON.stringify({
      code: queryError.code,
      message: queryError.message,
      details: queryError.details,
      hint: queryError.hint,
    }))
  }

  const profile = profileResult.data
  const todaySleep = todaySleepResult.data
  const todayMetric = todayMetricResult.data
  const recentActivities = recentResult.data
  const activePlans = plansResult.data
  const weekNutritionDays = weekNutritionDaysResult.data
  const targets = targetsResult.data
  const weekMealLogs = weekMealLogsResult.data
  const measurements = measurementsResult.data
  const phases = phasesResult.data
  const loadActivities = loadActivitiesResult.data

  const displayName = getDisplayName(profile?.full_name, user?.email)

  // ── Today's session ─────────────────────────────────────────────────────────
  const plan = activePlans?.[0] ?? null
  let sessionProps: TodaySessionCardProps = { state: 'no_plan', locale }
  if (plan) {
    const status = getPlanWeek(plan)
    if (!status.active) {
      sessionProps = { state: 'inactive', locale, reason: status.reason as 'not_started' | 'expired', startDate: plan.start_date }
    } else {
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_plan_sessions')
        .select('id, day_of_week, title, session_type')
        .eq('plan_id', plan.id)
        .eq('week_number', status.week!)
      if (sessionsError) {
        console.error('Failed to load plan sessions', JSON.stringify({
          code: sessionsError.code,
          message: sessionsError.message,
          details: sessionsError.details,
          hint: sessionsError.hint,
        }))
      }
      const today = resolveTodaySession(sessions ?? [], todayDayKey)
      if (today.kind === 'session') {
        const { data: exercises, error: exercisesError } = await supabase
          .from('workout_plan_exercises')
          .select('prescribed_sets')
          .eq('session_id', today.session.id)
        if (exercisesError) {
          console.error('Failed to load plan exercises', JSON.stringify({
            code: exercisesError.code,
            message: exercisesError.message,
            details: exercisesError.details,
            hint: exercisesError.hint,
          }))
        }
        sessionProps = {
          state: 'session',
          locale,
          title: today.session.title,
          sessionType: today.session.session_type,
          exerciseCount: (exercises ?? []).length,
          setCount: (exercises ?? []).reduce((s, e) => s + (e.prescribed_sets ?? 0), 0),
        }
      } else {
        const nextDayLabel = today.daysUntilNext != null
          ? new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: APP_TIMEZONE }).format(
              new Date(now.getTime() + today.daysUntilNext * 86400000),
            )
          : null
        sessionProps = {
          state: 'rest',
          locale,
          nextTitle: today.next?.title ?? null,
          nextDayLabel,
        }
      }
    }
  }

  // ── Fuel today + week adherence ─────────────────────────────────────────────
  const mealLogs = (weekMealLogs ?? []) as unknown as Array<{
    id: string
    date: string
    meal_log_items: Array<{
      calories: number | null
      protein_g: number | null
      carbs_g: number | null
      fat_g: number | null
    }> | null
  }>
  const dayTypeByDate = new Map((weekNutritionDays ?? []).map((row) => [row.date, row.day_type]))
  const todayDayType = (dayTypeByDate.get(todayKey) as NutritionDayType | undefined) ?? 'moderate'
  const todayItems = mealLogs
    .filter((log) => log.date === todayKey)
    .flatMap((log) => log.meal_log_items ?? [])
    .map((item) => ({
      calories: item.calories ?? 0,
      protein_g: item.protein_g ?? 0,
      carbs_g: item.carbs_g ?? 0,
      fat_g: item.fat_g ?? 0,
    }))
  const consumedToday = todayItems.length ? calculateConsumed(todayItems) : EMPTY_MACRO_TOTALS
  const todayTarget = fuelTargetsForDayType(targets ?? [], todayDayType)

  const fuelByDate = new Map<string, { kcal: number; protein: number; items: number }>()
  for (const log of mealLogs) {
    const agg = fuelByDate.get(log.date) ?? { kcal: 0, protein: 0, items: 0 }
    for (const item of log.meal_log_items ?? []) {
      agg.kcal += Number(item.calories) || 0
      agg.protein += Number(item.protein_g) || 0
      agg.items += 1
    }
    fuelByDate.set(log.date, agg)
  }
  const fuelDates = new Set([...fuelByDate.keys(), ...dayTypeByDate.keys()])
  const targetRows = targets ?? []
  const fuelDays: FuelDay[] = [...fuelDates].map((date) => {
    const agg = fuelByDate.get(date)
    const dayType = (dayTypeByDate.get(date) as NutritionDayType | undefined) ?? 'moderate'
    const target = fuelTargetsForDayType(targetRows, dayType)
    return {
      date,
      kcal: Math.round(agg?.kcal ?? 0),
      protein: Math.round(agg?.protein ?? 0),
      kcalTarget: target?.calories ?? null,
      proteinTarget: target?.protein_g ?? null,
      logged: (agg?.items ?? 0) > 0,
    }
  })
  const fuel = computeFuelTrends(fuelDays, todayKey)
  const adherence = fuelDays.length
    ? {
        loggedPct: fuel.adherence.loggedPct,
        kcalWithin10Pct: fuel.adherence.kcalWithin10Pct,
        proteinHitPct: fuel.adherence.proteinHitPct,
      }
    : null

  // ── Body trend ──────────────────────────────────────────────────────────────
  const openPhaseRow = selectActivePhase(phases ?? [], todayKey)
  const activePhase: TrainingPhase | null = openPhaseRow
    ? {
        phase: openPhaseRow.kind as PhaseKind,
        started_on: openPhaseRow.start_date,
        target_rate_kg_per_week: openPhaseRow.target_rate_kg_per_week,
      }
    : null
  const bodyTrend = computeBodyTrend(
    (measurements ?? []).map((m) => ({ measured_on: m.measured_at, weight_kg: m.weight_kg })),
    activePhase,
    todayKey,
  )
  const body = bodyTrend.ratePerWeek != null
    ? { phase: activePhase?.phase ?? null, ratePerWeek: bodyTrend.ratePerWeek, verdict: bodyTrend.verdict }
    : null

  // ── Training load ───────────────────────────────────────────────────────────
  const load = computeLoadTrends(
    (loadActivities ?? [])
      .filter((a) => a.start_date_utc != null)
      .map((a) => ({
        start: a.start_date_utc!,
        category: a.activity_category === 'walk' ? ('lifestyle' as const) : ('training' as const),
        minutes: a.moving_time_s != null ? Math.round(a.moving_time_s / 60) : null,
      })),
    [],
  )
  const loadWeeks = padLoadWeeks(load.weeks, todayKey, 6)

  // ── Today's inputs ──────────────────────────────────────────────────────────
  const sleepValue = todaySleep?.hours != null ? `${Math.round(todaySleep.hours * 10) / 10}` : '—'
  const stepsValue = todayMetric?.steps_count != null ? todayMetric.steps_count.toLocaleString(locale) : '—'
  const recoveryScore = todayMetric?.recovery_score ?? null

  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: APP_TIMEZONE,
  }).format(now)

  return (
    <div className="boot mx-auto max-w-5xl p-4 md:p-8">
      <MobilePageIntro
        title={t('greeting', { name: displayName })}
        eyebrow={dateLabel}
        aside={
          <div className="glass grid h-11 w-11 flex-none place-items-center rounded-full border border-[var(--border-hi)] text-xs font-bold text-[var(--text-dim)]">
            {getInitials(displayName)}
          </div>
        }
      />

      {/* Desktop header */}
      <div className="mb-8 hidden items-center justify-between md:flex">
        <div>
          <h1 className="display text-2xl font-bold text-[var(--text)]">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-muted">{dateLabel}</p>
        </div>
        <Link href={`/${locale}/registro`} className="btn-accent rounded-xl px-4 py-2.5 text-sm font-bold">
          {t('registerToday')}
        </Link>
      </div>

      <div className="space-y-5 md:space-y-6">
        {/* Today: session + fuel */}
        <div className="grid gap-4 md:grid-cols-2">
          <TodaySessionCard {...sessionProps} />
          <FuelTodayCard locale={locale} dayType={todayDayType} consumed={consumedToday} target={todayTarget} />
        </div>

        {/* Today's inputs */}
        <div className={`grid gap-3 ${recoveryScore != null ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <InputTile label={t('inputs.sleep')} value={sleepValue} unit="h" />
          <InputTile label={t('inputs.steps')} value={stepsValue} />
          {recoveryScore != null && (
            <InputTile label={t('inputs.recovery')} value={`${Math.round(recoveryScore)}`} unit="%" />
          )}
        </div>

        {/* Week strip */}
        <WeekStrip locale={locale} body={body} adherence={adherence} loadWeeks={loadWeeks} />

        {/* Recent workouts */}
        <div>
          <h2 className="data mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
            {t('recentWorkouts')}
          </h2>
          <div className="panel mobile-sheet overflow-hidden rounded-[1.6rem] md:rounded-2xl">
            {(recentActivities ?? []).length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted">{t('noActivities')}</div>
            ) : (
              (recentActivities ?? []).map((w, i) => (
                <div
                  key={w.id}
                  className={`flex items-center gap-3 px-4 py-4 ${i < (recentActivities?.length ?? 0) - 1 ? 'border-b border-[var(--ink-06)]' : ''}`}
                >
                  <div className="data grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-accent bg-accent-light text-base font-bold text-accent">
                    {CATEGORY_SYMBOL[w.activity_category ?? 'other'] ?? '·'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--text)]">
                      {formatActivityDisplayName(w)}
                    </div>
                    <div className="text-xs text-muted">
                      {[w.source, w.moving_time_s ? formatDuration(w.moving_time_s) : '—', w.coach_name]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Link
        href={`/${locale}/registro`}
        className="btn-accent fixed left-4 right-4 z-40 rounded-2xl py-3.5 text-center text-sm font-bold md:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
      >
        {t('registerCta')}
      </Link>
    </div>
  )
}
