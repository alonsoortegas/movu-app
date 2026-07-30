'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import type { Database } from '@/types/database'
import {
  TARGET_DAY_TYPES,
  buildTargetRows,
  type TargetDrafts,
} from '@/lib/nutrition/catalog'
import type { NutritionDayType } from '@/lib/nutrition/macros'

type Food = Database['public']['Tables']['food_items']['Row']
type Group = Database['public']['Tables']['food_substitution_groups']['Row']
type GroupItem = Database['public']['Tables']['food_substitution_group_items']['Row']
type Target = Database['public']['Tables']['nutrition_targets']['Row']

type FoodForm = {
  name: string
  category: string
  portion_label: string
  grams: string
  calories: string
  protein_g: string
  carbs_g: string
  fat_g: string
  tracking_unit: string
  notes: string
}

type GroupItemDraft = { food_item_id: string; quantity: string; label: string }

const EMPTY_FOOD: FoodForm = {
  name: '',
  category: 'mixed',
  portion_label: '',
  grams: '',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
  tracking_unit: 'grams',
  notes: '',
}

const CATEGORIES = ['protein', 'carb', 'fat', 'mixed', 'veg'] as const
const UNITS = ['piece', 'cup', 'grams', 'scoop', 'slice'] as const

function targetDrafts(targets: Target[]): TargetDrafts {
  const fallback = { calories: '', protein: '', carbs: '', fat: '' }
  return Object.fromEntries(
    TARGET_DAY_TYPES.map((dayType) => {
      const row = targets.find((target) => target.day_type === dayType)
      return [
        dayType,
        row
          ? {
              calories: String(row.calories_target),
              protein: String(row.protein_target),
              carbs: String(row.carbs_target),
              fat: String(row.fat_target),
            }
          : { ...fallback },
      ]
    }),
  ) as TargetDrafts
}

function foodForm(food: Food): FoodForm {
  return {
    name: food.name,
    category: food.category,
    portion_label: food.portion_label,
    grams: food.grams == null ? '' : String(food.grams),
    calories: String(food.calories),
    protein_g: String(food.protein_g),
    carbs_g: String(food.carbs_g),
    fat_g: String(food.fat_g),
    tracking_unit: food.tracking_unit,
    notes: food.notes ?? '',
  }
}

