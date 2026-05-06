import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getISOWeekBounds } from '@/lib/dates'

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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
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
    { data: recentActivities },
    { data: cachedInsight },
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
      .from('activities')
      .select('id, activity_name, activity_category, source, moving_time_s, start_date_utc')
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
  ])

  // Map day index (0=Mon) → activities that day
  const activitiesByDay: Record<number, NonNullable<typeof weekActivities>[0][]> = {}
  for (const act of weekActivities ?? []) {
    const idx = (new Date(act.start_date_utc!).getUTCDay() + 6) % 7
    activitiesByDay[idx] = [...(activitiesByDay[idx] ?? []), act]
  }

  const acts = weekActivities ?? []
  const totalTimeS = acts.reduce((s, a) => s + (a.moving_time_s ?? 0), 0)
  const totalCalories = Math.round(acts.reduce((s, a) => s + (a.calories_kcal ?? 0), 0))

  // Muscle group frequency for the week
  const muscleCount: Record<string, number> = {}
  for (const act of acts) {
    for (const m of act.inferred_muscle_groups ?? []) {
      muscleCount[m] = (muscleCount[m] ?? 0) + 1
    }
  }
  const muscleGroups = Object.entries(muscleCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 md:mb-8">
        <div>
          <h1 className="text-xl font-bold text-[#111] md:hidden">{t('greeting')}</h1>
          <h1 className="hidden md:block text-2xl font-bold text-[#111]">{t('title')}</h1>
          <p className="text-xs md:text-sm text-muted mt-0.5">{t('weekLabel')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#eee] border border-[#e0e0e0] flex items-center justify-center text-base md:hidden">🧑</div>
          <Link
            href={`/${locale}/registro`}
            className="hidden md:block bg-accent hover:bg-accent-dark text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            {t('registerToday')}
          </Link>
        </div>
      </div>

      {/* AI Insight */}
      {cachedInsight ? (
        <div className="bg-accent-light border-2 border-dashed border-accent rounded-xl p-4 md:p-5 mb-4 md:mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-accent text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide">{t('aiLabel')}</span>
            <span className="text-xs font-semibold text-[#555]">{t('aiInsightTitle')}</span>
          </div>
          <p className="text-sm text-[#333] leading-relaxed">&ldquo;{cachedInsight.content}&rdquo;</p>
        </div>
      ) : (
        <div className="bg-surface border border-dashed border-border rounded-xl p-4 md:p-5 mb-4 md:mb-6 flex items-center justify-between gap-4">
          <span className="text-sm text-muted">{t('aiInsightEmpty')}</span>
          <Link href="/api/insights/latest" className="text-xs font-semibold text-accent hover:underline whitespace-nowrap">
            {t('aiGenerate')}
          </Link>
        </div>
      )}

      {/* Weekly day grid */}
      <div className="mb-4 md:mb-6">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 md:mb-3">{t('thisWeek')}</p>
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
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
                className={`rounded-xl border p-2 md:p-3 text-center transition-all ${isToday ? 'bg-accent-light border-accent shadow-sm' : 'bg-surface border-border'}`}
              >
                <div className={`text-[10px] md:text-xs font-medium mb-1 ${isToday ? 'text-[#555]' : 'text-muted'}`}>{day.short}</div>
                <div className="text-sm md:text-lg mb-0.5 md:mb-1">{emoji}</div>
                <div className={`text-[9px] leading-tight hidden md:block truncate ${isToday ? 'text-[#444] font-medium' : 'text-muted'}`}>{label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
        {[
          {
            emoji: '💤',
            labelKey: 'metrics.sleep' as const,
            value: todaySleep?.hours ? `${Math.round(todaySleep.hours * 10) / 10}h` : '—',
            subKey: 'metrics.sleepSub' as const,
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
          <div key={labelKey} className="bg-surface border border-border rounded-xl p-3 md:p-5 text-center md:text-left">
            <div className="text-lg md:text-2xl mb-1 md:mb-2">{emoji}</div>
            <div className="text-[10px] md:text-xs text-muted mb-0.5 md:mb-1">{t(labelKey)}</div>
            <div className="text-sm md:text-2xl font-bold text-[#111] leading-tight">{value}</div>
            {subKey && <div className="text-[10px] text-muted mt-0.5 hidden md:block">{t(subKey)}</div>}
          </div>
        ))}
      </div>

      {/* Recent workouts */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 md:mb-3">{t('recentWorkouts')}</h2>
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {(recentActivities ?? []).length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">{t('noActivities')}</div>
          ) : (
            (recentActivities ?? []).map((w, i) => (
              <div
                key={w.id}
                className={`flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-4 ${i < (recentActivities?.length ?? 0) - 1 ? 'border-b border-dashed border-border' : ''}`}
              >
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-accent-light border border-accent flex items-center justify-center text-base flex-shrink-0">
                  {CATEGORY_EMOJI[w.activity_category ?? ''] ?? '🏋️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#111] truncate">
                    {w.activity_name ?? w.activity_category ?? w.source}
                  </div>
                  <div className="text-xs text-muted">
                    {w.source} · {w.moving_time_s ? formatDuration(w.moving_time_s) : '—'}
                  </div>
                </div>
                <span className="text-muted text-sm">›</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Desktop: progress + muscle groups */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t('weeklyProgress')}</h3>
          <div className="space-y-2.5">
            {[
              { key: 'progress.workouts' as const, val: acts.length, max: 5 },
              { key: 'progress.activeMinutes' as const, val: Math.round(totalTimeS / 60), max: 300 },
              { key: 'progress.calories' as const, val: totalCalories, max: 2000 },
            ].map(({ key, val, max }) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#555]">{t(key)}</span>
                  <span className="text-[#888]">{val} / {max}</span>
                </div>
                <div className="h-1.5 bg-[#e8e8e8] rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((val / max) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t('muscleGroups')}</h3>
          {muscleGroups.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map(([m, c]) => (
                <div key={m} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-light border border-accent text-xs text-[#444]">
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
        className="md:hidden fixed bottom-[72px] left-4 right-4 bg-accent text-white text-sm font-semibold text-center py-3.5 rounded-xl shadow-lg"
      >
        {t('registerCta')}
      </Link>
    </div>
  )
}
