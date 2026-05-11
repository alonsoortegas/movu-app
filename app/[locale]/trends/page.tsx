import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type DailyMetric = Database['public']['Tables']['daily_metrics']['Row']
type SleepLog = Database['public']['Tables']['sleep_logs']['Row']
type Activity = Database['public']['Tables']['activities']['Row']
type BodyMeasurement = Database['public']['Tables']['body_measurements']['Row']

type Point = { date: string; value: number | null }
type ChartSeries = { label: string; color: string; data: Point[]; dashed?: boolean }

const WINDOW_DAYS = 30
const CATEGORY_COLORS: Record<string, string> = {
  run: '#4f46e5',
  ride: '#0ea5e9',
  strength: '#65a30d',
  hiit: '#f97316',
  mobility: '#14b8a6',
  walk: '#6b7280',
  swim: '#0891b2',
  other: '#a855f7',
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function avg(values: Array<number | null | undefined>, decimals = 0): string {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (nums.length === 0) return '—'
  const mean = nums.reduce((s, v) => s + v, 0) / nums.length
  return decimals > 0 ? mean.toFixed(decimals) : String(Math.round(mean))
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((s, v) => s + (typeof v === 'number' && Number.isFinite(v) ? v : 0), 0)
}

function numberLabel(value: number | null | undefined, decimals = 0): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value))
}