export default function CatalogEditor({
  initialFoods,
  initialGroups,
  initialGroupItems,
  initialTargets,
}: {
  initialFoods: Food[]
  initialGroups: Group[]
  initialGroupItems: GroupItem[]
  initialTargets: Target[]
}) {
  const t = useTranslations('nutrition.catalog')
  const locale = useLocale()
  const [foods, setFoods] = useState(initialFoods)
  const [groups, setGroups] = useState(initialGroups)
  const [groupItems, setGroupItems] = useState(initialGroupItems)
  const [targets, setTargets] = useState<TargetDrafts>(() => targetDrafts(initialTargets))
  const [sameEveryDay, setSameEveryDay] = useState(false)
  const [foodOpen, setFoodOpen] = useState(initialFoods.length === 0)
  const [foodEditingId, setFoodEditingId] = useState<string | null>(null)
  const [foodDraft, setFoodDraft] = useState<FoodForm>(EMPTY_FOOD)
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupEditingId, setGroupEditingId] = useState<string | null>(null)
  const [groupDraft, setGroupDraft] = useState({ name: '', macro_type: 'carb', target_macro_g: '', notes: '' })
  const [groupItemDrafts, setGroupItemDrafts] = useState<GroupItemDraft[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const inputCls = 'glass rounded-lg border border-[var(--border)] bg-transparent px-2.5 py-2 text-sm text-[var(--text)]'
  const smallBtn = 'glass rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-dim)] active:scale-95'

  function flashNotice(message: string) {
    setNotice(message)
    setError(null)
    window.setTimeout(() => setNotice(null), 3000)
  }

  function fail(message: string) {
    setError(message)
    setNotice(null)
    window.setTimeout(() => setError(null), 4000)
  }

  async function saveTargets() {
    const rows = buildTargetRows(targets, sameEveryDay)
    if (!rows) return fail(t('errors.invalidTargets'))
    setBusy(true)
    const res = await fetch('/api/nutrition/targets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets: rows }),
    })
    setBusy(false)
    if (!res.ok) return fail(t('errors.saveTargets'))
    setTargets(targetDrafts((await res.json()).targets))
    flashNotice(t('savedTargets'))
  }

  function openNewFood() {
    setFoodEditingId(null)
    setFoodDraft(EMPTY_FOOD)
    setFoodOpen(true)
  }

  function openFood(food: Food) {
    setFoodEditingId(food.id)
    setFoodDraft(foodForm(food))
    setFoodOpen(true)
  }

  async function saveFood() {
    if (!foodDraft.name.trim() || !foodDraft.portion_label.trim()) return fail(t('errors.foodRequired'))
    setBusy(true)
    const url = foodEditingId ? `/api/nutrition/foods/${foodEditingId}` : '/api/nutrition/foods'
    const res = await fetch(url, {
      method: foodEditingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(foodDraft),
    })
    setBusy(false)
    if (!res.ok) return fail(t('errors.saveFood'))
    const { food } = await res.json()
    setFoods((current) =>
      foodEditingId
        ? current.map((item) => (item.id === food.id ? food : item)).sort((a, b) => a.name.localeCompare(b.name))
        : [...current, food].sort((a, b) => a.name.localeCompare(b.name)),
    )
    setFoodOpen(false)
    setFoodEditingId(null)
    setFoodDraft(EMPTY_FOOD)
    flashNotice(t('savedFood'))
  }

  async function deleteFood(food: Food) {
    if (!window.confirm(t('confirmDeleteFood', { name: food.name }))) return
    const res = await fetch(`/api/nutrition/foods/${food.id}`, { method: 'DELETE' })
    if (!res.ok) return fail(t('errors.deleteFood'))
    setFoods((current) => current.filter((item) => item.id !== food.id))
    setGroupItems((current) => current.filter((item) => item.food_item_id !== food.id))
    setGroupItemDrafts((current) => current.filter((item) => item.food_item_id !== food.id))
  }

  function openNewGroup() {
    setGroupEditingId(null)
    setGroupDraft({ name: '', macro_type: 'carb', target_macro_g: '', notes: '' })
    setGroupItemDrafts([])
    setGroupOpen(true)
  }

  function openGroup(group: Group) {
    setGroupEditingId(group.id)
    setGroupDraft({
      name: group.name,
      macro_type: group.macro_type,
      target_macro_g: String(group.target_macro_g),
      notes: group.notes ?? '',
    })
    setGroupItemDrafts(
      groupItems
        .filter((item) => item.group_id === group.id)
        .map((item) => ({ food_item_id: item.food_item_id, quantity: String(item.quantity), label: item.label })),
    )
    setGroupOpen(true)
  }

  function toggleGroupFood(food: Food) {
    setGroupItemDrafts((current) => {
      if (current.some((item) => item.food_item_id === food.id)) {
        return current.filter((item) => item.food_item_id !== food.id)
      }
      return [...current, { food_item_id: food.id, quantity: '1', label: food.portion_label }]
    })
  }

  function patchGroupItem(foodId: string, patch: Partial<GroupItemDraft>) {
    setGroupItemDrafts((current) => current.map((item) => (item.food_item_id === foodId ? { ...item, ...patch } : item)))
  }

  async function saveGroup() {
    const target = Number(groupDraft.target_macro_g.replace(',', '.'))
    if (!groupDraft.name.trim() || !Number.isFinite(target) || target <= 0) return fail(t('errors.groupRequired'))
    if (groupItemDrafts.some((item) => !item.label.trim() || Number(item.quantity.replace(',', '.')) <= 0)) {
      return fail(t('errors.invalidGroupItems'))
    }
    setBusy(true)
    let groupId = groupEditingId
    if (!groupId) {
      const createRes = await fetch('/api/nutrition/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupDraft),
      })
      if (!createRes.ok) {
        setBusy(false)
        return fail(t('errors.saveGroup'))
      }
      const created = (await createRes.json()).group as Group
      groupId = created.id
      setGroups((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
    }

    const res = await fetch(`/api/nutrition/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...groupDraft,
        target_macro_g: target,
        items: groupItemDrafts.map((item) => ({
          ...item,
          quantity: Number(item.quantity.replace(',', '.')),
        })),
      }),
    })
    setBusy(false)
    if (!res.ok) return fail(t('errors.saveGroup'))
    const data = await res.json()
    setGroups((current) => current.map((group) => (group.id === data.group.id ? data.group : group)).sort((a, b) => a.name.localeCompare(b.name)))
    setGroupItems((current) => [...current.filter((item) => item.group_id !== groupId), ...data.items])
    setGroupOpen(false)
    setGroupEditingId(null)
    setGroupItemDrafts([])
    flashNotice(t('savedGroup'))
  }

  async function deleteGroup(group: Group) {
    if (!window.confirm(t('confirmDeleteGroup', { name: group.name }))) return
    const res = await fetch(`/api/nutrition/groups/${group.id}`, { method: 'DELETE' })
    if (!res.ok) return fail(t('errors.deleteGroup'))
    setGroups((current) => current.filter((item) => item.id !== group.id))
    setGroupItems((current) => current.filter((item) => item.group_id !== group.id))
  }

  return (
    <div className="space-y-5">
      {(error || notice) && (
        <div className={`rounded-xl border px-3 py-2 text-xs ${error ? 'border-[rgba(251,113,133,0.35)] bg-[rgba(251,113,133,0.1)] text-[var(--coral)]' : 'border-[rgba(107,224,64,0.35)] bg-[var(--accent-soft)] text-accent'}`}>
          {error ?? notice}
        </div>
      )}

      <section className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl md:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="data text-[10px] font-bold uppercase tracking-[0.18em] text-accent">{t('targets.eyebrow')}</div>
            <h2 className="mt-1 text-base font-bold text-[var(--text)]">{t('targets.title')}</h2>
            <p className="mt-1 text-xs text-muted">{t('targets.body')}</p>
            <p className="mt-2 text-xs text-[var(--text-dim)]">{t('targets.dailyObjectivesHelp')}</p>
          </div>
          <label className="data flex items-center gap-2 text-[11px] text-[var(--text-dim)]">
            <input type="checkbox" checked={sameEveryDay} onChange={(event) => setSameEveryDay(event.target.checked)} />
            {t('targets.sameEveryDay')}
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {TARGET_DAY_TYPES.map((dayType) => {
            const disabled = sameEveryDay && dayType !== 'moderate'
            const draft = targets[dayType]
            return (
              <div key={dayType} className={`rounded-xl border border-[var(--border)] p-3 ${disabled ? 'opacity-35' : ''}`}>
                <div className="data mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--text-dim)]">
                  {sameEveryDay && dayType === 'moderate' ? t('targets.everyDay') : t(`dayType.${dayType}`)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['calories', 'protein', 'carbs', 'fat'] as const).map((field) => (
                    <label key={field} className="data text-[9px] uppercase text-muted">
                      {t(`targets.fields.${field}`)}
                      <input
                        value={draft[field]}
                        disabled={disabled}
                        inputMode="decimal"
                        onChange={(event) => setTargets((current) => ({
                          ...current,
                          [dayType]: { ...current[dayType], [field]: event.target.value },
                        }))}
                        className={`${inputCls} mt-1 w-full disabled:cursor-not-allowed`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={saveTargets} disabled={busy} className="btn-accent mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-bold disabled:opacity-60">
          {t('targets.save')}
        </button>
      </section>

      <section className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl md:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="data text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cyan)]">{t('foods.eyebrow')}</div>
            <h2 className="mt-1 text-base font-bold text-[var(--text)]">{t('foods.title')}</h2>
            <p className="mt-1 text-xs text-muted">{t('foods.body')}</p>
            <p className="mt-2 text-xs text-[var(--text-dim)]">{t('foods.frequentFoodsHelp')}</p>
          </div>
          <button onClick={openNewFood} className={smallBtn}>+ {t('foods.add')}</button>
        </div>

        {foodOpen && (
          <div className="mb-4 space-y-2 border-b border-dashed border-[var(--border)] pb-4">
            <div className="grid gap-2 md:grid-cols-2">
              <input value={foodDraft.name} onChange={(event) => setFoodDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder={t('foods.fields.name')} className={inputCls} />
              <input value={foodDraft.portion_label} onChange={(event) => setFoodDraft((draft) => ({ ...draft, portion_label: event.target.value }))} placeholder={t('foods.fields.portion')} className={inputCls} />
              <select value={foodDraft.category} onChange={(event) => setFoodDraft((draft) => ({ ...draft, category: event.target.value }))} className={inputCls}>
                {CATEGORIES.map((category) => <option key={category} value={category}>{t(`foods.category.${category}`)}</option>)}
              </select>
              <select value={foodDraft.tracking_unit} onChange={(event) => setFoodDraft((draft) => ({ ...draft, tracking_unit: event.target.value }))} className={inputCls}>
                {UNITS.map((unit) => <option key={unit} value={unit}>{t(`foods.unit.${unit}`)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {(['grams', 'calories', 'protein_g', 'carbs_g', 'fat_g'] as const).map((field) => (
                <input key={field} value={foodDraft[field]} inputMode="decimal" onChange={(event) => setFoodDraft((draft) => ({ ...draft, [field]: event.target.value }))} placeholder={t(`foods.fields.${field}`)} className={inputCls} />
              ))}
            </div>
            <input value={foodDraft.notes} onChange={(event) => setFoodDraft((draft) => ({ ...draft, notes: event.target.value }))} placeholder={t('foods.fields.notes')} className={`${inputCls} w-full`} />
            <div className="flex gap-2">
              <button onClick={saveFood} disabled={busy} className="btn-accent flex-1 rounded-xl px-3 py-2.5 text-sm font-bold disabled:opacity-60">{foodEditingId ? t('foods.save') : t('foods.saveFrequentFood')}</button>
              <button onClick={() => setFoodOpen(false)} className={smallBtn}>{t('cancel')}</button>
            </div>
          </div>
        )}

        {foods.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-xs text-muted">{t('foods.empty')}</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {foods.map((food) => (
              <div key={food.id} className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5">
                <button onClick={() => openFood(food)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-semibold text-[var(--text)]">{food.name}</div>
                  <div className="data mt-0.5 text-[10px] text-muted">
                    {food.portion_label} · {food.calories} kcal · P{food.protein_g} C{food.carbs_g} G{food.fat_g}
                  </div>
                </button>
                <button onClick={() => deleteFood(food)} className={smallBtn} aria-label={t('foods.delete')}>✕</button>
              </div>
            ))}
          </div>
        )}

      </section>

      <section className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl md:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="data text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--violet)]">{t('groups.eyebrow')}</div>
            <h2 className="mt-1 text-base font-bold text-[var(--text)]">{t('groups.title')}</h2>
            <p className="mt-1 text-xs text-muted">{t('groups.body')}</p>
          </div>
          <button onClick={openNewGroup} disabled={foods.length === 0} className={`${smallBtn} disabled:opacity-40`}>+ {t('groups.add')}</button>
        </div>
        {groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-xs text-muted">{t('groups.empty')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <div key={group.id} className="glass flex items-center gap-2 rounded-full border border-[var(--border)] py-1 pl-3 pr-1">
                <button onClick={() => openGroup(group)} className="data text-[11px] font-semibold text-[var(--text)]">
                  {group.name} · {group.target_macro_g}g
                </button>
                <button onClick={() => deleteGroup(group)} className="grid h-7 w-7 place-items-center rounded-full text-xs text-muted" aria-label={t('groups.delete')}>✕</button>
              </div>
            ))}
          </div>
        )}

        {groupOpen && (
          <div className="mt-4 space-y-3 border-t border-dashed border-[var(--border)] pt-4">
            <div className="grid gap-2 md:grid-cols-4">
              <input value={groupDraft.name} onChange={(event) => setGroupDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder={t('groups.fields.name')} className={`${inputCls} md:col-span-2`} />
              <select value={groupDraft.macro_type} onChange={(event) => setGroupDraft((draft) => ({ ...draft, macro_type: event.target.value }))} className={inputCls}>
                <option value="carb">{t('groups.macro.carb')}</option>
                <option value="protein">{t('groups.macro.protein')}</option>
              </select>
              <input value={groupDraft.target_macro_g} inputMode="decimal" onChange={(event) => setGroupDraft((draft) => ({ ...draft, target_macro_g: event.target.value }))} placeholder={t('groups.fields.target')} className={inputCls} />
            </div>
            <input value={groupDraft.notes} onChange={(event) => setGroupDraft((draft) => ({ ...draft, notes: event.target.value }))} placeholder={t('groups.fields.notes')} className={`${inputCls} w-full`} />
            <div>
              <div className="data mb-2 text-[10px] uppercase tracking-wide text-muted">{t('groups.pickFoods')}</div>
              <div className="flex flex-wrap gap-1.5">
                {foods.map((food) => {
                  const selected = groupItemDrafts.some((item) => item.food_item_id === food.id)
                  return <button key={food.id} onClick={() => toggleGroupFood(food)} className={`data rounded-full border px-2.5 py-1.5 text-[10px] ${selected ? 'border-accent bg-accent-light text-[var(--text)]' : 'border-[var(--border)] text-[var(--text-dim)]'}`}>{selected ? '✓ ' : ''}{food.name}</button>
                })}
              </div>
            </div>
            {groupItemDrafts.length > 0 && (
              <div className="space-y-2">
                {groupItemDrafts.map((item) => {
                  const food = foods.find((candidate) => candidate.id === item.food_item_id)
                  return (
                    <div key={item.food_item_id} className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] items-center gap-2 rounded-xl border border-[var(--border)] p-2">
                      <span className="truncate text-xs font-semibold text-[var(--text)]">{food?.name}</span>
                      <input value={item.quantity} inputMode="decimal" onChange={(event) => patchGroupItem(item.food_item_id, { quantity: event.target.value })} aria-label={t('groups.fields.quantity')} className={inputCls} />
                      <input value={item.label} onChange={(event) => patchGroupItem(item.food_item_id, { label: event.target.value })} aria-label={t('groups.fields.label')} className={inputCls} />
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={saveGroup} disabled={busy} className="btn-accent flex-1 rounded-xl px-3 py-2.5 text-sm font-bold disabled:opacity-60">{groupEditingId ? t('groups.save') : t('groups.create')}</button>
              <button onClick={() => setGroupOpen(false)} className={smallBtn}>{t('cancel')}</button>
            </div>
          </div>
        )}
      </section>

      <Link href={`/${locale}/nutricion`} className="data inline-block text-[11px] font-semibold text-accent hover:underline">
        ← {t('back')}
      </Link>
    </div>
  )
}
