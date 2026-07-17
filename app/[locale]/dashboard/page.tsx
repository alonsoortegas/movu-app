import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getISOWeekBounds } from '@/lib/dates'
import { clampPercent, weeklyActivityProgress } from '@/lib/mobile-dashboard'
import MetricTile from '@/components/mobile/MetricTile'
import MobilePageIntro from '@/components/mobile/MobilePageIntro'
import MobilePanel, { type MobileChannel } from '@/components/mobile/MobilePanel'
import ProgressRing from '@/components/mobile/ProgressRing'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

const CATEGORY_EMOJI: Record<string, string> = {
  run: '🏃',
  ride: '🚴',
  strength: '💪',
  hiit: '🥊',
  mobility: '🧘',
  walk: '🚶',
  swim: '🏊',
  other: '🏋️',
}

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

const CATEGORY_CHANNEL: Record<string, MobileChannel> = {
  run: 'cyan',
  ride: 'cyan',
  strength: 'violet',
  hiit: 'coral',
  mobility: 'lime',
  walk: 'amber',
  swim: 'cyan',
  other: 'neutral',
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

  const { weekStart, weekEnd } = getISOWeekBounds()
  const today = new Date().toISOString().split('T')[0]
  const todayDayIndex = (new Date().getUTCDay() + 6) % 7 // 0=Mon … 6=Sun

  const [
    { data: weekActivities },
    { data: todaySleep },
    { data: todayMetric },
    { data: recentActivities },
    { data: cachedInsight },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from('activities')
      .select('id, activity_category, activity_name, source, start_date_utc, moving_time_s, calories_kcal, inferred_muscle_groups')
      .eq('user_id', user!.id)
      .gte('start_date_utc', weekStart)
      .lte('start_date_utc', weekEnd)
      .order('start_date_utc', { ascending: true }),
    supabase
      .from('sleep_logs')
      .select('hours, quality, performance_pct')
      .eq('user_id', user!.id)
      .gte('date', new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('daily_metrics')
      .select('steps_count')
      .eq('user_id', user!.id)
      .eq('date', today)
      .maybeSingle(),
    supabase
      .from('activities')
      .select('id, activity_name, activity_category, source, moving_time_s, start_date_utc, coach_name')
      .eq('user_id', user!.id)
      .order('start_date_utc', { ascending: false })
      .limit(3),
    supabase
      .from('insights')
      .select('content, created_at')
      .eq('user_id', user!.id)
      .eq('type', 'weekly_summary')
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user!.id)
      .maybeSingle(),
  ])

  const displayName = getDisplayName(profile?.full_name, user?.email)

  // Map day index (0=Mon) → activities that day
  const activitiesByDay: Record<number, NonNullable<typeof weekActivities>[0][]> = {}
  for (const act of weekActivities ?? []) {
    const idx = (new Date(act.start_date_utc!).getUTCDay() + 6) % 7
    activitiesByDay[idx] = [...(activitiesByDay[idx] ?? []), act]
  }

  const acts = weekActivities ?? []
  const totalTimeS = acts.reduce((s, a) => s + (a.moving_time_s ?? 0), 0)
  const totalCalories = Math.round(acts.reduce((s, a) => s + (a.calories_kcal ?? 0), 0))
  const recoveryPercent = todaySleep?.performance_pct == null
    ? null
    : clampPercent(todaySleep.performance_pct)
  const trainingProgress = weeklyActivityProgress(acts.length, 5)

  // Muscle group frequency for the week
  const muscleCount: Record<string, number> = {}
  for (const act of acts) {
    for (const m of act.inferred_muscle_groups ?? []) {
      muscleCount[m] = (muscleCount[m] ?? 0) + 1
    }
  }
  const muscleGroups = Object.entries(muscleCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="boot mx-auto max-w-5xl p-4 md:p-8">
      <MobilePageIntro
        title={t('greeting', { name: displayName })}
        eyebrow={t('weekLabel')}
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
          <p className="mt-0.5 text-sm text-muted">{t('weekLabel')}</p>
        </div>
        <Link href={`/${locale}/registro`} className="btn-accent rounded-xl px-4 py-2.5 text-sm font-bold">
          {t('registerToday')}
        </Link>
      </div>

      {/* Mobile training brief */}
      <MobilePanel channel={cachedInsight ? 'lime' : 'neutral'} className="ticks mb-7 rounded-[1.8rem] p-5 md:hidden">
        <div className="flex items-start justify-between gap-3">
          <p className="data text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">{t('aiLabel')}</p>
          <span className="data rounded-full border border-[var(--channel)] px-3 py-1 text-[9px] uppercase tracking-[0.15em] text-[var(--channel)]">
            {cachedInsight ? t('aiInsightTitle') : t('aiInsightEmpty')}
          </span>
        </div>
        {cachedInsight ? (
          <p className="display mt-5 text-[1.45rem] font-semibold leading-tight text-[var(--text)]">{cachedInsight.content}</p>
        ) : (
          <Link href="/api/insights/latest" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent">
            {t('aiGenerate')}
          </Link>
        )}
      </MobilePanel>

      {/* Desktop AI insight */}
      <div className="hidden md:block">
        {cachedInsight ? (
          <div className="glass ticks mb-6 rounded-2xl border border-[var(--border-hi)] p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[#10210b]">{t('aiLabel')}</span>
              <span className="text-xs font-semibold text-[var(--text-dim)]">{t('aiInsightTitle')}</span>
            </div>
            <p className="text-sm leading-relaxed text-[var(--text)]">&ldquo;{cachedInsight.content}&rdquo;</p>
          </div>
        ) : (
          <div className="panel mb-6 flex items-center justify-between gap-4 rounded-2xl border-dashed p-5">
            <span className="text-sm text-muted">{t('aiInsightEmpty')}</span>
            <Link href="/api/insights/latest" className="whitespace-nowrap text-xs font-semibold text-accent hover:underline">
              {t('aiGenerate')}
            </Link>
          </div>
        )}
      </div>

      <section className="mb-7 grid grid-cols-2 gap-4 md:hidden" aria-label={t('weeklyProgress')}>
        <ProgressRing label={t('metrics.sleep')} value={recoveryPercent} channel="lime" />
        <ProgressRing
          label={t('weeklyProgress')}
          value={trainingProgress}
          displayValue={`${acts.length}/5`}
          channel="amber"
        />
      </section>

      {/* Weekly day grid */}
      <MobilePanel channel="lime" className="mb-7 rounded-[1.6rem] p-3 md:hidden">
        <p className="data mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">{t('thisWeek')}</p>
        <div className="grid grid-cols-7 gap-1">
          {DAY_KEYS.map((key, i) => {
            const day = t.raw(`weekDays.${key}`) as { short: string; label: string; type: string }
            const firstAct = (activitiesByDay[i] ?? [])[0]
            const isToday = i === todayDayIndex
            const category = firstAct?.activity_category ?? 'other'

            return (
              <div
                key={key}
                className={`grid min-h-[58px] place-items-center rounded-xl border px-1 py-2 ${isToday ? 'border-accent bg-accent-light' : 'border-transparent'}`}
              >
                <span className="data text-[9px] font-semibold uppercase text-[var(--text-faint)]">{day.short}</span>
                <span className="data text-base font-bold text-[var(--channel)]" data-channel={CATEGORY_CHANNEL[category]}>
                  {firstAct ? (CATEGORY_SYMBOL[category] ?? '·') : isToday ? '•' : '·'}
                </span>
              </div>
            )
          })}
        </div>
      </MobilePanel>

      <div className="mb-6 hidden md:block">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{t('thisWeek')}</p>
        <div className="grid grid-cols-7 gap-2">
          {DAY_KEYS.map((key, i) => {
            const day = t.raw(`weekDays.${key}`) as { short: string; label: string; type: string }
            const isToday = i === todayDayIndex
            const dayActs = activitiesByDay[i] ?? []
            const firstAct = dayActs[0]
            const emoji = firstAct
              ? (CATEGORY_EMOJI[firstAct.activity_category ?? ''] ?? '🏋️')
              : isToday ? '📍' : '—'
            const label = firstAct
              ? (firstAct.activity_category ?? firstAct.source ?? '—')
              : day.type
            return (
              <div
                key={key}
                className={`rounded-xl border p-3 text-center transition-all ${isToday ? 'border-accent bg-accent-light shadow-[0_0_18px_rgba(107,224,64,0.12)]' : 'panel'}`}
              >
                <div className={`mb-1 text-xs font-medium ${isToday ? 'text-[var(--text)]' : 'text-muted'}`}>{day.short}</div>
                <div className="mb-1 text-lg">{emoji}</div>
                <div className={`truncate text-[9px] leading-tight ${isToday ? 'font-medium text-[var(--text-dim)]' : 'text-muted'}`}>{label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Metric cards */}
      <div className="mb-7 grid grid-cols-2 gap-3 md:hidden">
        <MetricTile
          label={t('metrics.sleep')}
          value={todaySleep?.hours ? `${Math.round(todaySleep.hours * 10) / 10}h` : '—'}
          context={t('metrics.sleepSub')}
          channel="cyan"
        />
        <MetricTile
          label={t('metrics.steps')}
          value={todayMetric?.steps_count ? todayMetric.steps_count.toLocaleString(locale) : '—'}
          channel="lime"
        />
        <MetricTile
          label={t('metrics.calories')}
          value={totalCalories > 0 ? `${totalCalories}` : '—'}
          context="kcal"
          channel="coral"
        />
        <MetricTile
          label={t('metrics.time')}
          value={totalTimeS > 0 ? formatDuration(totalTimeS) : '—'}
          channel="violet"
        />
      </div>

      <div className="mb-6 hidden grid-cols-4 gap-4 md:grid">
        {[
          {
            emoji: '💤',
            labelKey: 'metrics.sleep' as const,
            value: todaySleep?.hours ? `${Math.round(todaySleep.hours * 10) / 10}h` : '—',
            subKey: 'metrics.sleepSub' as const,
          },
          {
            emoji: '👣',
            labelKey: 'metrics.steps' as const,
            value: todayMetric?.steps_count ? todayMetric.steps_count.toLocaleString(locale) : '—',
            subKey: null,
          },
          {
            emoji: '🔥',
            labelKey: 'metrics.calories' as const,
            value: totalCalories > 0 ? `${totalCalories} kcal` : '—',
            subKey: null,
          },
          {
            emoji: '⏱',
            labelKey: 'metrics.time' as const,
            value: totalTimeS > 0 ? formatDuration(totalTimeS) : '—',
            subKey: null,
          },
        ].map(({ emoji, labelKey, value, subKey }) => (
          <div key={labelKey} className="panel relative overflow-hidden rounded-2xl p-5 text-left">
            <div className="mb-2 text-2xl">{emoji}</div>
            <div className="mb-1 text-xs text-muted">{t(labelKey)}</div>
            <div className="data text-2xl font-bold leading-tight text-[var(--text)]">{value}</div>
            {subKey && <div className="mt-0.5 text-[10px] text-muted">{t(subKey)}</div>}
          </div>
        ))}
      </div>

      {/* Recent workouts */}
      <div className="mb-7 md:hidden">
        <h2 className="data mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">{t('recentWorkouts')}</h2>
        <MobilePanel channel="violet" className="rounded-[1.6rem]">
          {(recentActivities ?? []).length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">{t('noActivities')}</div>
          ) : (
            (recentActivities ?? []).map((w, i) => (
              <div
                key={w.id}
                className={`flex items-center gap-3 px-4 py-4 ${i < (recentActivities?.length ?? 0) - 1 ? 'border-b border-[var(--ink-06)]' : ''}`}
              >
                <div
                  data-channel={CATEGORY_CHANNEL[w.activity_category ?? 'other']}
                  className="data grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-[color-mix(in_srgb,var(--channel)_45%,transparent)] bg-[color-mix(in_srgb,var(--channel)_10%,transparent)] text-base font-bold text-[var(--channel)]"
                >
                  {CATEGORY_SYMBOL[w.activity_category ?? 'other'] ?? '·'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--text)]">
                    {w.activity_name ?? w.activity_category ?? w.source}
                  </div>
                  <div className="text-xs text-muted">
                    {[w.source, w.moving_time_s ? formatDuration(w.moving_time_s) : '—', w.coach_name].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className="data text-sm text-muted">→</span>
              </div>
            ))
          )}
        </MobilePanel>
      </div>

      <div className="mb-6 hidden md:block">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{t('recentWorkouts')}</h2>
        <div className="panel overflow-hidden rounded-2xl">
          {(recentActivities ?? []).length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">{t('noActivities')}</div>
          ) : (
            (recentActivities ?? []).map((w, i) => (
              <div
                key={w.id}
                className={`flex items-center gap-4 px-5 py-4 ${i < (recentActivities?.length ?? 0) - 1 ? 'border-b border-dashed border-border' : ''}`}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-accent bg-accent-light text-base">
                  {CATEGORY_EMOJI[w.activity_category ?? ''] ?? '🏋️'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[var(--text)]">
                    {w.activity_name ?? w.activity_category ?? w.source}
                  </div>
                  <div className="text-xs text-muted">
                    {[w.source, w.moving_time_s ? formatDuration(w.moving_time_s) : '—', w.coach_name].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className="text-sm text-muted">›</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Desktop: progress + muscle groups */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        <div className="panel rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t('weeklyProgress')}</h3>
          <div className="space-y-2.5">
            {[
              { key: 'progress.workouts' as const, val: acts.length, max: 5 },
              { key: 'progress.activeMinutes' as const, val: Math.round(totalTimeS / 60), max: 300 },
              { key: 'progress.calories' as const, val: totalCalories, max: 2000 },
            ].map(({ key, val, max }) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-dim)]">{t(key)}</span>
                  <span className="data text-[var(--text-faint)]">{val} / {max}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ring-track)]">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((val / max) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t('muscleGroups')}</h3>
          {muscleGroups.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map(([m, c]) => (
                <div key={m} className="flex items-center gap-1.5 rounded-full border border-accent bg-accent-light px-3 py-1 text-xs text-[var(--text)]">
                  {m}<span className="font-bold text-accent-dark ml-1">{c}x</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">{t('noMuscleData')}</p>
          )}
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
