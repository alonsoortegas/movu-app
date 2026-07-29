'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  IMPORTED_DAYS,
  parseImportedPlanJson,
  type ImportedDay,
  type ImportedPlanV1,
} from '@/lib/workout/plan-import'
import {
  buildPlanPrompt,
  type PlanPromptBrief,
} from '@/lib/workout/plan-prompt'

export type WizardStep = 'prepare' | 'copy' | 'paste' | 'review'

export interface PlanImportDefaults {
  goal: string
  weightKg: number | null
  sex: string | null
}

export default function PlanImportWizard({
  defaults,
  initialStep,
  onClose,
  onImported,
}: {
  defaults: PlanImportDefaults
  initialStep: WizardStep
  onClose: () => void
  onImported: (planId: string) => Promise<void>
}) {
  const t = useTranslations('planEditor.import')
  const [step, setStep] = useState<WizardStep>(initialStep)
  const [brief, setBrief] = useState<PlanPromptBrief>({
    goal: defaults.goal,
    event_date: null,
    available_days: ['monday', 'wednesday', 'friday', 'sunday'],
    session_duration_min: 60,
    training_level: 'intermediate',
    equipment: '',
    limitations: '',
    current_performance: '',
  })
  const [includeWeight, setIncludeWeight] = useState(false)
  const [includeSex, setIncludeSex] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'manual'>('idle')
  const [jsonText, setJsonText] = useState('')
  const [validatedPlan, setValidatedPlan] = useState<ImportedPlanV1 | null>(null)
  const [issues, setIssues] = useState<Array<{ path: string; code: string }>>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const prompt = useMemo(
    () => buildPlanPrompt(brief, {
      includeWeight,
      weightKg: defaults.weightKg,
      includeSex,
      sex: defaults.sex,
    }),
    [brief, defaults.sex, defaults.weightKg, includeSex, includeWeight],
  )

  function patchBrief<K extends keyof PlanPromptBrief>(key: K, value: PlanPromptBrief[K]) {
    setBrief((current) => ({ ...current, [key]: value }))
  }

  function toggleDay(day: ImportedDay) {
    patchBrief(
      'available_days',
      brief.available_days.includes(day)
        ? brief.available_days.filter((item) => item !== day)
        : [...brief.available_days, day],
    )
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('manual')
    }
  }

  async function readJsonFile(file: File | undefined) {
    if (!file) return
    setJsonText(await file.text())
    setIssues([])
  }

  function validateResponse() {
    const result = parseImportedPlanJson(jsonText)
    if (!result.ok) {
      setIssues(result.issues)
      setValidatedPlan(null)
      return
    }
    setIssues([])
    setValidatedPlan(result.plan)
    setStep('review')
  }

  async function importPlan() {
    if (!validatedPlan || busy) return
    setBusy(true)
    setError(null)
    const response = await fetch('/api/plan/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: JSON.stringify(validatedPlan) }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || typeof body.planId !== 'string') {
      setBusy(false)
      setError(t('errors.importFailed'))
      return
    }
    await onImported(body.planId)
    setBusy(false)
  }

  const inputClass =
    'min-h-11 rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text)]'

  return (
    <section className="panel mobile-sheet mb-4 rounded-[1.6rem] p-4 md:rounded-2xl md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="data text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
            {t(`steps.${step}`)}
          </p>
          <h2 className="mt-1 text-lg font-bold text-[var(--text)]">{t('title')}</h2>
          <p className="mt-1 text-xs text-muted">{t('privacy')}</p>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 px-3 text-sm text-muted">
          {t('close')}
        </button>
      </div>

      {step === 'prepare' && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-xs text-muted">
              {t('fields.goal')}
              <input value={brief.goal} onChange={(event) => patchBrief('goal', event.target.value)} className={inputClass} />
            </label>
            <label className="grid gap-1 text-xs text-muted">
              {t('fields.eventDate')}
              <input type="date" value={brief.event_date ?? ''} onChange={(event) => patchBrief('event_date', event.target.value || null)} className={inputClass} />
            </label>
            <label className="grid gap-1 text-xs text-muted">
              {t('fields.duration')}
              <input type="number" min="15" max="240" value={brief.session_duration_min} onChange={(event) => patchBrief('session_duration_min', Number(event.target.value))} className={inputClass} />
            </label>
            <label className="grid gap-1 text-xs text-muted">
              {t('fields.level')}
              <select value={brief.training_level} onChange={(event) => patchBrief('training_level', event.target.value as PlanPromptBrief['training_level'])} className={inputClass}>
                <option value="beginner">{t('levels.beginner')}</option>
                <option value="intermediate">{t('levels.intermediate')}</option>
                <option value="advanced">{t('levels.advanced')}</option>
              </select>
            </label>
          </div>
          <div>
            <p className="mb-2 text-xs text-muted">{t('fields.days')}</p>
            <div className="flex flex-wrap gap-2">
              {IMPORTED_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`min-h-11 rounded-full border px-3 text-xs font-semibold ${
                    brief.available_days.includes(day)
                      ? 'border-accent bg-accent-light text-[var(--text)]'
                      : 'border-[var(--border)] text-muted'
                  }`}
                >
                  {t(`days.${day}`)}
                </button>
              ))}
            </div>
          </div>
          {(['equipment', 'limitations', 'current_performance'] as const).map((field) => (
            <label key={field} className="grid gap-1 text-xs text-muted">
              {t(`fields.${field}`)}
              <textarea value={brief[field]} onChange={(event) => patchBrief(field, event.target.value)} rows={2} className={inputClass} />
            </label>
          ))}
          <div className="grid gap-2 text-xs text-[var(--text-dim)] md:grid-cols-2">
            {defaults.weightKg != null && (
              <label className="flex min-h-11 items-center gap-2">
                <input type="checkbox" checked={includeWeight} onChange={(event) => setIncludeWeight(event.target.checked)} />
                {t('includeWeight', { weight: defaults.weightKg })}
              </label>
            )}
            {defaults.sex && (
              <label className="flex min-h-11 items-center gap-2">
                <input type="checkbox" checked={includeSex} onChange={(event) => setIncludeSex(event.target.checked)} />
                {t('includeSex', { sex: defaults.sex })}
              </label>
            )}
          </div>
          <button type="button" disabled={!brief.goal.trim() || brief.available_days.length === 0} onClick={() => setStep('copy')} className="btn-accent min-h-11 w-full rounded-xl px-4 text-sm font-bold disabled:opacity-50">
            {t('actions.preparePrompt')}
          </button>
        </div>
      )}

      {step === 'copy' && (
        <div className="mt-4 space-y-3">
          <textarea readOnly value={prompt} rows={14} onFocus={(event) => event.currentTarget.select()} className={`${inputClass} w-full font-mono text-[11px]`} />
          <button type="button" onClick={copyPrompt} className="btn-accent min-h-11 w-full rounded-xl px-4 text-sm font-bold">
            {t('actions.copyPrompt')}
          </button>
          {copyStatus === 'copied' && <p className="text-xs font-semibold text-accent">{t('copied')}</p>}
          {copyStatus === 'manual' && <p className="text-xs text-[var(--coral)]">{t('manualCopy')}</p>}
          <button type="button" onClick={() => setStep('paste')} className="min-h-11 w-full rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text)]">
            {t('actions.pasteResponse')}
          </button>
        </div>
      )}

      {step === 'paste' && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-[var(--text-dim)]">{t('pasteHelp')}</p>
          <textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} rows={12} placeholder={t('jsonPlaceholder')} className={`${inputClass} w-full font-mono text-xs`} />
          <input type="file" accept="application/json,.json" onChange={(event) => void readJsonFile(event.target.files?.[0])} className="block w-full text-xs text-muted" />
          {issues.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-[rgba(251,113,133,0.35)] p-3 text-xs text-[var(--coral)]">
              {issues.map((issue) => <li key={`${issue.path}:${issue.code}`}>{t('invalidField', issue)}</li>)}
            </ul>
          )}
          <button type="button" disabled={!jsonText.trim()} onClick={validateResponse} className="btn-accent min-h-11 w-full rounded-xl px-4 text-sm font-bold disabled:opacity-50">
            {t('actions.review')}
          </button>
        </div>
      )}

      {step === 'review' && validatedPlan && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-[var(--border)] p-3">
            <h3 className="font-bold text-[var(--text)]">{validatedPlan.name}</h3>
            <p className="mt-1 text-xs text-muted">{t('previewSummary', {
              date: validatedPlan.start_date,
              weeks: validatedPlan.weeks.length,
              sessions: validatedPlan.weeks.reduce((total, week) => total + week.sessions.length, 0),
            })}</p>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {validatedPlan.weeks.map((week) => (
              <div key={week.week_number}>
                <p className="data text-[10px] font-bold uppercase tracking-wide text-accent">{t('week', { week: week.week_number })}</p>
                {week.sessions.map((session) => (
                  <div key={`${week.week_number}-${session.day_of_week}-${session.title}`} className="mt-2 rounded-xl border border-[var(--border)] p-3">
                    <p className="text-sm font-semibold text-[var(--text)]">{t(`days.${session.day_of_week}`)} · {session.title}</p>
                    <ul className="mt-2 space-y-1 text-xs text-muted">
                      {session.exercises.map((exercise, index) => (
                        <li key={`${exercise.name}-${index}`}>
                          {exercise.name}
                          {exercise.sets != null ? ` · ${exercise.sets}×${exercise.reps ?? '—'}` : ''}
                          {exercise.suggested_weight_kg != null ? ` · ${t('suggestedWeight', { weight: exercise.suggested_weight_kg })}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-[var(--coral)]">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep('paste')} className="min-h-11 flex-1 rounded-xl border border-[var(--border)] text-sm font-semibold">{t('actions.back')}</button>
            <button type="button" disabled={busy} onClick={importPlan} className="btn-accent min-h-11 flex-1 rounded-xl text-sm font-bold disabled:opacity-50">
              {busy ? t('actions.importing') : t('actions.import')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
