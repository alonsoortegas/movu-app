import Link from 'next/link'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { BarChart } from '@/components/charts/charts'
import type { PhaseKind, Verdict } from '@/lib/trends/compute'
import type { PaddedLoadWeek } from '@/lib/dashboard/today'

const MINT = '#00d26a'
const CYAN = '#38bdf8'
const CORAL = '#fb7185'
const AMBER = '#fbbf24'
const VERDICT_COLOR: Record<Verdict, string> = { on_track: MINT, fast: AMBER, slow: CORAL }

export interface WeekStripProps {
  locale: string
  body: { phase: PhaseKind | null; ratePerWeek: number; verdict: Verdict | null } | null
  adherence: { loggedPct: number | null; kcalWithin10Pct: number | null; proteinHitPct: number | null } | null
  loadWeeks: PaddedLoadWeek[]
}

function signed(value: number, decimals = 2): string {
  const s = value.toFixed(decimals)
  return value > 0 ? `+${s}` : s
}

function weekLabel(locale: string, date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(parsed)
}

function StripPanel({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="panel mobile-sheet block rounded-[1.6rem] p-4 transition-colors hover:border-accent md:rounded-2xl">
      {children}
    </Link>
  )
}

function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <p className="data text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">{children}</p>
  )
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="data mt-3 text-[11px] text-[var(--text-faint)]">{children}</p>
}

function AdherenceStat({ label, pct, color }: { label: string; pct: number | null; color: string }) {
  return (
    <div>
      <div className="data text-lg font-bold leading-none" style={{ color }}>
        {pct != null ? `${pct}%` : '—'}
      </div>
      <div className="data mt-1 text-[9px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  )
}

export default async function WeekStrip({ locale, body, adherence, loadWeeks }: WeekStripProps) {
  const t = await getTranslations('dashboard.week')
  const trendsHref = `/${locale}/trends`
  const sessionsThisWeek = loadWeeks.find((w) => w.isCurrent)?.sessions ?? 0
  const hasLoad = loadWeeks.some((w) => w.trainingMin > 0)
  const hasAdherence = adherence != null && adherence.loggedPct != null

  return (
    <div>
      <h2 className="data mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
        {t('label')}
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        <StripPanel href={trendsHref}>
          <PanelLabel>{t('weight')}</PanelLabel>
          {body ? (
            <>
              <p
                className="data mt-3 text-xl font-bold leading-none"
                style={{ color: body.verdict ? VERDICT_COLOR[body.verdict] : 'var(--text)' }}
              >
                {signed(body.ratePerWeek)} kg/{t('perWeek')}
              </p>
              <p className="data mt-2 text-[10px] uppercase tracking-wide text-muted">
                {[body.phase ? t(`phase.${body.phase}`) : null, body.verdict ? t(`verdict.${body.verdict}`) : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </>
          ) : (
            <EmptyNote>{t('noWeight')}</EmptyNote>
          )}
        </StripPanel>

        <StripPanel href={trendsHref}>
          <PanelLabel>{t('adherence')}</PanelLabel>
          {hasAdherence ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <AdherenceStat label={t('logged')} pct={adherence.loggedPct} color={MINT} />
              <AdherenceStat label={t('kcalOk')} pct={adherence.kcalWithin10Pct} color={AMBER} />
              <AdherenceStat label={t('proteinOk')} pct={adherence.proteinHitPct} color={CYAN} />
            </div>
          ) : (
            <EmptyNote>{t('noFuel')}</EmptyNote>
          )}
        </StripPanel>

        <StripPanel href={trendsHref}>
          <PanelLabel>{t('load')}</PanelLabel>
          {hasLoad ? (
            <>
              <div className="mt-3">
                <BarChart
                  data={loadWeeks.map((w) => w.trainingMin)}
                  colors={loadWeeks.map((w) => (w.isCurrent ? MINT : CYAN))}
                  height={48}
                  showAxis
                  labels={loadWeeks.map((w) => weekLabel(locale, w.week))}
                  valueLabels={loadWeeks.map((w) => `${w.trainingMin} min`)}
                />
              </div>
              <p className="data mt-2 text-[10px] uppercase tracking-wide text-muted">
                {t('sessions', { count: sessionsThisWeek })}
              </p>
            </>
          ) : (
            <EmptyNote>{t('noLoad')}</EmptyNote>
          )}
        </StripPanel>
      </div>
    </div>
  )
}
