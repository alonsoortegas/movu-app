import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import type { Database, HrZones } from '@/types/database'
import MobilePageIntro from '@/components/mobile/MobilePageIntro'
import { AxisRow, BarChart, BigSpark, ChartTitle, DualSpark, Legend } from '@/components/charts/charts'
import PhaseEditor from '@/components/trends/PhaseEditor'
import {
  computeBodyTrend,
  computeFuelTrends,
  computeLoadTrends,
  computeStrengthTrends,
  dateKey,
  type Chip,
  type FuelDay,
  type PhaseKind,
  type TrainingPhase,
  type Verdict,
} from '@/lib/trends/compute'

type DailyMetric = Database['public']['Tables']['daily_metrics']['Row']
type SleepLog = Database['public']['Tables']['sleep_logs']['Row']

const RANGES = ['4w', '12w', '6m', 'all'] as const
type TrendsRange = (typeof RANGES)[number]
const RANGE_DAYS: Record<TrendsRange, number | null> = { '4w': 28, '12w': 84, '6m': 183, all: null }

const MINT = '#00d26a'
const CYAN = '#38bdf8'
const VIOLET = '#a78bfa'
const CORAL = '#fb7185'
const AMBER = '#fbbf24'

const CHIP_GLYPH: Record<Chip, string> = { up: '↑', flat: '→', down: '↓' }
const CHIP_COLOR: Record<Chip, string> = { up: MINT, flat: AMBER, down: CORAL }
const VERDICT_COLOR: Record<Verdict, string> = { on_track: MINT, fast: AMBER, slow: CORAL }

const ZONE_COLORS = ['#1e293b', '#3b82f6', '#22c55e', '#f59e0b', '#f97316', '#ef4444']
const ZONE_LABELS = ['Z0', 'Z1', 'Z2', 'Z3', 'Z4', 'Z5']

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function axisLabel(locale: string, date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(parsed)
}

function numberLabel(value: number | null | undefined, decimals = 0): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value))
}

function signed(value: number, decimals = 2): string {
  const s = value.toFixed(decimals)
  return value > 0 ? `+${s}` : s
}

function zoneMinutes(zones: HrZones | null): number[] {
  if (!zones) return [0, 0, 0, 0, 0, 0]
  const minute = (min?: number, sec?: number) => min ?? (sec != null ? sec / 60 : 0)
  return [
    minute(zones.z0_min, undefined),
    minute(zones.z1_min, zones.z1_s),
    minute(zones.z2_min, zones.z2_s),
    minute(zones.z3_min, zones.z3_s),
    minute(zones.z4_min, zones.z4_s),
    minute(zones.z5_min, zones.z5_s),
  ]
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl md:p-5">{children}</div>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="data mt-2 border-b border-[var(--border)] pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
      {children}
    </div>
  )
}

function StatChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="data rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px]"
      style={{ color }}
    >
      {label}
    </span>
  )
}

