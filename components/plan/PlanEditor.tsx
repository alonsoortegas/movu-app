'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import type { Database } from '@/types/database'
import { DAY_ORDER, type DayKey } from '@/lib/workout/logic'
import { dateKey } from '@/lib/trends/compute'

type Plan = Database['public']['Tables']['workout_plans']['Row']
type Session = Database['public']['Tables']['workout_plan_sessions']['Row']
type Exercise = Database['public']['Tables']['workout_plan_exercises']['Row']

const SESSION_TYPES = ['strength', 'activation', 'cardio', 'other'] as const
const todayDate = () => dateKey(new Date().toISOString())

interface PlanMetaForm {
  name: string
  start_date: string
  weeks: string
  active: boolean
  notes: string
}

interface SessionForm {
  day_of_week: DayKey
  title: string
  session_type: string
  notes: string
}

interface ExerciseForm {
  exercise_name: string
  prescribed_sets: string
  prescribed_reps: string
  prescribed_weight_kg: string
  target_rpe: string
  rest_seconds: string
  superset_group: string
  is_isometric: boolean
  notes: string
}

const EMPTY_EXERCISE_FORM: ExerciseForm = {
  exercise_name: '',
  prescribed_sets: '',
  prescribed_reps: '',
  prescribed_weight_kg: '',
  target_rpe: '',
  rest_seconds: '',
  superset_group: '',
  is_isometric: false,
  notes: '',
}

const EMPTY_SESSION_FORM: SessionForm = {
  day_of_week: 'monday',
  title: '',
  session_type: 'strength',
  notes: '',
}

