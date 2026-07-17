'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import type { Database } from '@/types/database'
import ProgressRing from '@/components/mobile/ProgressRing'
import ProgressBar from '@/components/charts/ProgressBar'
import MealLogger from '@/components/nutrition/MealLogger'
import {
  MEAL_ORDER,
  calculateConsumed,
  calculateRemaining,
  type MacroTotals,
  type MealName,
  type NutritionDayType,
} from '@/lib/nutrition/macros'
import { mergeSavedFoodPortion } from '@/lib/nutrition/portions'

type Food = Database['public']['Tables']['food_items']['Row']
type Group = Database['public']['Tables']['food_substitution_groups']['Row']
type GroupItem = Database['public']['Tables']['food_substitution_group_items']['Row']
type SavedPortion = Database['public']['Tables']['saved_food_portions']['Row']
type Target = Database['public']['Tables']['nutrition_targets']['Row']
type MealLogRow = Database['public']['Tables']['meal_logs']['Row']
type MealLogItem = Database['public']['Tables']['meal_log_items']['Row']

const DAY_TYPES: NutritionDayType[] = ['hard', 'moderate', 'rest']
const MACRO_COLORS = { protein: '#38bdf8', carbs: '#fbbf24', fat: '#a78bfa' }

export default function NutritionToday({
  date,
  initialDayType,
  targets,
  initialMealLogs,
  initialItems,
  foods,
  groups,
  groupItems,
  initialPortions,
}: {
  date: string
  initialDayType: NutritionDayType | null
  targets: Target[]
  initialMealLogs: MealLogRow[]
  initialItems: MealLogItem[]
  foods: Food[]
  groups: Group[]
  groupItems: GroupItem[]
  initialPortions: SavedPortion[]
}) {
  const t = useTranslations('nutrition')
  const locale = useLocale()
  const [dayType, setDayType] = useState<NutritionDayType>(initialDayType ?? 'moderate')
  const [mealLogs, setMealLogs] = useState<MealLogRow[]>(initialMealLogs)
  const [items, setItems] = useState<MealLogItem[]>(initialItems)
  const [portions, setPortions] = useState<SavedPortion[]>(initialPortions)

  const target = useMemo(() => {
    const row = targets.find((row) => row.day_type === dayType) ?? targets[0]
    if (!row) return null
    const totals: MacroTotals = {
      calories: row.calories_target,
      protein_g: row.protein_target,
      carbs_g: row.carbs_target,
      fat_g: row.fat_target,
    }
    return totals
  }, [targets, dayType])

  const consumed = useMemo(() => calculateConsumed(items), [items])
  const remaining = target ? calculateRemaining(target, consumed) : null

  async function changeDayType(next: NutritionDayType) {
    setDayType(next)
    await fetch('/api/nutrition/day', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, day_type: next }),
    })
  }

  function handleLogged(mealName: MealName, item: MealLogItem, savedPortion: SavedPortion | null) {
    setItems((prev) => [...prev, item])
    setMealLogs((prev) =>
      prev.some((log) => log.id === item.meal_log_id)
        ? prev
        : [...prev, { id: item.meal_log_id, user_id: '', date, meal_name: mealName, logged_at: new Date().toISOString(), notes: null }],
    )
    if (savedPortion) setPortions((prev) => mergeSavedFoodPortion(prev, savedPortion))
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/nutrition/log/${id}`, { method: 'DELETE' })
    if (res.ok) setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const itemsByMeal = useMemo(() => {
    const map = new Map<MealName, MealLogItem[]>()
    const logById = new Map(mealLogs.map((log) => [log.id, log.meal_name as MealName]))
    for (const item of items) {
      const mealName = logById.get(item.meal_log_id)
      if (!mealName) continue
      map.set(mealName, [...(map.get(mealName) ?? []), item])
    }
    return map
  }, [items, mealLogs])

  const pct = (value: number, max: number) => (max > 0 ? (value / max) * 100 : 0)

  return (
    <div className="space-y-4">
      {/* Day type */}
      <div className="flex gap-1.5">
        {DAY_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => changeDayType(type)}
            className={`data flex-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              dayType === type ? 'btn-accent border-transparent' : 'border-[var(--border)] text-[var(--text-dim)]'
            }`}
          >
            {t(`dayType.${type}`)}
          </button>
        ))}
      </div>

      {!target ? (
        <div className="glass ticks rounded-2xl border border-[var(--border-hi)] p-5 text-center">
          <div className="mb-1 text-sm font-bold text-[var(--text)]">{t('noTargets.title')}</div>
          <p className="mx-auto mb-4 max-w-lg text-sm text-[var(--text-dim)]">{t('noTargets.body')}</p>
          <Link href={`/${locale}/nutricion/catalogo`} className="btn-accent inline-flex rounded-xl px-4 py-2.5 text-sm font-bold">
            {t('noTargets.action')}
          </Link>
        </div>
      ) : (
        <div className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl">
          <div className="flex items-center gap-4">
            <ProgressRing
              label="kcal"
              value={pct(consumed.calories, target.calories)}
              displayValue={String(Math.round(consumed.calories))}
              channel="lime"
            />
            <div className="flex-1 space-y-2.5">
              {(
                [
                  ['protein', consumed.protein_g, target.protein_g, MACRO_COLORS.protein],
                  ['carbs', consumed.carbs_g, target.carbs_g, MACRO_COLORS.carbs],
                  ['fat', consumed.fat_g, target.fat_g, MACRO_COLORS.fat],
                ] as const
              ).map(([key, value, max, color]) => (
                <div key={key}>
                  <div className="data mb-1 flex justify-between text-[10px] text-muted">
                    <span className="uppercase">{t(`macros.${key}`)}</span>
                    <span>
                      {Math.round(value)} / {Math.round(max)} g
                    </span>
                  </div>
                  <ProgressBar value={value} max={max} color={color} />
                </div>
              ))}
            </div>
          </div>
          {remaining && (
            <div className="data mt-3 border-t border-dashed border-[var(--border)] pt-2.5 text-[11px] text-[var(--text-dim)]">
              {remaining.calories >= 0
                ? t('remaining', { kcal: remaining.calories, protein: Math.max(0, remaining.protein_g) })
                : t('overTarget', { kcal: Math.abs(remaining.calories) })}
            </div>
          )}
        </div>
      )}

      <MealLogger
        date={date}
        foods={foods}
        groups={groups}
        groupItems={groupItems}
        portions={portions}
        onLogged={handleLogged}
      />

      {/* Meals */}
      {MEAL_ORDER.map((mealName) => {
        const mealItems = itemsByMeal.get(mealName) ?? []
        if (!mealItems.length) return null
        const mealTotals = calculateConsumed(mealItems)
        return (
          <div key={mealName} className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="data text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                {t(`logger.meals.${mealName}`)}
              </span>
              <span className="data text-[10px] text-[var(--text-dim)]">{Math.round(mealTotals.calories)} kcal</span>
            </div>
            <div className="space-y-1.5">
              {mealItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-[var(--text)]">
                      {item.name}
                      {item.quantity !== 1 && <span className="text-muted"> ×{item.quantity}</span>}
                    </div>
                    <div className="data text-[10px] text-muted">
                      {item.calories} kcal · P{item.protein_g} C{item.carbs_g} G{item.fat_g}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="glass h-7 w-7 flex-shrink-0 rounded-lg border border-[var(--border)] text-xs text-[var(--text-faint)] active:scale-95"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <Link
        href={`/${locale}/nutricion/catalogo`}
        className="data inline-block text-[11px] font-semibold text-accent underline-offset-2 hover:underline"
      >
        {t('openCatalog')} →
      </Link>
    </div>
  )
}
