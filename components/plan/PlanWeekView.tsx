'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'
import {
  DAY_ORDER,
  getProgressionSuggestion,
  getPlanWeekDayDate,
  getTodayKey,
  type DayKey,
} from '@/lib/workout/logic'
import { formatPrescription, getBlockInstruction } from '@/lib/workout/prescription-copy'

type Plan = Database['public']['Tables']['workout_plans']['Row']
type Session = Database['public']['Tables']['workout_plan_sessions']['Row']
type Exercise = Database['public']['Tables']['workout_plan_exercises']['Row']
type SetLog = Database['public']['Tables']['workout_set_logs']['Row']

export default function PlanWeekView({
  plan,
  week,
  sessions,
  exercises,
  lastSets,
}: {
  plan: Plan
  week: number
  sessions: Session[]
  exercises: Exercise[]
  lastSets: Record<string, SetLog>
  historyLogs: SetLog[]
  todayLogs: SetLog[]
}) {
  const t = useTranslations('plan')
  const locale = useLocale()
  const router = useRouter()
  const todayKey = getTodayKey()
  const [selectedDay, setSelectedDay] = useState<DayKey>(todayKey)
  const [logError, setLogError] = useState<string | null>(null)
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null)

  const daySessions = useMemo(
    () => sessions.filter((s) => s.day_of_week === selectedDay),
    [sessions, selectedDay],
  )
  const gymDays = useMemo(() => new Set(sessions.map((s) => s.day_of_week)), [sessions])

  const dayLabel = (day: DayKey) => t(`days.${day}`)

  async function openSessionLogger(session: Session) {
    if (startingSessionId) return
    setStartingSessionId(session.id)
    setLogError(null)
    const performedOn = getPlanWeekDayDate(plan.start_date, week, selectedDay)
    const response = await fetch('/api/performed-workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_session_id: session.id,
        performed_on: performedOn,
        started_at: `${performedOn}T12:00:00.000Z`,
        status: 'in_progress',
      }),
    })
    const body = await response.json()
    if (!response.ok) {
      setStartingSessionId(null)
      setLogError(body.error ?? t('logger.openFailed'))
      return
    }
    router.push(`/${locale}/registro/${body.workout.id}`)
  }

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
        const hasGroupedExercises = sessionExercises.some((exercise) => exercise.superset_group != null)
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
              {sessionExercises.length > 0 && (
                <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--ink-02)] p-3">
                  <div className="data text-[9px] font-bold uppercase tracking-[0.14em] text-muted">
                    {t('blockInstruction.title')}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-dim)]">
                    {t('blockInstruction.straight_sets')}
                    {hasGroupedExercises ? ` ${t('blockInstruction.circuit')}` : ''}
                  </p>
                </div>
              )}
              <button
                type="button"
                disabled={startingSessionId === session.id}
                onClick={() => openSessionLogger(session)}
                className="btn-accent mt-3 min-h-11 w-full rounded-xl px-3 text-sm font-bold disabled:opacity-60"
              >
                {startingSessionId === session.id ? t('logger.opening') : t('logger.openLogger')}
              </button>
            </div>

            {sessionExercises.map((ex) => {
              const last = lastSets[ex.exercise_name]
              const suggestion = getProgressionSuggestion(
                ex.prescribed_reps,
                last ? { weight_kg: last.weight_kg, reps: last.reps } : undefined,
              )
              const setsTarget = ex.prescribed_sets ?? null
              return (
                <div key={ex.id} className="panel mobile-sheet rounded-[1.45rem] p-4 md:rounded-2xl">
                  <div className="flex w-full items-center justify-between gap-2 text-left">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--text)]">
                        {ex.exercise_name}
                        {ex.superset_group != null && (
                          <span
                            className="data ml-2 rounded-full border border-[var(--border)] px-1.5 py-0.5 text-[9px] text-[var(--violet)]"
                            title={t(`blockInstruction.${getBlockInstruction(ex.superset_group)}`)}
                          >
                            {t('blockInstruction.blockLabel', { block: ex.superset_group })}
                          </span>
                        )}
                      </div>
                      <div className="data mt-0.5 text-[10px] text-muted">
                        {[
                          ...formatPrescription({
                            sets: setsTarget,
                            reps: ex.prescribed_reps,
                            targetRpe: ex.target_rpe,
                            targetRir: null,
                            labels: {
                              sets: t('logger.sets'),
                              reps: t('logger.repetitions'),
                              perceivedEffort: t('logger.perceivedEffort'),
                              repsInReserve: t('logger.repsInReserve'),
                            },
                          }),
                           ...(ex.prescribed_weight_kg != null
                             ? [t('logger.suggestedWeight', { weight: ex.prescribed_weight_kg })]
                             : []),
                        ].join(' · ')}
                      </div>
                    </div>
                  </div>

                  {last && (
                    <div className="data mt-2 text-[10px] text-[var(--text-faint)]">
                      {t('logger.lastSet', { weight: last.weight_kg ?? 0, reps: last.reps ?? 0 })}
                    </div>
                  )}
                  {suggestion != null && (
                    <div className="data mt-2 text-[10px] text-accent">
                      {t('logger.progressionHint', { weight: suggestion })}
                    </div>
                  )}
                  {ex.notes && <p className="mt-2 text-[11px] text-[var(--text-faint)]">{ex.notes}</p>}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
