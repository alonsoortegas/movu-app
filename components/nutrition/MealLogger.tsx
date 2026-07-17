'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Database } from '@/types/database'
import {
  MEAL_ORDER,
  getSubstitutions,
  parseGenericFoodDraft,
  type GenericFoodDraft,
  type MealName,
} from '@/lib/nutrition/macros'
import {
  buildPortionOptions,
  scalePortionOption,
  type PortionOption,
} from '@/lib/nutrition/portions'

type Food = Database['public']['Tables']['food_items']['Row']
type GroupItem = Database['public']['Tables']['food_substitution_group_items']['Row']
type Group = Database['public']['Tables']['food_substitution_groups']['Row']
type SavedPortion = Database['public']['Tables']['saved_food_portions']['Row']
type MealLogItem = Database['public']['Tables']['meal_log_items']['Row']

const EMPTY_DRAFT: GenericFoodDraft = { name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' }
const QUANTITY_STEP = 0.25

export default function MealLogger({
  date,
  foods,
  groups,
  groupItems,
  portions,
  onLogged,
}: {
  date: string
  foods: Food[]
  groups: Group[]
  groupItems: GroupItem[]
  portions: SavedPortion[]
  onLogged: (mealName: MealName, item: MealLogItem, savedPortion: SavedPortion | null) => void
}) {
  const t = useTranslations('nutrition.logger')
  const [meal, setMeal] = useState<MealName>('breakfast')
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [draft, setDraft] = useState<GenericFoodDraft>(EMPTY_DRAFT)
  const [saveAsPortion, setSaveAsPortion] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Saved portions first — they encode the user's own habits.
  const options = useMemo(() => {
    const built = buildPortionOptions(foods, portions)
    return [...built.filter((o) => o.source === 'saved'), ...built.filter((o) => o.source === 'catalog')]
  }, [foods, portions])

  const selected = options.find((o) => o.key === selectedKey) ?? null
  const scaled = selected ? scalePortionOption(selected, quantity) : null

  const substitutions = useMemo(() => {
    if (!selected || selected.source !== 'catalog') return []
    return getSubstitutions(
      selected.sourceId,
      foods,
      groupItems.map((item) => ({
        groupName: groups.find((g) => g.id === item.group_id)?.name ?? item.group_id,
        foodItemId: item.food_item_id,
        quantity: item.quantity,
        label: item.label,
      })),
    )
  }, [selected, foods, groups, groupItems])

  function fail(message: string) {
    setError(message)
    setTimeout(() => setError(null), 3000)
  }

  async function submit(payload: {
    food_item_id: string | null
    name: string
    quantity: number
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    save_as_portion?: boolean
  }) {
    if (busy) return
    setBusy(true)
    const res = await fetch('/api/nutrition/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        meal_name: meal,
        item: payload,
        save_as_portion: payload.save_as_portion ?? false,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      fail(t('logFailed'))
      return
    }
    const data = await res.json()
    onLogged(meal, data.item, data.savedPortion ?? null)
    setSelectedKey(null)
    setQuantity(1)
    setDraft(EMPTY_DRAFT)
  }

  function logSelected() {
    if (!selected || !scaled) return
    void submit({
      food_item_id: selected.source === 'catalog' ? selected.sourceId : null,
      name: selected.name,
      quantity,
      calories: scaled.calories,
      protein_g: scaled.protein_g,
      carbs_g: scaled.carbs_g,
      fat_g: scaled.fat_g,
    })
  }

  function logSubstitution(sub: ReturnType<typeof getSubstitutions>[number]) {
    void submit({
      food_item_id: sub.foodItemId,
      name: sub.foodName,
      quantity: sub.quantity,
      calories: sub.calories,
      protein_g: sub.protein_g,
      carbs_g: sub.carbs_g,
      fat_g: sub.fat_g,
    })
  }

  function logCustom() {
    const parsed = parseGenericFoodDraft(draft)
    if (!parsed.ok) {
      fail(t(`draftError.${parsed.error}`))
      return
    }
    void submit({
      food_item_id: null,
      name: parsed.value.name,
      quantity: 1,
      calories: parsed.value.calories,
      protein_g: parsed.value.protein_g,
      carbs_g: parsed.value.carbs_g,
      fat_g: parsed.value.fat_g,
      save_as_portion: saveAsPortion,
    })
  }

  const inputCls =
    'glass rounded-lg border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--text)]'

  return (
    <div className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl">
      <div className="data mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">{t('title')}</div>

      {/* Meal chips */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {MEAL_ORDER.map((m) => (
          <button
            key={m}
            onClick={() => setMeal(m)}
            className={`data flex-shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold ${
              meal === m ? 'border-accent bg-accent-light text-[var(--text)]' : 'border-[var(--border)] text-[var(--text-dim)]'
            }`}
          >
            {t(`meals.${m}`)}
          </button>
        ))}
      </div>

      {/* Mode toggle */}
      <div className="mb-3 flex gap-1.5">
        {(['catalog', 'custom'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`data flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${
              mode === m ? 'border-accent bg-accent-light text-[var(--text)]' : 'border-[var(--border)] text-[var(--text-dim)]'
            }`}
          >
            {t(`mode.${m}`)}
          </button>
        ))}
      </div>

      {error && <p className="mb-2 text-[11px] text-[var(--coral)]">{error}</p>}

      {mode === 'catalog' ? (
        options.length === 0 ? (
          <p className="data text-[11px] text-[var(--text-faint)]">{t('emptyCatalog')}</p>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedKey ?? ''}
              onChange={(e) => {
                setSelectedKey(e.target.value || null)
                setQuantity(1)
              }}
              className={`${inputCls} w-full`}
            >
              <option value="">{t('pickFood')}</option>
              {options.map((o: PortionOption) => (
                <option key={o.key} value={o.key}>
                  {o.source === 'saved' ? '★ ' : ''}
                  {o.name} · {o.portionLabel}
                </option>
              ))}
            </select>

            {selected && scaled && (
              <>
                <div className="flex items-center gap-2">
                  <span className="data w-16 text-[10px] uppercase text-muted">{t('quantity')}</span>
                  <button
                    className="glass h-9 w-9 rounded-lg border border-[var(--border)] text-lg text-[var(--text-dim)] active:scale-95"
                    onClick={() => setQuantity((q) => Math.max(QUANTITY_STEP, Math.round((q - QUANTITY_STEP) * 100) / 100))}
                  >
                    −
                  </button>
                  <span className="data w-12 text-center text-sm font-bold text-[var(--text)]">{quantity}</span>
                  <button
                    className="glass h-9 w-9 rounded-lg border border-[var(--border)] text-lg text-[var(--text-dim)] active:scale-95"
                    onClick={() => setQuantity((q) => Math.round((q + QUANTITY_STEP) * 100) / 100)}
                  >
                    +
                  </button>
                  <span className="data ml-auto text-[11px] text-[var(--text-dim)]">
                    {scaled.calories} kcal · P{scaled.protein_g} C{scaled.carbs_g} G{scaled.fat_g}
                  </span>
                </div>

                <button onClick={logSelected} disabled={busy} className="btn-accent w-full rounded-xl px-3 py-2.5 text-sm font-bold disabled:opacity-60">
                  {t('log')}
                </button>

                {substitutions.length > 0 && (
                  <div>
                    <div className="data mb-1.5 text-[10px] uppercase text-muted">{t('swapTitle')}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {substitutions.map((sub) => (
                        <button
                          key={`${sub.groupName}-${sub.foodItemId}-${sub.label}`}
                          onClick={() => logSubstitution(sub)}
                          disabled={busy}
                          className="data rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] text-[var(--violet)] active:scale-95"
                        >
                          {sub.label} · {sub.calories} kcal
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      ) : (
        <div className="space-y-2">
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder={t('fields.name')}
            className={`${inputCls} w-full`}
          />
          <div className="grid grid-cols-4 gap-2">
            <input value={draft.calories} onChange={(e) => setDraft((d) => ({ ...d, calories: e.target.value }))} placeholder="kcal" inputMode="numeric" className={inputCls} />
            <input value={draft.protein_g} onChange={(e) => setDraft((d) => ({ ...d, protein_g: e.target.value }))} placeholder={t('fields.protein')} inputMode="decimal" className={inputCls} />
            <input value={draft.carbs_g} onChange={(e) => setDraft((d) => ({ ...d, carbs_g: e.target.value }))} placeholder={t('fields.carbs')} inputMode="decimal" className={inputCls} />
            <input value={draft.fat_g} onChange={(e) => setDraft((d) => ({ ...d, fat_g: e.target.value }))} placeholder={t('fields.fat')} inputMode="decimal" className={inputCls} />
          </div>
          <label className="data flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
            <input type="checkbox" checked={saveAsPortion} onChange={(e) => setSaveAsPortion(e.target.checked)} />
            {t('saveAsPortion')}
          </label>
          <button onClick={logCustom} disabled={busy} className="btn-accent w-full rounded-xl px-3 py-2.5 text-sm font-bold disabled:opacity-60">
            {t('log')}
          </button>
        </div>
      )}
    </div>
  )
}
