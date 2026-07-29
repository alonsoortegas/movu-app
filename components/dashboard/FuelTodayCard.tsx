import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { MacroTotals, NutritionDayType } from '@/lib/nutrition/macros'

const KCAL_COLOR = '#fbbf24'
const PROTEIN_COLOR = '#38bdf8'

function MacroBar({
  label,
  consumed,
  target,
  color,
}: {
  label: string
  consumed: number
  target: number | null
  color: string
}) {
  const pct = target && target > 0 ? Math.min((consumed / target) * 100, 100) : 0
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[var(--text-dim)]">{label}</span>
        <span className="data text-[var(--text-faint)]">
          {Math.round(consumed)}
          {target != null ? ` / ${Math.round(target)}` : ''}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ring-track)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default async function FuelTodayCard({
  locale,
  dayType,
  consumed,
  target,
}: {
  locale: string
  dayType: NutritionDayType
  consumed: MacroTotals
  target: MacroTotals | null
}) {
  const t = await getTranslations('dashboard.fuel')
  const remainingKcal = target ? Math.round(target.calories - consumed.calories) : null
  const remainingProtein = target ? Math.max(0, Math.round(target.protein_g - consumed.protein_g)) : null

  return (
    <section className="panel mobile-sheet rounded-[1.6rem] p-5 md:rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <p className="data text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">{t('label')}</p>
        <span className="data rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-dim)]">
          {t(`dayType.${dayType}`)}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <MacroBar label={t('kcal')} consumed={consumed.calories} target={target?.calories ?? null} color={KCAL_COLOR} />
        <MacroBar label={t('protein')} consumed={consumed.protein_g} target={target?.protein_g ?? null} color={PROTEIN_COLOR} />
      </div>
      <p className="mt-3 text-xs text-[var(--text-dim)]">{t('todayFuelHelp')}</p>
      {target && remainingKcal != null ? (
        <p className="data mt-3 text-xs text-[var(--text-dim)]">
          {remainingKcal >= 0
            ? t('remaining', { kcal: remainingKcal, protein: remainingProtein! })
            : t('over', { kcal: Math.abs(remainingKcal) })}
        </p>
      ) : (
        <p className="data mt-3 text-xs text-[var(--text-dim)]">{t('noTargets')}</p>
      )}
      <Link href={`/${locale}/nutricion`} className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-accent">
        {t('logMeal')}
      </Link>
    </section>
  )
}
