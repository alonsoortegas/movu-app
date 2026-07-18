import Link from 'next/link'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'

export type TodaySessionCardProps =
  | {
      state: 'session'
      locale: string
      title: string
      sessionType: string
      exerciseCount: number
      setCount: number
    }
  | { state: 'rest'; locale: string; nextTitle: string | null; nextDayLabel: string | null }
  | { state: 'no_plan'; locale: string }
  | { state: 'inactive'; locale: string; reason: 'not_started' | 'expired'; startDate: string }

export default async function TodaySessionCard(props: TodaySessionCardProps) {
  const t = await getTranslations('dashboard.todaySession')
  const { locale } = props

  let body: ReactNode
  let cta: { href: string; label: string }

  if (props.state === 'session') {
    body = (
      <>
        <p className="display mt-3 text-2xl font-bold leading-tight text-[var(--text)]">{props.title}</p>
        <p className="data mt-1 text-xs text-[var(--text-dim)]">
          {props.sessionType} · {t('exercises', { count: props.exerciseCount })} · {t('sets', { count: props.setCount })}
        </p>
      </>
    )
    cta = { href: `/${locale}/plan`, label: t('start') }
  } else if (props.state === 'rest') {
    body = (
      <>
        <p className="display mt-3 text-2xl font-bold leading-tight text-[var(--text)]">{t('restDay')}</p>
        {props.nextTitle && props.nextDayLabel && (
          <p className="data mt-1 text-xs text-[var(--text-dim)]">
            {t('nextUp', { title: props.nextTitle, day: props.nextDayLabel })}
          </p>
        )}
      </>
    )
    cta = { href: `/${locale}/plan`, label: t('viewPlan') }
  } else if (props.state === 'inactive') {
    body = (
      <p className="display mt-3 text-xl font-bold leading-tight text-[var(--text)]">
        {props.reason === 'not_started' ? t('notStarted', { date: props.startDate }) : t('expired')}
      </p>
    )
    cta = { href: `/${locale}/plan/edit`, label: t('editPlan') }
  } else {
    body = (
      <>
        <p className="display mt-3 text-xl font-bold leading-tight text-[var(--text)]">{t('noPlan')}</p>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t('noPlanBody')}</p>
      </>
    )
    cta = { href: `/${locale}/plan/edit`, label: t('createPlan') }
  }

  return (
    <section className="panel mobile-sheet rounded-[1.6rem] p-5 md:rounded-2xl">
      <p className="data text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">{t('label')}</p>
      {body}
      <Link href={cta.href} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-accent">
        {cta.label}
      </Link>
    </section>
  )
}