export default function PlanEditor({ initialPlans }: { initialPlans: Plan[] }) {
  const t = useTranslations('planEditor')
  const locale = useLocale()

  const [plans, setPlans] = useState<Plan[]>(initialPlans)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    initialPlans.find((p) => p.active)?.id ?? initialPlans[0]?.id ?? null,
  )
  const [sessions, setSessions] = useState<Session[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [metaOpen, setMetaOpen] = useState(initialPlans.length === 0)
  const [metaForm, setMetaForm] = useState<PlanMetaForm>({
    name: '',
    start_date: todayDate(),
    weeks: '8',
    active: true,
    notes: '',
  })
  const [metaMode, setMetaMode] = useState<'create' | 'edit'>('create')

  const [sessionForm, setSessionForm] = useState<SessionForm>(EMPTY_SESSION_FORM)
  const [sessionFormOpen, setSessionFormOpen] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)

  const [exerciseForm, setExerciseForm] = useState<ExerciseForm>(EMPTY_EXERCISE_FORM)
  const [exerciseFormSession, setExerciseFormSession] = useState<string | null>(null)
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null)

  const [copyTarget, setCopyTarget] = useState('')

  const plan = useMemo(() => plans.find((p) => p.id === selectedPlanId) ?? null, [plans, selectedPlanId])

  const loadPlan = useCallback(async (planId: string) => {
    const res = await fetch(`/api/plan?plan_id=${planId}`)
    if (!res.ok) return
    const data = await res.json()
    if (data.plan) {
      setPlans((prev) => prev.map((p) => (p.id === data.plan.id ? data.plan : p)))
      setSessions(data.sessions)
      setExercises(data.exercises)
    }
  }, [])

  useEffect(() => {
    if (selectedPlanId) void loadPlan(selectedPlanId)
  }, [selectedPlanId, loadPlan])

  function fail(message: string) {
    setError(message)
    setTimeout(() => setError(null), 3500)
  }

  async function saveMeta() {
    if (busy) return
    setBusy(true)
    const payload = {
      name: metaForm.name,
      start_date: metaForm.start_date,
      weeks: Number(metaForm.weeks),
      active: metaForm.active,
      notes: metaForm.notes || null,
    }
    const res =
      metaMode === 'create'
        ? await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch(`/api/plan/${selectedPlanId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setBusy(false)
    if (!res.ok) {
      fail(t('errors.savePlan'))
      return
    }
    const { plan: saved } = await res.json()
    if (metaMode === 'create') {
      setPlans((prev) => [saved, ...prev.map((p) => ({ ...p, active: saved.active ? false : p.active }))])
      setSelectedPlanId(saved.id)
      setSessions([])
      setExercises([])
    } else {
      setPlans((prev) => prev.map((p) => (p.id === saved.id ? saved : saved.active ? { ...p, active: false } : p)))
    }
    setMetaOpen(false)
  }

  function openCreateMeta() {
    setMetaMode('create')
    setMetaForm({ name: '', start_date: todayDate(), weeks: '8', active: true, notes: '' })
    setMetaOpen(true)
  }

  function openEditMeta() {
    if (!plan) return
    setMetaMode('edit')
    setMetaForm({ name: plan.name, start_date: plan.start_date, weeks: String(plan.weeks), active: plan.active, notes: plan.notes ?? '' })
    setMetaOpen(true)
  }

  async function saveSession() {
    if (!plan || busy) return
    setBusy(true)
    const res = await fetch(editingSessionId ? `/api/plan/sessions/${editingSessionId}` : '/api/plan/sessions', {
      method: editingSessionId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: plan.id,
        week_number: selectedWeek,
        day_of_week: sessionForm.day_of_week,
        title: sessionForm.title,
        session_type: sessionForm.session_type,
        notes: sessionForm.notes || null,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      fail(t('errors.saveSession'))
      return
    }
    const { session } = await res.json()
    setSessions((prev) => editingSessionId ? prev.map((item) => item.id === session.id ? session : item) : [...prev, session])
    setSessionForm(EMPTY_SESSION_FORM)
    setSessionFormOpen(false)
    setEditingSessionId(null)
  }

  function startEditSession(session: Session) {
    setEditingSessionId(session.id)
    setSessionForm({
      day_of_week: session.day_of_week as DayKey,
      title: session.title,
      session_type: session.session_type,
      notes: session.notes ?? '',
    })
    setSessionFormOpen(true)
  }

  async function deleteSession(id: string) {
    const res = await fetch(`/api/plan/sessions/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      fail(t('errors.delete'))
      return
    }
    setSessions((prev) => prev.filter((s) => s.id !== id))
    setExercises((prev) => prev.filter((e) => e.session_id !== id))
  }

  async function saveExercise(sessionId: string) {
    if (busy) return
    setBusy(true)
    const payload = {
      session_id: sessionId,
      exercise_name: exerciseForm.exercise_name,
      prescribed_sets: exerciseForm.prescribed_sets || null,
      prescribed_reps: exerciseForm.prescribed_reps || null,
      prescribed_weight_kg: exerciseForm.prescribed_weight_kg ? exerciseForm.prescribed_weight_kg.replace(',', '.') : null,
      target_rpe: exerciseForm.target_rpe || null,
      rest_seconds: exerciseForm.rest_seconds || null,
      superset_group: exerciseForm.superset_group || null,
      is_isometric: exerciseForm.is_isometric,
      notes: exerciseForm.notes || null,
      order_index: editingExerciseId
        ? undefined
        : exercises.filter((e) => e.session_id === sessionId).length,
    }
    const res = editingExerciseId
      ? await fetch(`/api/plan/exercises/${editingExerciseId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/plan/exercises', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setBusy(false)
    if (!res.ok) {
      fail(t('errors.saveExercise'))
      return
    }
    const { exercise } = await res.json()
    setExercises((prev) =>
      editingExerciseId ? prev.map((e) => (e.id === exercise.id ? exercise : e)) : [...prev, exercise],
    )
    setExerciseForm(EMPTY_EXERCISE_FORM)
    setExerciseFormSession(null)
    setEditingExerciseId(null)
  }

  function startEditExercise(ex: Exercise) {
    setEditingExerciseId(ex.id)
    setExerciseFormSession(ex.session_id)
    setExerciseForm({
      exercise_name: ex.exercise_name,
      prescribed_sets: ex.prescribed_sets != null ? String(ex.prescribed_sets) : '',
      prescribed_reps: ex.prescribed_reps ?? '',
      prescribed_weight_kg: ex.prescribed_weight_kg != null ? String(ex.prescribed_weight_kg) : '',
      target_rpe: ex.target_rpe ?? '',
      rest_seconds: ex.rest_seconds != null ? String(ex.rest_seconds) : '',
      superset_group: ex.superset_group != null ? String(ex.superset_group) : '',
      is_isometric: ex.is_isometric,
      notes: ex.notes ?? '',
    })
  }

  async function deleteExercise(id: string) {
    const res = await fetch(`/api/plan/exercises/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      fail(t('errors.delete'))
      return
    }
    setExercises((prev) => prev.filter((e) => e.id !== id))
  }

  async function moveExercise(ex: Exercise, direction: -1 | 1) {
    const siblings = exercises
      .filter((e) => e.session_id === ex.session_id)
      .sort((a, b) => a.order_index - b.order_index)
    const idx = siblings.findIndex((e) => e.id === ex.id)
    const swap = siblings[idx + direction]
    if (!swap) return
    await Promise.all([
      fetch(`/api/plan/exercises/${ex.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_index: swap.order_index }) }),
      fetch(`/api/plan/exercises/${swap.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_index: ex.order_index }) }),
    ])
    setExercises((prev) =>
      prev.map((e) =>
        e.id === ex.id ? { ...e, order_index: swap.order_index } : e.id === swap.id ? { ...e, order_index: ex.order_index } : e,
      ),
    )
  }

  async function copyWeek() {
    if (!plan || !copyTarget.trim()) return
    const targets = copyTarget
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= plan.weeks && n !== selectedWeek)
    if (!targets.length) {
      fail(t('errors.copyTargets'))
      return
    }
    setBusy(true)
    const res = await fetch('/api/plan/weeks/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: plan.id, from_week: selectedWeek, to_weeks: targets }),
    })
    setBusy(false)
    if (!res.ok) {
      fail(t('errors.copyFailed'))
      return
    }
    setCopyTarget('')
    await loadPlan(plan.id)
  }

  const weekSessions = sessions
    .filter((s) => s.week_number === selectedWeek)
    .sort((a, b) => DAY_ORDER.indexOf(a.day_of_week as DayKey) - DAY_ORDER.indexOf(b.day_of_week as DayKey))

  const inputCls =
    'glass rounded-lg border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--text)]'
  const smallBtn =
    'glass rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] font-semibold text-[var(--text-dim)] active:scale-95'

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-[rgba(251,113,133,0.35)] bg-[rgba(251,113,133,0.1)] px-3 py-2 text-xs text-[var(--coral)]">
          {error}
        </div>
      )}

      {/* Plan picker + meta */}
      <div className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedPlanId(p.id)
                setSelectedWeek(1)
                setMetaOpen(false)
              }}
              className={`data rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                p.id === selectedPlanId
                  ? 'border-accent bg-accent-light text-[var(--text)]'
                  : 'border-[var(--border)] text-[var(--text-dim)]'
              }`}
            >
              {p.name}
              {p.active && <span className="ml-1.5 text-accent">●</span>}
            </button>
          ))}
          <button onClick={openCreateMeta} className={smallBtn}>
            + {t('newPlan')}
          </button>
          {plan && (
            <button onClick={openEditMeta} className={smallBtn}>
              {t('editMeta')}
            </button>
          )}
        </div>

        {metaOpen && (
          <div className="mt-3 space-y-2 border-t border-dashed border-[var(--border)] pt-3">
            <input
              value={metaForm.name}
              onChange={(e) => setMetaForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('fields.name')}
              className={`${inputCls} w-full`}
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={metaForm.start_date}
                onChange={(e) => setMetaForm((f) => ({ ...f, start_date: e.target.value }))}
                className={`${inputCls} flex-1`}
              />
              <input
                type="number"
                min={1}
                max={52}
                value={metaForm.weeks}
                onChange={(e) => setMetaForm((f) => ({ ...f, weeks: e.target.value }))}
                placeholder={t('fields.weeks')}
                className={`${inputCls} w-24`}
              />
              <label className="data flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
                <input
                  type="checkbox"
                  checked={metaForm.active}
                  onChange={(e) => setMetaForm((f) => ({ ...f, active: e.target.checked }))}
                />
                {t('fields.active')}
              </label>
            </div>
            <input
              value={metaForm.notes}
              onChange={(e) => setMetaForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={t('fields.planNotes')}
              className={`${inputCls} w-full`}
            />
            <button onClick={saveMeta} disabled={busy || !metaForm.name.trim()} className="btn-accent w-full rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60">
              {metaMode === 'create' ? t('createPlan') : t('savePlan')}
            </button>
          </div>
        )}
      </div>

      {plan && (
        <>
          {/* Week selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {Array.from({ length: plan.weeks }, (_, i) => i + 1).map((week) => (
              <button
                key={week}
                onClick={() => setSelectedWeek(week)}
                className={`data flex-shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                  week === selectedWeek
                    ? 'btn-accent border-transparent'
                    : sessions.some((s) => s.week_number === week)
                      ? 'border-[var(--border)] text-[var(--text-dim)]'
                      : 'border-transparent text-[var(--text-faint)]'
                }`}
              >
                {t('weekChip', { week })}
              </button>
            ))}
          </div>

          {/* Copy week */}
          {weekSessions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="data text-[10px] uppercase text-muted">{t('copyWeek')}</span>
              <input
                value={copyTarget}
                onChange={(e) => setCopyTarget(e.target.value)}
                placeholder={t('copyPlaceholder')}
                className={`${inputCls} w-32`}
              />
              <button onClick={copyWeek} disabled={busy} className={smallBtn}>
                {t('copyCta')}
              </button>
            </div>
          )}

          {/* Sessions of the week */}
          {weekSessions.map((session) => {
            const sessionExercises = exercises
              .filter((e) => e.session_id === session.id)
              .sort((a, b) => a.order_index - b.order_index)
            const formOpenHere = exerciseFormSession === session.id
            return (
              <div key={session.id} className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="data text-[10px] uppercase tracking-wide text-muted">
                      {t(`days.${session.day_of_week}`)} · {t(`sessionType.${session.session_type}`)}
                    </div>
                    <div className="text-sm font-bold text-[var(--text)]">{session.title}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => startEditSession(session)} className={smallBtn}>{t('editSession')}</button>
                    <button onClick={() => deleteSession(session.id)} className={smallBtn}>✕</button>
                  </div>
                </div>
                {session.notes && <p className="mt-2 text-xs text-muted">{session.notes}</p>}

                <div className="mt-3 space-y-1.5">
                  {sessionExercises.map((ex, idx) => (
                    <div key={ex.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-2">
                      <button onClick={() => startEditExercise(ex)} className="min-w-0 flex-1 text-left">
                        <div className="truncate text-xs font-semibold text-[var(--text)]">{ex.exercise_name}</div>
                        <div className="data text-[10px] text-muted">
                          {[
                            ex.prescribed_sets != null ? `${ex.prescribed_sets}×${ex.prescribed_reps ?? '—'}` : ex.prescribed_reps,
                            ex.prescribed_weight_kg != null ? `${ex.prescribed_weight_kg} kg` : null,
                            ex.target_rpe ? `RPE ${ex.target_rpe}` : null,
                            ex.superset_group != null ? `SS${ex.superset_group}` : null,
                            ex.is_isometric ? t('fields.isometric') : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </button>
                      <button onClick={() => moveExercise(ex, -1)} disabled={idx === 0} className={`${smallBtn} disabled:opacity-30`}>
                        ↑
                      </button>
                      <button onClick={() => moveExercise(ex, 1)} disabled={idx === sessionExercises.length - 1} className={`${smallBtn} disabled:opacity-30`}>
                        ↓
                      </button>
                      <button onClick={() => deleteExercise(ex.id)} className={smallBtn}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {formOpenHere ? (
                  <div className="mt-3 space-y-2 border-t border-dashed border-[var(--border)] pt-3">
                    <input
                      value={exerciseForm.exercise_name}
                      onChange={(e) => setExerciseForm((f) => ({ ...f, exercise_name: e.target.value }))}
                      placeholder={t('fields.exerciseName')}
                      className={`${inputCls} w-full`}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input value={exerciseForm.prescribed_sets} onChange={(e) => setExerciseForm((f) => ({ ...f, prescribed_sets: e.target.value }))} placeholder={t('fields.sets')} inputMode="numeric" className={inputCls} />
                      <input value={exerciseForm.prescribed_reps} onChange={(e) => setExerciseForm((f) => ({ ...f, prescribed_reps: e.target.value }))} placeholder={t('fields.reps')} className={inputCls} />
                      <input value={exerciseForm.prescribed_weight_kg} onChange={(e) => setExerciseForm((f) => ({ ...f, prescribed_weight_kg: e.target.value }))} placeholder="kg" inputMode="decimal" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input value={exerciseForm.target_rpe} onChange={(e) => setExerciseForm((f) => ({ ...f, target_rpe: e.target.value }))} placeholder="RPE" className={inputCls} />
                      <input value={exerciseForm.rest_seconds} onChange={(e) => setExerciseForm((f) => ({ ...f, rest_seconds: e.target.value }))} placeholder={t('fields.rest')} inputMode="numeric" className={inputCls} />
                      <input value={exerciseForm.superset_group} onChange={(e) => setExerciseForm((f) => ({ ...f, superset_group: e.target.value }))} placeholder={t('fields.superset')} inputMode="numeric" className={inputCls} />
                    </div>
                    <input
                      value={exerciseForm.notes}
                      onChange={(e) => setExerciseForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder={t('fields.notes')}
                      className={`${inputCls} w-full`}
                    />
                    <label className="data flex items-center gap-2 text-[11px] text-[var(--text-dim)]">
                      <input
                        type="checkbox"
                        checked={exerciseForm.is_isometric}
                        onChange={(e) => setExerciseForm((f) => ({ ...f, is_isometric: e.target.checked }))}
                      />
                      {t('fields.isometric')}
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveExercise(session.id)}
                        disabled={busy || !exerciseForm.exercise_name.trim()}
                        className="btn-accent flex-1 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60"
                      >
                        {editingExerciseId ? t('saveExercise') : t('addExercise')}
                      </button>
                      <button
                        onClick={() => {
                          setExerciseFormSession(null)
                          setEditingExerciseId(null)
                          setExerciseForm(EMPTY_EXERCISE_FORM)
                        }}
                        className={smallBtn}
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setExerciseFormSession(session.id)
                      setEditingExerciseId(null)
                      setExerciseForm(EMPTY_EXERCISE_FORM)
                    }}
                    className={`${smallBtn} mt-3`}
                  >
                    + {t('addExercise')}
                  </button>
                )}
              </div>
            )
          })}

          {/* Add session */}
          <div className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl">
            {sessionFormOpen ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={sessionForm.day_of_week}
                    onChange={(e) => setSessionForm((f) => ({ ...f, day_of_week: e.target.value as DayKey }))}
                    className={`${inputCls} flex-1`}
                  >
                    {DAY_ORDER.map((day) => (
                      <option key={day} value={day}>
                        {t(`days.${day}`)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sessionForm.session_type}
                    onChange={(e) => setSessionForm((f) => ({ ...f, session_type: e.target.value }))}
                    className={`${inputCls} flex-1`}
                  >
                    {SESSION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`sessionType.${type}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={t('fields.sessionTitle')}
                  className={`${inputCls} w-full`}
                />
                <input
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder={t('fields.sessionNotes')}
                  className={`${inputCls} w-full`}
                />
                <div className="flex gap-2">
                  <button onClick={saveSession} disabled={busy || !sessionForm.title.trim()} className="btn-accent flex-1 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60">
                    {editingSessionId ? t('saveSession') : t('addSession')}
                  </button>
                  <button onClick={() => { setSessionFormOpen(false); setEditingSessionId(null); setSessionForm(EMPTY_SESSION_FORM) }} className={smallBtn}>
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setEditingSessionId(null); setSessionForm(EMPTY_SESSION_FORM); setSessionFormOpen(true) }} className={smallBtn}>
                + {t('addSession')}
              </button>
            )}
          </div>

          <Link href={`/${locale}/plan`} className="data inline-block text-[11px] font-semibold text-accent underline-offset-2 hover:underline">
            ← {t('backToPlan')}
          </Link>
        </>
      )}
    </div>
  )
}
