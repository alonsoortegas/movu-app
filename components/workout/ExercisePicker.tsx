'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

export interface ExercisePickerOption {
  id: string
  name: string
  primaryMuscleGroup: string | null
  secondaryMuscleGroups: string[]
  workoutTypes: string[]
  defaultTracking: string
}

const MUSCLE_GROUPS = ['legs', 'glutes', 'chest', 'back', 'shoulders', 'arms', 'core']

export default function ExercisePicker({
  workoutType,
  onSelect,
  onClose,
}: {
  workoutType: string
  onSelect: (exercise: ExercisePickerOption) => void
  onClose: () => void
}) {
  const locale = useLocale()
  const t = useTranslations('performedWorkout.picker')
  const [query, setQuery] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('')
  const [results, setResults] = useState<ExercisePickerOption[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      const params = new URLSearchParams({ locale, workout_type: workoutType })
      if (query.trim()) params.set('q', query.trim())
      if (muscleGroup) params.set('muscle_group', muscleGroup)
      try {
        const response = await fetch(`/api/exercises?${params}`, { signal: controller.signal })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error ?? t('loadFailed'))
        setResults(body.exercises ?? [])
        setError(null)
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError(fetchError instanceof Error ? fetchError.message : t('loadFailed'))
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 180)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [locale, muscleGroup, query, t, workoutType])

  async function createCustomExercise() {
    if (!query.trim() || creating) return
    setCreating(true)
    const response = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: query.trim(),
        primaryMuscleGroup: muscleGroup || null,
        workoutTypes: [workoutType],
      }),
    })
    const body = await response.json()
    setCreating(false)
    if (!response.ok) {
      setError(body.error ?? t('createFailed'))
      return
    }
    const row = body.exercise
    onSelect({
      id: row.id,
      name: row[`name_${locale}`] ?? row.name_es,
      primaryMuscleGroup: row.primary_muscle_group,
      secondaryMuscleGroups: row.secondary_muscle_groups ?? [],
      workoutTypes: row.workout_types ?? [],
      defaultTracking: row.default_tracking,
    })
  }

  return (
    <div className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--text)]">{t('title')}</h2>
          <p className="mt-0.5 text-xs text-muted">{t('subtitle')}</p>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 px-3 text-sm text-[var(--text-dim)]">
          {t('close')}
        </button>
      </div>

      <label className="mt-4 block">
        <span className="sr-only">{t('search')}</span>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchPlaceholder')}
          className="glass min-h-11 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 text-sm text-[var(--text)] outline-none focus:border-accent"
        />
      </label>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setMuscleGroup('')}
          className={`min-h-11 flex-shrink-0 rounded-full border px-3 text-xs ${!muscleGroup ? 'border-accent text-accent' : 'border-[var(--border)] text-muted'}`}
        >
          {t('all')}
        </button>
        {MUSCLE_GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            onClick={() => setMuscleGroup(group)}
            className={`min-h-11 flex-shrink-0 rounded-full border px-3 text-xs ${muscleGroup === group ? 'border-accent text-accent' : 'border-[var(--border)] text-muted'}`}
          >
            {t(`muscles.${group}`)}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-[var(--coral)]">{error}</p>}
      <div className="mt-3 space-y-2">
        {results.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            onClick={() => onSelect(exercise)}
            className="flex min-h-11 w-full items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-left"
          >
            <span className="text-sm font-semibold text-[var(--text)]">{exercise.name}</span>
            <span className="data text-[9px] uppercase text-muted">
              {exercise.primaryMuscleGroup ? t(`muscles.${exercise.primaryMuscleGroup}`) : t('unclassified')}
            </span>
          </button>
        ))}
        {!loading && results.length === 0 && <p className="py-3 text-center text-xs text-muted">{t('empty')}</p>}
      </div>

      {query.trim() && (
        <button
          type="button"
          disabled={creating}
          onClick={createCustomExercise}
          className="mt-3 min-h-11 w-full rounded-xl border border-dashed border-accent px-3 text-sm font-semibold text-accent disabled:opacity-60"
        >
          {creating ? t('creating') : t('createCustom', { name: query.trim() })}
        </button>
      )}
    </div>
  )
}
