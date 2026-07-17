'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import type { Database } from '@/types/database'
import {
  DAY_ORDER,
  RPE_OPTIONS,
  getProgressionSuggestion,
  getTodayKey,
  parseReps,
  parseRpe,
  parseWeightInput,
  type DayKey,
} from '@/lib/workout/logic'

type Plan = Database['public']['Tables']['workout_plans']['Row']
type Session = Database['public']['Tables']['workout_plan_sessions']['Row']
type Exercise = Database['public']['Tables']['workout_plan_exercises']['Row']
type SetLog = Database['public']['Tables']['workout_set_logs']['Row']

interface LoggedSet {
  id: string
  setNum: number
  weight: number
  reps: number
  rpe: number
}

interface ExerciseState {
  expanded: boolean
  weightText: string
  selectedReps: number
  selectedRpe: number
  loggedSets: LoggedSet[]
}

interface RestTimer {
  exerciseName: string
  secondsLeft: number
}

export default function PlanWeekView({
  plan,
  week,
  sessions,
  exercises,
  lastSets,
  todayLogs,
}: {
  plan: Plan
  week: number
  sessions: Session[]
  exercises: Exercise[]
  lastSets: Record<string, SetLog>
  todayLogs: SetLog[]
}) {
  const t = useTranslations('plan')
  const locale = useLocale()
  const todayKey = getTodayKey()
  const [selectedDay, setSelectedDay] = useState<DayKey>(todayKey)
  const [states, setStates] = useState<Record<string, ExerciseState>>({})
  const [logError, setLogError] = useState<string | null>(null)
  const [restTimer, setRestTimer] = useState<RestTimer | null>(null)

  const daySessions = useMemo(
    () => sessions.filter((s) => s.day_of_week === selectedDay),
    [sessions, selectedDay],
  )
  const gymDays = useMemo(() => new Set(sessions.map((s) => s.day_of_week)), [sessions])

  // Seed per-exercise UI state once per exercise id.
  useEffect(() => {
    setStates((prev) => {
      const next = { ...prev }
      for (const ex of exercises) {
        if (next[ex.id]) continue
        const last = lastSets[ex.exercise_name]
        const initWeight = ex.prescribed_weight_kg ?? last?.weight_kg ?? 0
        next[ex.id] = {
          expanded: false,
          weightText: String(initWeight),
          selectedReps: parseReps(ex.prescribed_reps),
          selectedRpe: parseRpe(ex.target_rpe),
          loggedSets: todayLogs
            .filter((log) => log.exercise_id === ex.id)
            .map((log, idx) => ({
              id: log.id,
              setNum: log.set_number ?? idx + 1,
              weight: log.weight_kg ?? 0,
              reps: log.reps ?? 0,
              rpe: log.rpe ?? 0,
            })),
        }
      }
      return next
    })
  }, [exercises, lastSets, todayLogs])

  useEffect(() => {
    if (!restTimer) return
    if (restTimer.secondsLeft <= 0) {
      setRestTimer(null)
      return
    }
    const id = window.setTimeout(
      () => setRestTimer((prev) => (prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null)),
      1000,
    )
    return () => window.clearTimeout(id)
  }, [restTimer])

  const patchState = (id: string, patch: Partial<ExerciseState>) =>
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  async function logSet(ex: Exercise) {
    const s = states[ex.id]
    if (!s) return
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    const weight = parseWeightInput(s.weightText)
    if (weight == null) {
      setLogError(t('logger.invalidWeight'))
      setTimeout(() => setLogError(null), 3000)
      return
    }
    const setNum = s.loggedSets.length + 1
    const res = await fetch('/api/set-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercise_id: ex.id,
        exercise_name: ex.exercise_name,
        set_number: setNum,
        weight_kg: weight,
        reps: s.selectedReps,
        rpe: s.selectedRpe,
      }),
    })
    if (!res.ok) {
      setLogError(t('logger.logFailed'))
      setTimeout(() => setLogError(null), 3000)
      return
    }
    const { log } = await res.json()
    patchState(ex.id, {
      loggedSets: [...s.loggedSets, { id: log.id, setNum, weight, reps: s.selectedReps, rpe: s.selectedRpe }],
    })
    setRestTimer({ exerciseName: ex.exercise_name, secondsLeft: ex.rest_seconds ?? 90 })
  }

  const dayLabel = (day: DayKey) => t(`days.${day}`)

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {DAY_ORDER.map((day) => {
          const isSelected = day === selectedDay
          const isToday = day === todayKey
          const isGym = gymDays.has(day)
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`data flex-shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all active:scale-[0.94] ${
                isSelected
                  ? 'btn-accent border-transparent'
                  : isToday
                    ? 'border-accent bg-[var(--ink-02)] text-accent'
                    : isGym
                      ? 'border-[var(--border)] bg-[var(--ink-02)] text-[var(--text-dim)]'
                      : 'border-transparent text-[var(--text-faint)]'
              }`}
            >
              {dayLabel(day as DayKey)}
            </button>
          )
        })}
      </div>

      {logError && (
        <div className="rounded-xl border border-[rgba(251,113,133,0.35)] bg-[rgba(251,113,133,0.1)] px-3 py-2 text-xs text-[var(--coral)]">
          {logError}
        </div>
      )}

      {/* Rest day */}
      {daySessions.length === 0 && (
        <div className="panel mobile-sheet rounded-[1.6rem] p-6 text-center md:rounded-2xl">
          <div className="data text-[11px] uppercase tracking-widest text-[var(--text-faint)]">
            · {t('restDay')} ·
          </div>
          <p className="mt-1.5 text-sm text-[var(--text-dim)]">{t('restDaySub')}</p>
        </div>
      )}

      {/* Sessions */}
      {daySessions.map((session) => {
        const sessionExercises = exercises
          .filter((e) => e.session_id === session.id)
          .sort((a, b) => a.order_index - b.order_index)
        return (
          <div key={session.id} className="space-y-3">
            <div className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[var(--text)]">{session.title}</div>
                  <div className="data mt-0.5 text-[10px] uppercase tracking-wide text-muted">
                    {t('weekLabel', { week })} · {t(`sessionType.${session.session_type}`)}
                  </div>
                </div>
                <Link
                  href={`/${locale}/plan/edit`}
                  className="data text-[10px] font-semibold text-[var(--text-dim)] underline-offset-2 hover:underline"
                >
                  {t('editPlan')}
                </Link>
              </div>
              {session.notes && <p className="mt-2 text-xs text-[var(--text-dim)]">{session.notes}</p>}
            </div>

            {sessionExercises.map((ex) => {
              const s = states[ex.id]
              if (!s) return null
              const last = lastSets[ex.exercise_name]
              const suggestion = getProgressionSuggestion(
                ex.prescribed_reps,
                last ? { weight_kg: last.weight_kg, reps: last.reps } : undefined,
              )
              const setsDone = s.loggedSets.length
              const setsTarget = ex.prescribed_sets ?? null
              return (
                <div key={ex.id} className="panel mobile-sheet rounded-[1.45rem] p-4 md:rounded-2xl">
                  <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => patchState(ex.id, { expanded: !s.expanded })}>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--text)]">
                        {ex.exercise_name}
                        {ex.superset_group != null && (
                          <span className="data ml-2 rounded-full border border-[var(--border)] px-1.5 py-0.5 text-[9px] text-[var(--violet)]">
                            SS{ex.superset_group}
                          </span>
                        )}
                      </div>
                      <div className="data mt-0.5 text-[10px] text-muted">
                        {[
                          setsTarget != null ? `${setsTarget}×${ex.prescribed_reps ?? '—'}` : ex.prescribed_reps,
                          ex.prescribed_weight_kg != null ? `${ex.prescribed_weight_kg} kg` : null,
                          ex.target_rpe ? `RPE ${ex.target_rpe}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className={`data text-[11px] font-bold ${setsTarget != null && setsDone >= setsTarget ? 'text-accent' : 'text-[var(--text-dim)]'}`}>
                        {setsDone}
                        {setsTarget != null ? `/${setsTarget}` : ''}
                      </span>
                      <span className="text-[var(--text-faint)]">{s.expanded ? '−' : '+'}</span>
                    </div>
                  </button>

                  {suggestion != null && !s.expanded && (
                    <div className="data mt-2 text-[10px] text-accent">
                      {t('logger.progressionHint', { weight: suggestion })}
                    </div>
                  )}

                  {s.expanded && (
                    <div className="mt-3 space-y-3 border-t border-dashed border-[var(--border)] pt-3">
                      {last && (
                        <div className="data text-[10px] text-[var(--text-faint)]">
                          {t('logger.lastSet', {
                            weight: last.weight_kg ?? 0,
                            reps: last.reps ?? 0,
                          })}
                          {suggestion != null && (
                            <button
                              className="ml-2 font-bold text-accent"
                              onClick={() => patchState(ex.id, { weightText: String(suggestion) })}
                            >
                              {t('logger.applySuggestion', { weight: suggestion })}
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <label className="data w-14 text-[10px] uppercase text-muted">{t('logger.weight')}</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={s.weightText}
                          onChange={(e) => patchState(ex.id, { weightText: e.target.value })}
                          className="glass w-24 rounded-lg border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-sm font-semibold text-[var(--text)]"
                        />
                        <span className="data text-[10px] text-muted">kg</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="data w-14 text-[10px] uppercase text-muted">{t('logger.reps')}</label>
                        <button
                          className="glass h-9 w-9 rounded-lg border border-[var(--border)] text-lg text-[var(--text-dim)] active:scale-95"
                          onClick={() => patchState(ex.id, { selectedReps: Math.max(0, s.selectedReps - 1) })}
                        >
                          −
                        </button>
                        <span className="data w-8 text-center text-sm font-bold text-[var(--text)]">{s.selectedReps}</span>
                        <button
                          className="glass h-9 w-9 rounded-lg border border-[var(--border)] text-lg text-[var(--text-dim)] active:scale-95"
                          onClick={() => patchState(ex.id, { selectedReps: s.selectedReps + 1 })}
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="data w-14 flex-shrink-0 text-[10px] uppercase text-muted">RPE</label>
                        <div className="flex flex-wrap gap-1">
                          {RPE_OPTIONS.map((rpe) => (
                            <button
                              key={rpe}
                              onClick={() => patchState(ex.id, { selectedRpe: rpe })}
                              className={`data rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                                s.selectedRpe === rpe
                                  ? 'border-accent bg-accent-light text-[var(--text)]'
                                  : 'border-[var(--border)] text-[var(--text-dim)]'
                              }`}
                            >
                              {rpe}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button onClick={() => logSet(ex)} className="btn-accent w-full rounded-xl px-3 py-2.5 text-sm font-bold active:scale-[0.98]">
                        {t('logger.logSet', { set: setsDone + 1 })}
                      </button>

                      {s.loggedSets.length > 0 && (
                        <div className="space-y-1">
                          {s.loggedSets.map((set) => (
                            <div key={set.id} className="data flex justify-between text-[11px] text-[var(--text-dim)]">
                              <span>
                                {t('logger.setRow', { set: set.setNum })}
                              </span>
                              <span>
                                {set.weight} kg × {set.reps} @ {set.rpe}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {ex.notes && <p className="text-[11px] text-[var(--text-faint)]">{ex.notes}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Rest timer pill */}
      {restTimer && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2">
          <button
            onClick={() => setRestTimer(null)}
            className="data glass flex items-center gap-2 rounded-full border border-accent px-4 py-2 text-xs font-bold text-accent shadow-lg"
          >
            {t('logger.rest')} {Math.floor(restTimer.secondsLeft / 60)}:{String(restTimer.secondsLeft % 60).padStart(2, '0')}
          </button>
        </div>
      )}
    </div>
  )
}