function axisLabel(locale: string, date: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00Z`))
}

function minMax(series: ChartSeries[]): { min: number; max: number } {
  const values = series.flatMap(s => s.data.map(p => p.value)).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (values.length === 0) return { min: 0, max: 1 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return { min: Math.max(0, min - 1), max: max + 1 }
  const pad = (max - min) * 0.12
  return { min: Math.max(0, min - pad), max: max + pad }
}

function LineChart({ series, height = 118 }: { series: ChartSeries[]; height?: number }) {
  const width = 420
  const pad = 12
  const { min, max } = minMax(series)
  const len = Math.max(...series.map(s => s.data.length), 1)

  const toPoints = (data: Point[]) =>
    data
      .map((p, i) => {
        if (p.value == null) return null
        const x = pad + (i / Math.max(len - 1, 1)) * (width - pad * 2)
        const y = pad + (1 - (p.value - min) / (max - min || 1)) * (height - pad * 2)
        return `${x},${y}`
      })
      .filter(Boolean)
      .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[118px]" role="img" aria-hidden="true">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#e8e8e8" strokeWidth="1" />
      {series.map(s => (
        <polyline
          key={s.label}
          points={toPoints(s.data)}
          fill="none"
          stroke={s.color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={s.dashed ? '6 5' : undefined}
        />
      ))}
    </svg>
  )
}

function BarChart({ data, color = '#6be040', maxValue }: { data: Point[]; color?: string; maxValue?: number }) {
  const max = maxValue ?? Math.max(...data.map(p => p.value ?? 0), 1)
  return (
    <div className="h-[118px] flex items-end gap-1.5">
      {data.map((p, i) => {
        const pct = Math.min(((p.value ?? 0) / max) * 100, 100)
        return (
          <div key={`${p.date}-${i}`} className="flex-1 h-full bg-[#eeeeee] rounded-t-sm overflow-hidden min-w-0 flex items-end">
            <div className="w-full rounded-t-sm" style={{ height: `${Math.max(pct, p.value ? 4 : 0)}%`, background: color }} />
          </div>
        )
      })}
    </div>
  )
}

function MetricCard({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3 md:p-4">
      <div className="text-[10px] md:text-xs text-muted uppercase tracking-wide mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl md:text-2xl font-bold text-[#111]" style={{ color }}>{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
    </div>
  )
}

function ChartCard({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">{title}</h3>
        {right && <span className="text-xs font-semibold text-[#555]">{right}</span>}
      </div>
      {children}
    </div>
  )
}

function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {items.map(item => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
          <span
            className="w-5 h-0.5 rounded-full"
            style={{ background: item.dashed ? 'transparent' : item.color, borderTop: item.dashed ? `2px dashed ${item.color}` : undefined }}
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function EmptyState({ locale, title, body, action }: { locale: string; title: string; body: string; action: string }) {
  return (
    <div className="bg-accent-light border-2 border-dashed border-accent rounded-xl p-5 md:p-6 text-center">
      <div className="text-sm font-bold text-[#222] mb-1">{title}</div>
      <p className="text-sm text-[#444] max-w-lg mx-auto mb-4">{body}</p>
      <Link href={`/${locale}/perfil`} className="inline-flex bg-accent hover:bg-accent-dark text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
        {action}
      </Link>
    </div>
  )
}

export default async function TrendsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('trends')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const end = new Date()
  end.setUTCHours(23, 59, 59, 999)
  const start = addDays(end, -(WINDOW_DAYS - 1))
  start.setUTCHours(0, 0, 0, 0)
  const startDate = isoDate(start)
  const endDate = isoDate(end)
  const dateKeys = Array.from({ length: WINDOW_DAYS }, (_, i) => isoDate(addDays(start, i)))

  const [
    { data: metrics },
    { data: sleepLogs },
    { data: activities },
    { data: latestBody },
  ] = await Promise.all([
    supabase
      .from('daily_metrics')
      .select('*')
      .eq('user_id', user!.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true }),
    supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user!.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true }),
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', user!.id)
      .gte('start_date_utc', start.toISOString())
      .lte('start_date_utc', end.toISOString())
      .order('start_date_utc', { ascending: false }),
    supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user!.id)
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const metricsByDate = new Map((metrics ?? []).map((m: DailyMetric) => [m.date, m]))
  const sleepByDate = new Map((sleepLogs ?? []).map((s: SleepLog) => [s.date, s]))
  const activitiesByDate = new Map<string, Activity[]>()
  for (const act of activities ?? []) {
    if (!act.start_date_utc) continue
    const key = act.start_date_utc.slice(0, 10)
    activitiesByDate.set(key, [...(activitiesByDate.get(key) ?? []), act])
  }

  const metricSeries = (field: keyof DailyMetric): Point[] =>
    dateKeys.map(date => ({ date, value: (metricsByDate.get(date)?.[field] as number | null | undefined) ?? null }))
  const sleepSeries = (field: keyof SleepLog): Point[] =>
    dateKeys.map(date => ({ date, value: (sleepByDate.get(date)?.[field] as number | null | undefined) ?? null }))
  const activitySeries = (selector: (acts: Activity[]) => number): Point[] =>
    dateKeys.map(date => ({ date, value: selector(activitiesByDate.get(date) ?? []) }))

  const recovery = metricSeries('recovery_score')
  const hrv = metricSeries('hrv_ms')
  const rhr = metricSeries('resting_hr_bpm')
  const strain = metricSeries('daily_strain')
  const calories = metricSeries('total_calories_kcal')
  const activeMin = metricSeries('active_min')
  const sleepHours = sleepSeries('hours')
  const sleepPerformance = sleepSeries('performance_pct')
  const sleepConsistency = sleepSeries('consistency_pct')
  const workoutCount = activitySeries(acts => acts.length)
  const workoutMinutes = activitySeries(acts => Math.round(sum(acts.map(a => a.moving_time_s)) / 60))

  const acts = activities ?? []
  const sleeps = sleepLogs ?? []
  const allMetrics = metrics ?? []
  const hasData = allMetrics.length > 0 || sleeps.length > 0 || acts.length > 0
  const firstLabel = axisLabel(locale, startDate)
  const lastLabel = axisLabel(locale, endDate)

  const totalTimeS = sum(acts.map(a => a.moving_time_s))
  const totalCalories = sum(acts.map(a => a.calories_kcal))
  const categoryCounts = acts.reduce<Record<string, number>>((acc, act) => {
    const key = act.activity_category ?? 'other'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const latestSleep = sleeps[sleeps.length - 1]
  const body = latestBody as BodyMeasurement | null

  const sleepStages = latestSleep
    ? [
        { key: 'deep', label: t('sleepStages.deep'), value: latestSleep.deep_hours ?? 0, color: '#0ea5e9' },
        { key: 'rem', label: t('sleepStages.rem'), value: latestSleep.rem_hours ?? 0, color: '#6366f1' },
        { key: 'light', label: t('sleepStages.light'), value: latestSleep.light_hours ?? 0, color: '#14b8a6' },
        { key: 'awake', label: t('sleepStages.awake'), value: latestSleep.awake_hours ?? 0, color: '#94a3b8' },
      ]
    : []
  const sleepStageTotal = sum(sleepStages.map(s => s.value))

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#111]">{t('title')}</h1>
          <p className="text-xs md:text-sm text-muted mt-0.5">{t('subtitle', { start: firstLabel, end: lastLabel })}</p>
        </div>
        <Link href={`/${locale}/perfil`} className="self-start md:self-auto text-xs font-semibold px-3 py-2 rounded-lg bg-surface border border-border text-[#444] hover:border-accent transition-colors">
          {t('syncCta')}
        </Link>
      </div>

      {!hasData ? (
        <EmptyState locale={locale} title={t('empty.title')} body={t('empty.body')} action={t('empty.action')} />
      ) : (
        <div className="space-y-5 md:space-y-6">
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t('averages')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
              <MetricCard label={t('metrics.recovery')} value={avg(recovery.map(p => p.value))} unit="%" color="#65a30d" />
              <MetricCard label={t('metrics.hrv')} value={avg(hrv.map(p => p.value), 1)} unit="ms" color="#2563eb" />
              <MetricCard label={t('metrics.rhr')} value={avg(rhr.map(p => p.value))} unit="bpm" color="#f97316" />
              <MetricCard label={t('metrics.strain')} value={avg(strain.map(p => p.value), 1)} color="#a855f7" />
              <MetricCard label={t('metrics.sleep')} value={avg(sleepHours.map(p => p.value), 1)} unit="h" color="#0891b2" />
              <MetricCard label={t('metrics.calories')} value={avg(calories.map(p => p.value))} unit="kcal" color="#e11d48" />
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <ChartCard title={t('sections.recoveryScore')} right={`${firstLabel} – ${lastLabel}`}>
              <LineChart series={[{ label: t('metrics.recovery'), color: '#65a30d', data: recovery }]} />
            </ChartCard>
            <ChartCard title={t('sections.hrvRhr')}>
              <LineChart
                series={[
                  { label: t('metrics.hrv'), color: '#2563eb', data: hrv },
                  { label: t('metrics.rhr'), color: '#f97316', data: rhr, dashed: true },
                ]}
              />
              <Legend items={[{ label: t('metrics.hrv'), color: '#2563eb' }, { label: t('metrics.rhr'), color: '#f97316', dashed: true }]} />
            </ChartCard>
          </section>

          <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
            <ChartCard title={t('sections.sleepTrends')} right={t('sections.avgSleep', { value: avg(sleepHours.map(p => p.value), 1) })}>
              <LineChart
                series={[
                  { label: t('metrics.sleep'), color: '#0891b2', data: sleepHours },
                  { label: t('metrics.sleepPerformance'), color: '#65a30d', data: sleepPerformance, dashed: true },
                  { label: t('metrics.sleepConsistency'), color: '#6366f1', data: sleepConsistency, dashed: true },
                ]}
              />
              <Legend
                items={[
                  { label: t('metrics.sleep'), color: '#0891b2' },
                  { label: t('metrics.sleepPerformance'), color: '#65a30d', dashed: true },
                  { label: t('metrics.sleepConsistency'), color: '#6366f1', dashed: true },
                ]}
              />
            </ChartCard>
            <ChartCard title={t('sections.latestSleep')} right={latestSleep?.hours ? `${numberLabel(latestSleep.hours, 1)}h` : undefined}>
              {sleepStageTotal > 0 ? (
                <>
                  <div className="h-3 rounded-full overflow-hidden flex bg-[#eeeeee] mb-4">
                    {sleepStages.map(stage => (
                      <div key={stage.key} style={{ width: `${(stage.value / sleepStageTotal) * 100}%`, background: stage.color }} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {sleepStages.map(stage => (
                      <div key={stage.key} className="flex items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-muted">
                          <span className="w-2 h-2 rounded-sm" style={{ background: stage.color }} />
                          {stage.label}
                        </span>
                        <span className="font-semibold text-[#333]">{numberLabel(stage.value, 1)}h</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">{t('empty.noSleepStages')}</p>
              )}
            </ChartCard>
          </section>

          <section className="grid lg:grid-cols-3 gap-4">
            <ChartCard title={t('sections.dailyStrain')}>
              <BarChart data={strain} color="#a855f7" maxValue={21} />
            </ChartCard>
            <ChartCard title={t('sections.activeMinutes')} right={formatDuration(totalTimeS)}>
              <BarChart data={activeMin.some(p => p.value) ? activeMin : workoutMinutes} color="#65a30d" />
            </ChartCard>
            <ChartCard title={t('sections.dailyCalories')} right={`${Math.round(totalCalories)} kcal`}>
              <BarChart data={calories} color="#e11d48" />
            </ChartCard>
          </section>

          <section className="grid lg:grid-cols-[0.9fr_1.1fr] gap-4">
            <ChartCard title={t('sections.workoutCount')} right={t('sections.totalWorkouts', { count: acts.length })}>
              <BarChart data={workoutCount} color="#f97316" />
            </ChartCard>
            <div className="bg-white border border-border rounded-xl p-4 md:p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t('sections.categoryMix')}</h3>
              {topCategories.length > 0 ? (
                <div className="space-y-3">
                  {topCategories.map(([category, count]) => {
                    const pct = (count / acts.length) * 100
                    return (
                      <div key={category}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#555] capitalize">{category}</span>
                          <span className="text-muted">{count}</span>
                        </div>
                        <div className="h-2 bg-[#eeeeee] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted">{t('empty.noWorkouts')}</p>
              )}
            </div>
          </section>

          <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <div className="px-4 md:px-5 py-4 border-b border-border">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">{t('sections.recentWorkouts')}</h3>
              </div>
              {acts.length > 0 ? (
                acts.slice(0, 8).map((act, i) => (
                  <div key={act.id} className={`flex items-center gap-3 px-4 md:px-5 py-3 ${i < Math.min(acts.length, 8) - 1 ? 'border-b border-dashed border-border' : ''}`}>
                    <div className="w-2.5 h-10 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[act.activity_category ?? 'other'] ?? CATEGORY_COLORS.other }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[#111] truncate">{act.activity_name ?? act.activity_category ?? act.source}</div>
                      <div className="text-xs text-muted">
                        {act.start_date_utc ? axisLabel(locale, act.start_date_utc.slice(0, 10)) : '—'} · {act.moving_time_s ? formatDuration(act.moving_time_s) : '—'}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted flex-shrink-0">
                      {act.strain != null && <div className="font-semibold text-[#555]">{numberLabel(act.strain, 1)}</div>}
                      {act.calories_kcal != null && <div>{Math.round(act.calories_kcal)} kcal</div>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted">{t('empty.noWorkouts')}</div>
              )}
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 md:p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">{t('sections.bodyComp')}</h3>
              {body ? (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t('body.weight'), value: numberLabel(body.weight_kg, 1), unit: 'kg', color: '#111111' },
                    { label: t('body.muscle'), value: numberLabel(body.muscle_mass_kg, 1), unit: 'kg', color: '#65a30d' },
                    { label: t('body.fat'), value: numberLabel(body.fat_percentage, 1), unit: '%', color: '#f97316' },
                    { label: t('body.date'), value: body.measured_at ? axisLabel(locale, body.measured_at) : '—', unit: '', color: '#555555' },
                  ].map(item => (
                    <div key={item.label} className="border-t border-border pt-3">
                      <div className="text-[10px] text-muted uppercase tracking-wide mb-1">{item.label}</div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold" style={{ color: item.color }}>{item.value}</span>
                        {item.unit && <span className="text-xs text-muted">{item.unit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{t('empty.noBody')}</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
