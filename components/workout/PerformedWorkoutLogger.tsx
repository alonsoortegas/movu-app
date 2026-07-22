'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import type { Database } from '@/types/database'
import { RPE_OPTIONS, getProgressionSuggestion, parseReps, parseRpe, parseWeightInput } from '@/lib/workout/logic'
import { formatPrescription } from '@/lib/workout/prescription-copy'
import ExercisePicker, { type ExercisePickerOption } from './ExercisePicker'

type Workout = Database['public']['Tables']['performed_workouts']['Row']
type Exercise = Database['public']['Tables']['performed_workout_exercises']['Row']
type SetLog = Database['public']['Tables']['workout_set_logs']['Row']

interface ExerciseDraft {
  weight: string
  reps: number
  rpe: number
}

export default function PerformedWorkoutLogger({
  initialWorkout,
  initialExercises,
  initialLogs,
  historyLogs,
}: {
  initialWorkout: Workout
  initialExercises: Exercise[]
  initialLogs: SetLog[]
  historyLogs: SetLog[]
}) {
  const locale = useLocale()
  const t = useTranslations('performedWorkout')
  const [workout, setWorkout] = useState(initialWorkout)
  const [exercises, setExercises] = useState(initialExercises)
  const [logs, setLogs] = useState(initialLogs)
  const [drafts, setDrafts] = useState<Record<string, ExerciseDraft>>({})
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restSeconds, setRestSeconds] = useState<number | null>(null)

  useEffect(() => {
    setDrafts((previous) => {
      const next = { ...previous }
      for (const exercise of exercises) {
        if (next[exercise.id]) continue
        const last = historyLogs.find((log) => log.exercise_name === exercise.exercise_name)
        next[exercise.id] = {
          weight: String(exercise.prescribed_weight_kg ?? last?.weight_kg ?? 0),
          reps: parseReps(exercise.prescribed_reps),
          rpe: parseRpe(exercise.target_rpe),
        }
      }
      return next
    })
  }, [exercises, historyLogs])

  useEffect(() => {
    if (restSeconds == null || restSeconds <= 0) return
    const timer = window.setTimeout(() => setRestSeconds((seconds) => seconds == null ? null : seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [restSeconds])

  const logsByExercise = useMemo(() => {
    const grouped = new Map<string, SetLog[]>()
    for (const log of logs) {
      if (!log.performed_exercise_id) continue
      grouped.set(log.performed_exercise_id, [...(grouped.get(log.performed_exercise_id) ?? []), log])
    }
    return grouped
  }, [logs])

  function patchDraft(id: string, patch: Partial<ExerciseDraft>) {
    setDrafts((previous) => ({ ...previous, [id]: { ...previous[id], ...patch } }))
  }

  async function addExercise(option: ExercisePickerOption) {
    setBusy(true)
    const response = await fetch(`/api/performed-workouts/${workout.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_exercise',
        exercise: {
          catalog_exercise_id: option.id,
          exercise_name: option.name,
          primary_muscle_group: option.primaryMuscleGroup,
          order_index: exercises.length,
        },
      }),
    })
    const body = await response.json()
    setBusy(false)
    if (!response.ok) {
      setError(body.error ?? t('errors.addExercise'))
      return
    }
    setExercises((current) => [...current, body.exercise])
    setPickerOpen(false)
    setError(null)
  }

  async function removeExercise(exercise: Exercise) {
    const response = await fetch(`/api/performed-workouts/${workout.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_exercise', exercise_id: exercise.id }),
    })
    const body = await response.json()
    if (!response.ok) {
      setError(body.error ?? t('errors.removeExercise'))
      return
    }
    setExercises((current) => current.filter((item) => item.id !== exercise.id))
    setLogs((current) => current.filter((log) => log.performed_exercise_id !== exercise.id))
  }

  async function logSet(exercise: Exercise) {
    const draft = drafts[exercise.id]
    if (!draft || workout.status === 'completed') return
    const weight = parseWeightInput(draft.weight)
    if (weight == null) {
      setError(t('errors.invalidWeight'))
      return
    }
    const exerciseLogs = logsByExercise.get(exercise.id) ?? []
    const response = await fetch('/api/set-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performed_workout_id: workout.id,
        performed_exercise_id: exercise.id,
        exercise_name: exercise.exercise_name,
        set_number: exerciseLogs.length + 1,
        weight_kg: weight,
        reps: draft.reps,
        rpe: draft.rpe,
      }),
    })
    const body = await response.json()
    if (!response.ok) {
      setError(body.error ?? t('errors.logSet'))
      return
    }
    setLogs((current) => [...current, body.log])
    setRestSeconds(exercise.rest_seconds ?? 90)
    setError(null)
  }

  async function changeStatus(action: 'complete' | 'reopen') {
    setBusy(true)
    const response = await fetch(`/api/performed-workouts/${workout.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action === 'reopen' ? { action: 'reopen' } : { status: 'completed' }),
    })
    const body = await response.json()
    setBusy(false)
    if (!response.ok) {
      setError(body.error ?? t('errors.status'))
      return
    }
    setWorkout(body.workout)
  }

  const readOnly = workout.status === 'completed'

  return (
    <div className="space-y-4">
      <div className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="data text-[10px] uppercase tracking-[0.14em] text-muted">
              {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(`${workout.performed_on}T12:00:00Z`))}
            </div>
            <h1 className="mt-1 text-xl font-bold text-[var(--text)]">{workout.title}</h1>
            <p className="mt-1 text-xs text-muted">{t(`origin.${workout.origin}`)} · {t(`status.${workout.status}`)}</p>
          </div>
          <Link href={`/${locale}/plan`} className="min-h-11 px-2 py-3 text-xs font-semibold text-[var(--text-dim)]">
            {t('backToPlan')}
          </Link>
        </div>
        {readOnly && <p className="mt-3 rounded-xl border border-accent/30 bg-accent-light p-3 text-xs text-[var(--text-dim)]">{t('completedHelp')}</p>}
      </div>

      {error && <div className="rounded-xl border border-[var(--coral)]/30 bg-[rgba(251,113,133,0.08)] p-3 text-xs text-[var(--coral)]">{error}</div>}

      {exercises.map((exercise) => {
        const draft = drafts[exercise.id]
        const exerciseLogs = logsByExercise.get(exercise.id) ?? []
        const last = historyLogs.find((log) => log.exercise_name === exercise.exercise_name)
        const suggestion = getProgressionSuggestion(
          exercise.prescribed_reps,
          last ? { weight_kg: last.weight_kg, reps: last.reps } : undefined,
        )
        return (
          <div key={exercise.id} className="panel mobile-sheet rounded-[1.45rem] p-4 md:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text)]">{exercise.exercise_name}</h2>
                <p className="data mt-1 text-[10px] text-muted">
                  {formatPrescription({
                    sets: exercise.prescribed_sets,
                    reps: exercise.prescribed_reps,
                    targetRpe: exercise.target_rpe,
                    targetRir: exercise.target_rir,
                    labels: {
                      sets: t('labels.sets'),
                      reps: t('labels.repetitions'),
                      perceivedEffort: t('labels.perceivedEffort'),
                      repsInReserve: t('labels.repsInReserve'),
                    },
                  }).join(' · ')}
                </p>
              </div>
              {!readOnly && (
                <button type="button" onClick={() => removeExercise(exercise)} className="min-h-11 px-2 text-xs text-[var(--coral)]">
                  {t('remove')}
                </button>
              )}
            </div>

            {draft && !readOnly && (
              <div className="mt-4 space-y-3 border-t border-dashed border-[var(--border)] pt-3">
                {last && <p className="data text-[10px] text-muted">{t('lastSet', { weight: last.weight_kg ?? 0, reps: last.reps ?? 0 })}</p>}
                {suggestion != null && (
                  <button type="button" onClick={() => patchDraft(exercise.id, { weight: String(suggestion) })} className="data text-[10px] font-bold text-accent">
                    {t('useSuggestion', { weight: suggestion })}
                  </button>
                )}
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <label className="text-xs text-muted">
                    {t('weight')}
                    <input value={draft.weight} onChange={(event) => patchDraft(exercise.id, { weight: event.target.value })} inputMode="decimal" className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 text-sm text-[var(--text)]" />
                  </label>
                  <div className="text-xs text-muted">
                    {t('reps')}
                    <div className="mt-1 flex min-h-11 items-center rounded-xl border border-[var(--border)]">
                      <button type="button" onClick={() => patchDraft(exercise.id, { reps: Math.max(0, draft.reps - 1) })} className="h-11 w-11 text-lg">−</button>
                      <span className="data w-8 text-center text-sm font-bold">{draft.reps}</span>
                      <button type="button" onClick={() => patchDraft(exercise.id, { reps: draft.reps + 1 })} className="h-11 w-11 text-lg">+</button>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">{t('rpe')}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {RPE_OPTIONS.map((rpe) => (
                      <button type="button" key={rpe} onClick={() => patchDraft(exercise.id, { rpe })} className={`data min-h-11 min-w-11 rounded-lg border px-2 text-xs ${draft.rpe === rpe ? 'border-accent bg-accent-light' : 'border-[var(--border)]'}`}>{rpe}</button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => logSet(exercise)} className="btn-accent min-h-11 w-full rounded-xl px-3 text-sm font-bold">{t('logSet')}</button>
              </div>
            )}

            {exerciseLogs.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-[var(--border)] pt-3">
                {exerciseLogs.map((log, index) => (
                  <div key={log.id} className="data flex justify-between text-[11px] text-[var(--text-dim)]">
                    <span>{t('setNumber', { set: log.set_number ?? index + 1 })}</span>
                    <span>{log.weight_kg ?? 0} kg × {log.reps ?? 0} · RPE {log.rpe ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {!readOnly && (pickerOpen
        ? <ExercisePicker workoutType={workout.workout_type} onSelect={addExercise} onClose={() => setPickerOpen(false)} />
        : <button type="button" onClick={() => setPickerOpen(true)} className="min-h-11 w-full rounded-xl border border-dashed border-accent px-4 text-sm font-semibold text-accent">+ {t('addExercise')}</button>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => changeStatus(readOnly ? 'reopen' : 'complete')}
        className={`min-h-12 w-full rounded-xl px-4 text-sm font-bold disabled:opacity-60 ${readOnly ? 'border border-[var(--border)] text-[var(--text-dim)]' : 'btn-accent'}`}
      >
        {readOnly ? t('reopen') : t('complete')}
      </button>

      {restSeconds != null && restSeconds > 0 && (
        <button type="button" onClick={() => setRestSeconds(null)} className="data fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full border border-accent bg-[var(--background)] px-4 py-2 text-xs font-bold text-accent shadow-lg">
          {t('rest')} {Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, '0')}
        </button>
      )}
    </div>
  )
}
