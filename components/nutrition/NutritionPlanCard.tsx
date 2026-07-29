'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Database } from '@/types/database'
import { useRouter } from '@/i18n/navigation'

type Plan = Database['public']['Tables']['nutrition_plans']['Row']

export default function NutritionPlanCard({ initialPlans }: { initialPlans: Plan[] }) {
  const t = useTranslations('nutrition.planDocument')
  const router = useRouter()
  const [plans, setPlans] = useState(initialPlans)
  const [uploading, setUploading] = useState(false)
  const [savingTargets, setSavingTargets] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const active = plans.find((plan) => plan.active)

  async function upload(formData: FormData) {
    setUploading(true)
    setError(null)
    try {
      const response = await fetch('/api/nutrition/plans', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? t('uploadError'))
      setPlans((current) => [data.plan, ...current.map((plan) => ({ ...plan, active: false }))])
      formRef.current?.reset()
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('uploadError'))
    } finally {
      setUploading(false)
    }
  }

  async function view(id: string) {
    const response = await fetch(`/api/nutrition/plans/${id}`)
    const data = await response.json()
    if (!response.ok) return setError(data.error ?? t('viewError'))
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function archive(id: string) {
    const response = await fetch(`/api/nutrition/plans/${id}`, { method: 'DELETE' })
    if (response.ok) {
      setPlans((current) => current.map((plan) => plan.id === id ? { ...plan, active: false } : plan))
      router.refresh()
    }
  }

  async function updateTargets(id: string, formData: FormData) {
    setSavingTargets(true)
    setError(null)
    try {
      const response = await fetch(`/api/nutrition/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? t('targetsError'))
      setPlans((current) => current.map((plan) => plan.id === id ? data.plan : plan))
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('targetsError'))
    } finally {
      setSavingTargets(false)
    }
  }

  return (
    <section id="nutrition-plan" className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl md:p-5">
      <p className="data text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">{t('eyebrow')}</p>
      <p className="mt-2 text-xs text-muted">{t('referenceOnly')}</p>
      {active ? (
        <div className="mt-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">{active.title}</h2>
              <p className="mt-1 text-sm text-muted">{active.provider_name || t('noProvider')}</p>
            </div>
            {active.calories_target && <span className="rounded-full bg-accent-light px-3 py-1 text-xs font-bold text-accent-dark">{active.calories_target} kcal</span>}
          </div>
          <p className="mt-3 text-xs text-[var(--text-dim)]">{active.starts_on} — {active.ends_on || t('openEnded')}</p>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => view(active.id)} className="btn-accent rounded-xl px-4 py-2.5 text-sm font-semibold">{t('viewPdf')}</button>
            <button type="button" onClick={() => archive(active.id)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-[var(--text-dim)]">{t('archive')}</button>
          </div>
          <details className="mt-4 border-t border-border pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">{t('editTargets')}</summary>
            <form action={(formData) => updateTargets(active.id, formData)} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input name="calories_target" type="number" min="500" max="10000" defaultValue={active.calories_target ?? ''} placeholder={t('calories')} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
              <input name="protein_target_g" inputMode="decimal" defaultValue={active.protein_target_g ?? ''} placeholder={t('proteinTarget')} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
              <input name="carbs_target_g" inputMode="decimal" defaultValue={active.carbs_target_g ?? ''} placeholder={t('carbsTarget')} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
              <input name="fat_target_g" inputMode="decimal" defaultValue={active.fat_target_g ?? ''} placeholder={t('fatTarget')} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
              <input name="notes" defaultValue={active.notes ?? ''} placeholder={t('notes')} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm sm:col-span-2" />
              <button disabled={savingTargets} className="btn-accent rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 sm:col-span-2">
                {savingTargets ? t('savingTargets') : t('saveTargets')}
              </button>
            </form>
          </details>
        </div>
      ) : <p className="mt-3 text-sm text-[var(--text-dim)]">{t('empty')}</p>}

      <details className="mt-5 border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">{t('uploadNew')}</summary>
        <p className="mt-2 text-xs text-muted">{t('targetsOptional')}</p>
        <form ref={formRef} action={upload} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="title" required placeholder={t('title')} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
          <input name="provider_name" placeholder={t('provider')} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
          <input name="starts_on" type="date" required className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
          <input name="ends_on" type="date" className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
          <input name="calories_target" type="number" min="500" max="10000" placeholder={t('calories')} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
          <input name="protein_target_g" inputMode="decimal" placeholder={t('proteinTarget')} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
          <input name="carbs_target_g" inputMode="decimal" placeholder={t('carbsTarget')} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
          <input name="fat_target_g" inputMode="decimal" placeholder={t('fatTarget')} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
          <input name="notes" placeholder={t('notes')} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
          <input name="file" type="file" accept="application/pdf,.pdf" required className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          <button disabled={uploading} className="btn-accent rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 sm:col-span-2">{uploading ? t('uploading') : t('upload')}</button>
        </form>
      </details>
      {plans.some((plan) => !plan.active) && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-muted">{t('history')}</summary>
          <div className="mt-2 space-y-2">{plans.filter((plan) => !plan.active).map((plan) => (
            <button key={plan.id} type="button" onClick={() => view(plan.id)} className="block w-full rounded-lg border border-border px-3 py-2 text-left text-xs text-[var(--text-dim)]">{plan.title} · {plan.starts_on}</button>
          ))}</div>
        </details>
      )}
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </section>
  )
}