function MiniStat({ label, value, unit, color, sub }: { label: string; value: string; unit?: string; color: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <div className="data text-[9px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-0.5">
        <span className="data text-xl font-bold leading-none" style={{ color }}>{value}</span>
        {unit && <span className="data text-[9px] text-muted">{unit}</span>}
      </div>
      {sub && <div className="data mt-1 text-[8px] text-[var(--text-faint)]">{sub}</div>}
    </div>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="data py-2 text-[11px] text-[var(--text-faint)]">{children}</div>
}

export default async function TrendsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ range?: string }>
}) {
  const { locale } = await params
  const { range: rangeParam } = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations('trends')

  const range: TrendsRange = RANGES.includes(rangeParam as TrendsRange)
    ? (rangeParam as TrendsRange)
    : '12w'
  const rangeDays = RANGE_DAYS[range]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/${locale}/trends`)

  const today = new Date()
  const todayKey = dateKey(today.toISOString())
  const startDate = rangeDays
    ? isoDate(new Date(today.getTime() - rangeDays * 86400000))
    : '2000-01-01'
  const startIso = `${startDate}T00:00:00Z`

  const [
    metricsResult,
    sleepResult,
    activitiesResult,
    bodyResult,
    setLogsResult,
    phasesResult,
    mealLogsResult,
    nutritionDaysResult,
    targetsResult,
    profileResult,
  ] = await Promise.all([
    supabase.from('daily_metrics').select('*').eq('user_id', user!.id).gte('date', startDate).order('date', { ascending: true }),
    supabase.from('sleep_logs').select('*').eq('user_id', user!.id).gte('date', startDate).order('date', { ascending: true }),
    supabase.from('activities').select('*').eq('user_id', user!.id).gte('start_date_utc', startIso).order('start_date_utc', { ascending: true }),
    supabase.from('body_measurements').select('measured_at, weight_kg').eq('user_id', user!.id).gte('measured_at', startDate).order('measured_at', { ascending: true }),
    supabase.from('workout_set_logs').select('logged_at, exercise_name, weight_kg, reps').eq('user_id', user!.id).gte('logged_at', startIso).order('logged_at', { ascending: true }),
    supabase.from('training_phases').select('*').eq('user_id', user!.id).order('start_date', { ascending: false }),
    supabase.from('meal_logs').select('id, date, meal_log_items ( calories, protein_g )').eq('user_id', user!.id).gte('date', startDate),
    supabase.from('nutrition_days').select('date, day_type').eq('user_id', user!.id).gte('date', startDate),
    supabase.from('nutrition_targets').select('*').eq('user_id', user!.id),
    supabase.from('user_profiles').select('whoop_user_id').eq('id', user!.id).maybeSingle(),
  ])

  const queryError =
    metricsResult.error ?? sleepResult.error ?? activitiesResult.error ?? bodyResult.error ??
    setLogsResult.error ?? phasesResult.error ?? mealLogsResult.error ?? nutritionDaysResult.error ??
    targetsResult.error ?? profileResult.error
  if (queryError) console.error('Failed to load trends data', queryError)

  const metrics = metricsResult.data ?? []
  const sleeps = sleepResult.data ?? []
  const activities = activitiesResult.data ?? []
  const measurements = bodyResult.data ?? []
  const setLogs = setLogsResult.data ?? []
  const phases = phasesResult.data ?? []
  // Relationships are not declared in the hand-maintained Database type, so the
  // nested select needs an explicit shape.
  const mealLogs = (mealLogsResult.data ?? []) as unknown as Array<{
    id: string
    date: string
    meal_log_items: Array<{ calories: number | null; protein_g: number | null }> | null
  }>
  const nutritionDays = nutritionDaysResult.data ?? []
  const targets = targetsResult.data ?? []
  const whoopConnected = profileResult.data?.whoop_user_id != null

  // ── Body ────────────────────────────────────────────────────────────────────
  const openPhaseRow = phases.find((p) => p.end_date == null || p.end_date >= todayKey)
  const activePhase: TrainingPhase | null = openPhaseRow
    ? {
        phase: openPhaseRow.kind as PhaseKind,
        started_on: openPhaseRow.start_date,
        target_rate_kg_per_week: openPhaseRow.target_rate_kg_per_week,
      }
    : null
  const bodyTrend = computeBodyTrend(
    measurements.map((m) => ({ measured_on: m.measured_at, weight_kg: m.weight_kg })),
    activePhase,
    todayKey,
  )

  // ── Strength ────────────────────────────────────────────────────────────────
  const strength = computeStrengthTrends(setLogs, todayKey)

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = computeLoadTrends(
    activities
      .filter((a) => a.start_date_utc != null)
      .map((a) => ({
        start: a.start_date_utc!,
        category: a.activity_category === 'walk' ? ('lifestyle' as const) : ('training' as const),
        minutes: a.moving_time_s != null ? Math.round(a.moving_time_s / 60) : null,
      })),
    metrics.map((m: DailyMetric) => ({ date: m.date, strain: m.daily_strain })),
  )

  // ── Fuel ────────────────────────────────────────────────────────────────────
  const targetByDayType = new Map(targets.map((row) => [row.day_type, row]))
  const dayTypeByDate = new Map(nutritionDays.map((row) => [row.date, row.day_type]))
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
  const fuelDays: FuelDay[] = [...fuelDates].map((date) => {
    const agg = fuelByDate.get(date)
    const target = targetByDayType.get(dayTypeByDate.get(date) ?? 'moderate')
    return {
      date,
      kcal: Math.round(agg?.kcal ?? 0),
      protein: Math.round(agg?.protein ?? 0),
      kcalTarget: target?.calories_target ?? null,
      proteinTarget: target?.protein_target ?? null,
      logged: (agg?.items ?? 0) > 0,
    }
  })
  const latestWeightKg = bodyTrend.weights.length
    ? bodyTrend.weights[bodyTrend.weights.length - 1].value
    : null
  const fuel = computeFuelTrends(fuelDays, todayKey, {
    actualRatePerWeek: bodyTrend.ratePerWeek,
    latestWeightKg,
  })

  // ── Recovery ────────────────────────────────────────────────────────────────
  const recoverySeries = metrics.map((m) => m.recovery_score).filter((v): v is number => v != null)
  const hrvSeries = metrics.map((m) => m.hrv_ms).filter((v): v is number => v != null)
  const rhrSeries = metrics.map((m) => m.resting_hr_bpm).filter((v): v is number => v != null)
  const strainRecovery = metrics.filter((m) => m.daily_strain != null && m.recovery_score != null)
  const sleepHours = sleeps.map((s: SleepLog) => s.hours).filter((v): v is number => v != null)
  const latestSleep = sleeps[sleeps.length - 1]
  const zoneTotals = activities.reduce<number[]>((acc, a) => {
    const z = zoneMinutes((a.hr_zones as HrZones | null) ?? null)
    return acc.map((v, i) => v + z[i])
  }, [0, 0, 0, 0, 0, 0])
  const zoneSum = zoneTotals.reduce((s, v) => s + v, 0)

  const hasAnyData =
    metrics.length > 0 || sleeps.length > 0 || activities.length > 0 ||
    measurements.length > 0 || setLogs.length > 0 || fuelDays.length > 0

  const avgOf = (xs: number[], decimals = 0) =>
    xs.length ? numberLabel(xs.reduce((s, v) => s + v, 0) / xs.length, decimals) : '—'

  const weightValues = bodyTrend.weights.map((p) => p.value)
  const rolling7Values = bodyTrend.rolling7.map((p) => p.value)

  const firstBodyDate = bodyTrend.weights[0]?.date
  const lastBodyDate = bodyTrend.weights[bodyTrend.weights.length - 1]?.date

  const sleepStages = latestSleep
    ? [
        { key: 'deep', label: t('sleepStages.deep'), value: latestSleep.deep_hours ?? 0, color: '#0ea5e9' },
        { key: 'rem', label: t('sleepStages.rem'), value: latestSleep.rem_hours ?? 0, color: '#6366f1' },
        { key: 'light', label: t('sleepStages.light'), value: latestSleep.light_hours ?? 0, color: '#14b8a6' },
        { key: 'awake', label: t('sleepStages.awake'), value: latestSleep.awake_hours ?? 0, color: '#94a3b8' },
      ]
    : []
  const sleepStageTotal = sleepStages.reduce((s, stage) => s + stage.value, 0)

  return (
    <div className="boot mx-auto max-w-6xl p-4 md:p-8">
      <MobilePageIntro
        title={t('title')}
        eyebrow={t('subtitle')}
        aside={
          <Link href={`/${locale}/perfil`} className="glass grid min-h-11 min-w-11 place-items-center rounded-full border border-[var(--border)] text-base text-accent">
            ↻<span className="sr-only">{t('syncCta')}</span>
          </Link>
        }
      />
      <div className="mb-6 hidden items-end justify-between gap-3 md:flex">
        <div>
          <h1 className="display text-2xl font-bold text-[var(--text)]">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-muted">{t('subtitle')}</p>
        </div>
      </div>

      {/* Range selector */}
      <div className="mb-5 flex gap-1.5">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/${locale}/trends?range=${r}`}
            className={`data rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
              r === range
                ? 'border-accent bg-accent-light text-[var(--text)]'
                : 'border-[var(--border)] text-[var(--text-dim)]'
            }`}
          >
            {t(`ranges.${r}`)}
          </Link>
        ))}
      </div>

      {!hasAnyData ? (
        <div className="glass ticks rounded-2xl border border-[var(--border-hi)] p-5 text-center md:p-6">
          <div className="mb-1 text-sm font-bold text-[var(--text)]">{t('empty.title')}</div>
          <p className="mx-auto mb-4 max-w-lg text-sm text-[var(--text-dim)]">{t('empty.body')}</p>
          <Link href={`/${locale}/perfil`} className="btn-accent inline-flex rounded-xl px-4 py-2.5 text-sm font-bold">
            {t('empty.action')}
          </Link>
        </div>
      ) : (
        <div className="space-y-5 md:space-y-6">
          {/* ── Body ── */}
          <SectionLabel>{t('sectionsV2.body')}</SectionLabel>
          <Panel>
            <ChartTitle
              title={t('charts.weight')}
              right={
                <span className="flex gap-1.5">
                  {bodyTrend.ratePerWeek != null && (
                    <StatChip
                      label={`${signed(bodyTrend.ratePerWeek)} kg/${t('perWeek')}`}
                      color={bodyTrend.verdict ? VERDICT_COLOR[bodyTrend.verdict] : 'var(--text-dim)'}
                    />
                  )}
                  {bodyTrend.verdict && (
                    <StatChip label={t(`verdict.${bodyTrend.verdict}`)} color={VERDICT_COLOR[bodyTrend.verdict]} />
                  )}
                </span>
              }
            />
            {weightValues.length >= 2 ? (
              <>
                <DualSpark dataA={weightValues} dataB={rolling7Values} colorA={CYAN} colorB={MINT} />
                <Legend
                  items={[
                    { label: t('charts.weighIns'), color: CYAN },
                    { label: t('charts.rolling7'), color: MINT, dashed: true },
                  ]}
                />
                {firstBodyDate && lastBodyDate && (
                  <AxisRow first={axisLabel(locale, firstBodyDate)} last={axisLabel(locale, lastBodyDate)} />
                )}
              </>
            ) : (
              <EmptyNote>{t('emptyV2.noWeight')}</EmptyNote>
            )}
            {bodyTrend.sinceStart && activePhase && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniStat
                  label={t(`phases.kind.${activePhase.phase}`)}
                  value={signed(bodyTrend.sinceStart.totalKg)}
                  unit="kg"
                  color={VIOLET}
                  sub={t('phases.sinceStart', { days: bodyTrend.sinceStart.days })}
                />
                <MiniStat
                  label={t('charts.avgRate')}
                  value={bodyTrend.sinceStart.avgPerWeek != null ? signed(bodyTrend.sinceStart.avgPerWeek) : '—'}
                  unit={`kg/${t('perWeek')}`}
                  color={CYAN}
                />
                <MiniStat
                  label={t('charts.targetRate')}
                  value={bodyTrend.targetRate != null ? signed(bodyTrend.targetRate) : '—'}
                  unit={`kg/${t('perWeek')}`}
                  color={MINT}
                />
              </div>
            )}
            <PhaseEditor
              phases={phases.map((p) => ({
                id: p.id,
                kind: p.kind as PhaseKind,
                start_date: p.start_date,
                end_date: p.end_date,
                target_rate_kg_per_week: p.target_rate_kg_per_week,
              }))}
            />
          </Panel>

          {/* ── Strength ── */}
          <SectionLabel>{t('sectionsV2.strength')}</SectionLabel>
          {strength.exercises.length > 0 ? (
            <>
              <div className="flex gap-1.5">
                {strength.strengthChip && (
                  <StatChip
                    label={`${t('charts.e1rm')} ${CHIP_GLYPH[strength.strengthChip]}`}
                    color={CHIP_COLOR[strength.strengthChip]}
                  />
                )}
                {strength.volumeChip && (
                  <StatChip
                    label={`${t('charts.volume')} ${CHIP_GLYPH[strength.volumeChip]}`}
                    color={CHIP_COLOR[strength.volumeChip]}
                  />
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {strength.exercises.slice(0, 4).map((ex) => (
                  <Panel key={ex.exercise}>
                    <ChartTitle
                      title={ex.exercise}
                      right={
                        ex.slopePctPerWeek != null ? (
                          <span className="data text-[10px]" style={{ color: ex.slopePctPerWeek > 1 ? MINT : ex.slopePctPerWeek < -1 ? CORAL : AMBER }}>
                            {signed(ex.slopePctPerWeek, 1)}%/{t('perWeek')}
                          </span>
                        ) : undefined
                      }
                    />
                    <BigSpark data={ex.points.map((p) => p.value)} color={VIOLET} height={56} />
                    <AxisRow
                      first={ex.points[0] ? axisLabel(locale, ex.points[0].date) : '—'}
                      last={ex.points[ex.points.length - 1] ? axisLabel(locale, ex.points[ex.points.length - 1].date) : '—'}
                    />
                  </Panel>
                ))}
              </div>
              <Panel>
                <ChartTitle
                  title={t('charts.weeklyTonnage')}
                  right={<span className="data text-[10px] text-muted">{numberLabel(strength.weeklyTonnage.reduce((s, w) => s + w.kg, 0))} kg</span>}
                />
                <BarChart data={strength.weeklyTonnage.map((w) => w.kg)} color={VIOLET} />
                <AxisRow
                  first={strength.weeklyTonnage[0] ? axisLabel(locale, strength.weeklyTonnage[0].week) : '—'}
                  last={strength.weeklyTonnage.length ? axisLabel(locale, strength.weeklyTonnage[strength.weeklyTonnage.length - 1].week) : '—'}
                />
              </Panel>
            </>
          ) : (
            <Panel>
              <EmptyNote>{t('emptyV2.noSets')}</EmptyNote>
            </Panel>
          )}

          {/* ── Load ── */}
          <SectionLabel>{t('sectionsV2.load')}</SectionLabel>
          <Panel>
            <ChartTitle
              title={t('charts.weeklyMinutes')}
              right={
                <span className="data text-[10px] text-muted">
                  {t('charts.sessions', { count: load.weeks.reduce((s, w) => s + w.sessions, 0) })}
                </span>
              }
            />
            {load.weeks.length > 0 ? (
              <>
                <BarChart data={load.weeks.map((w) => w.trainingMin)} color={CYAN} />
                <AxisRow
                  first={axisLabel(locale, load.weeks[0].week)}
                  last={axisLabel(locale, load.weeks[load.weeks.length - 1].week)}
                />
              </>
            ) : (
              <EmptyNote>{t('emptyV2.noActivities')}</EmptyNote>
            )}
          </Panel>

          {/* ── Fuel ── */}
          <SectionLabel>{t('sectionsV2.fuel')}</SectionLabel>
          <Panel>
            <ChartTitle
              title={t('charts.dailyKcal')}
              right={
                fuel.adherence.loggedPct != null ? (
                  <span className="data text-[10px] text-muted">
                    {t('charts.loggedPct', { pct: fuel.adherence.loggedPct })}
                  </span>
                ) : undefined
              }
            />
            {fuel.days.some((d) => d.logged) ? (
              <>
                <BarChart
                  data={fuel.days.map((d) => d.kcal)}
                  colors={fuel.days.map((d) =>
                    d.kcalTarget && Math.abs(d.kcal - d.kcalTarget) <= 0.1 * d.kcalTarget ? MINT : AMBER,
                  )}
                />
                <AxisRow
                  first={axisLabel(locale, fuel.days[0].date)}
                  last={axisLabel(locale, fuel.days[fuel.days.length - 1].date)}
                />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MiniStat label={t('charts.kcalAdherence')} value={fuel.adherence.kcalWithin10Pct != null ? `${fuel.adherence.kcalWithin10Pct}` : '—'} unit="%" color={MINT} />
                  <MiniStat label={t('charts.proteinHit')} value={fuel.adherence.proteinHitPct != null ? `${fuel.adherence.proteinHitPct}` : '—'} unit="%" color={CYAN} />
                  <MiniStat label={t('charts.proteinPerKg')} value={fuel.proteinPerKg != null ? fuel.proteinPerKg.toFixed(1) : '—'} unit="g/kg" color={VIOLET} />
                </div>
              </>
            ) : (
              <EmptyNote>{t('emptyV2.noMeals')}</EmptyNote>
            )}
          </Panel>

          {/* ── Recovery ── */}
          <SectionLabel>{t('sectionsV2.recovery')}</SectionLabel>
          {!whoopConnected && metrics.length === 0 && (
            <Panel>
              <p className="mb-3 text-sm text-[var(--text-dim)]">{t('whoop.connectBody')}</p>
              <Link href={`/${locale}/perfil`} className="btn-accent inline-flex rounded-xl px-4 py-2 text-xs font-bold">
                {t('whoop.connectCta')}
              </Link>
            </Panel>
          )}
          {metrics.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label={t('metrics.recovery')} value={avgOf(recoverySeries)} unit="%" color={MINT} />
                <MiniStat label={t('metrics.hrv')} value={avgOf(hrvSeries, 1)} unit="ms" color={CYAN} />
                <MiniStat label={t('metrics.rhr')} value={avgOf(rhrSeries)} unit="bpm" color={CORAL} />
              </div>
              <Panel>
                <ChartTitle title={t('charts.recovery')} />
                {recoverySeries.length >= 2 ? (
                  <BigSpark data={recoverySeries} colorByValue />
                ) : (
                  <EmptyNote>{t('emptyV2.noRecovery')}</EmptyNote>
                )}
              </Panel>
              <div className="grid gap-4 md:grid-cols-2">
                <Panel>
                  <ChartTitle title={t('sections.hrvRhr')} />
                  {hrvSeries.length >= 2 && rhrSeries.length >= 2 ? (
                    <>
                      <DualSpark dataA={hrvSeries} dataB={rhrSeries} colorA={CYAN} colorB={CORAL} />
                      <Legend items={[{ label: t('metrics.hrv'), color: CYAN }, { label: t('metrics.rhr'), color: CORAL, dashed: true }]} />
                    </>
                  ) : (
                    <EmptyNote>{t('emptyV2.noRecovery')}</EmptyNote>
                  )}
                </Panel>
                <Panel>
                  <ChartTitle title={t('charts.strainVsRecovery')} />
                  {strainRecovery.length >= 2 ? (
                    <>
                      <DualSpark
                        dataA={strainRecovery.map((m) => m.daily_strain!)}
                        dataB={strainRecovery.map((m) => m.recovery_score!)}
                        colorA={AMBER}
                        colorB={MINT}
                      />
                      <Legend items={[{ label: t('metrics.strain'), color: AMBER }, { label: t('metrics.recovery'), color: MINT, dashed: true }]} />
                    </>
                  ) : (
                    <EmptyNote>{t('emptyV2.noRecovery')}</EmptyNote>
                  )}
                </Panel>
              </div>
            </>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Panel>
              <ChartTitle title={t('charts.sleepHours')} right={<span className="data text-[10px] text-muted">{avgOf(sleepHours, 1)}h {t('charts.avg')}</span>} />
              {sleepHours.length > 0 ? (
                <BarChart data={sleepHours} color={VIOLET} maxVal={10} />
              ) : (
                <EmptyNote>{t('emptyV2.noSleep')}</EmptyNote>
              )}
              {sleepStageTotal > 0 && (
                <div className="mt-4">
                  <div className="mb-2 flex h-2.5 overflow-hidden rounded-full bg-[var(--ring-track)]">
                    {sleepStages.map((stage) => (
                      <div key={stage.key} style={{ width: `${(stage.value / sleepStageTotal) * 100}%`, background: stage.color }} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {sleepStages.map((stage) => (
                      <div key={stage.key} className="flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1.5 text-muted">
                          <span className="h-2 w-2 rounded-sm" style={{ background: stage.color }} />
                          {stage.label}
                        </span>
                        <span className="data font-semibold text-[var(--text)]">{numberLabel(stage.value, 1)}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
            <Panel>
              <ChartTitle title={t('charts.hrZones')} />
              {zoneSum > 0 ? (
                <div className="space-y-2">
                  {zoneTotals.map((minutes, i) => (
                    <div key={ZONE_LABELS[i]} className="flex items-center gap-2">
                      <span className="data w-6 text-[10px] text-muted">{ZONE_LABELS[i]}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--ring-track)]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(minutes / zoneSum) * 100}%`, background: ZONE_COLORS[i] }}
                        />
                      </div>
                      <span className="data w-12 text-right text-[10px] text-[var(--text-dim)]">
                        {numberLabel(minutes)} min
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyNote>{t('emptyV2.noZones')}</EmptyNote>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}
