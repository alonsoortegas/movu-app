# Dashboard Today-Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `app/[locale]/dashboard/page.tsx` into an action-first "today cockpit" (today's planned session, fuel today, today's inputs, condensed week strip) and remove the AI insight card.

**Architecture:** Server-component rewrite. The page queries Supabase directly (same pattern as the trends/plan pages) and reuses `computeBodyTrend` / `computeFuelTrends` / `computeLoadTrends` from `lib/trends/compute.ts`. New pure derivation helpers live in `lib/dashboard/today.ts` (unit-tested). New presentational server components live in `components/dashboard/`. No new API routes, no client state.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, next-intl (server `getTranslations`), Supabase JS, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-18-dashboard-today-cockpit-design.md`

## Global Constraints

- All dates/weeks go through `dateKey` / `weekStartKey` from `lib/trends/compute.ts` (timezone `America/Mexico_City`). Never use raw `toISOString().split('T')[0]` for user-facing day logic.
- Every new i18n key must be added to ALL THREE locale files: `messages/es.json`, `messages/en.json`, `messages/de.json` (de uses English copy — that matches the existing de file, which is untranslated).
- Chart/verdict colors are the trends-page constants: MINT `#00d26a`, CYAN `#38bdf8`, VIOLET `#a78bfa`, CORAL `#fb7185`, AMBER `#fbbf24`. Verdict mapping: on_track→MINT, fast→AMBER, slow→CORAL.
- Card container styling follows the trends page Panel: `className="panel mobile-sheet rounded-[1.6rem] p-5 md:rounded-2xl"` — one responsive tree per section, NO duplicated `md:hidden` / `hidden md:block` pairs.
- No new API routes. `/api/insights/latest`, the `insights` table, and `/api/dashboard` are untouched.
- Tests run with `npx vitest run <file>`; type-check with `npx tsc --noEmit`.
- Commit after every task with a `feat:`/`test:` conventional message ending in the Claude co-author trailer.

---

### Task 1: Pure dashboard derivation helpers

**Files:**
- Create: `lib/dashboard/today.ts`
- Test: `lib/dashboard/today.test.ts`

**Interfaces:**
- Consumes: `DAY_ORDER`, `DayKey` from `@/lib/workout/logic`; `weekStartKey`, `LoadWeek` from `@/lib/trends/compute`; `MacroTotals`, `NutritionDayType` from `@/lib/nutrition/macros`.
- Produces (used by Tasks 4 and 5):
  - `resolveTodaySession<T extends SessionLite>(sessions: T[], todayKey: DayKey): TodaySession<T>` where `TodaySession<T> = { kind: 'session'; session: T } | { kind: 'rest'; next: T | null; daysUntilNext: number | null }`
  - `padLoadWeeks(weeks: LoadWeek[], todayKey: string, n: number): PaddedLoadWeek[]` with `PaddedLoadWeek = { week: string; trainingMin: number; sessions: number; isCurrent: boolean }`
  - `fuelTargetsForDayType(targets: TargetRow[], dayType: NutritionDayType): MacroTotals | null`

- [ ] **Step 1: Write the failing test**

Create `lib/dashboard/today.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fuelTargetsForDayType, padLoadWeeks, resolveTodaySession } from './today'

const session = (day: string, title: string) => ({
  day_of_week: day,
  title,
  session_type: 'strength',
})

describe('resolveTodaySession', () => {
  it('returns the session matching today', () => {
    const sessions = [session('monday', 'Push'), session('wednesday', 'Pull')]
    const result = resolveTodaySession(sessions, 'wednesday')
    expect(result).toEqual({ kind: 'session', session: sessions[1] })
  })

  it('returns rest with the next session later this week', () => {
    const sessions = [session('monday', 'Push'), session('friday', 'Legs')]
    const result = resolveTodaySession(sessions, 'wednesday')
    expect(result).toEqual({ kind: 'rest', next: sessions[1], daysUntilNext: 2 })
  })

  it('wraps to next week when all sessions are past', () => {
    const sessions = [session('monday', 'Push'), session('tuesday', 'Pull')]
    const result = resolveTodaySession(sessions, 'saturday')
    expect(result).toEqual({ kind: 'rest', next: sessions[0], daysUntilNext: 2 })
  })

  it('returns rest with null next when there are no sessions', () => {
    expect(resolveTodaySession([], 'monday')).toEqual({ kind: 'rest', next: null, daysUntilNext: null })
  })
})

describe('padLoadWeeks', () => {
  it('pads to n Monday-keyed weeks, zero-filling gaps, marking the current week', () => {
    // 2026-07-18 is a Saturday; its ISO week starts 2026-07-13.
    const weeks = [
      { week: '2026-07-13', trainingMin: 120, lifestyleMin: 0, sessions: 3, strain: 0 },
      { week: '2026-06-29', trainingMin: 90, lifestyleMin: 10, sessions: 2, strain: 0 },
    ]
    const out = padLoadWeeks(weeks, '2026-07-18', 6)
    expect(out).toHaveLength(6)
    expect(out[0]).toEqual({ week: '2026-06-08', trainingMin: 0, sessions: 0, isCurrent: false })
    expect(out[3]).toEqual({ week: '2026-06-29', trainingMin: 90, sessions: 2, isCurrent: false })
    expect(out[5]).toEqual({ week: '2026-07-13', trainingMin: 120, sessions: 3, isCurrent: true })
  })
})

describe('fuelTargetsForDayType', () => {
  const row = (day_type: string) => ({
    day_type,
    calories_target: 2500,
    protein_target: 180,
    carbs_target: 250,
    fat_target: 80,
  })

  it('maps the matching day type to MacroTotals', () => {
    expect(fuelTargetsForDayType([row('rest'), row('hard')], 'hard')).toEqual({
      calories: 2500,
      protein_g: 180,
      carbs_g: 250,
      fat_g: 80,
    })
  })

  it('falls back to the first row when no day type matches', () => {
    expect(fuelTargetsForDayType([row('hard')], 'rest')).toEqual({
      calories: 2500,
      protein_g: 180,
      carbs_g: 250,
      fat_g: 80,
    })
  })

  it('returns null when there are no target rows', () => {
    expect(fuelTargetsForDayType([], 'moderate')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/dashboard/today.test.ts`
Expected: FAIL — cannot resolve `./today`.

- [ ] **Step 3: Write the implementation**

Create `lib/dashboard/today.ts`:

```ts
// Pure derivations for the dashboard "today cockpit". Data fetching stays in
// the page; everything here is testable without Supabase.

import { DAY_ORDER, type DayKey } from '@/lib/workout/logic'
import { weekStartKey, type LoadWeek } from '@/lib/trends/compute'
import type { MacroTotals, NutritionDayType } from '@/lib/nutrition/macros'

export interface SessionLite {
  day_of_week: string
  title: string
  session_type: string
}

export type TodaySession<T extends SessionLite> =
  | { kind: 'session'; session: T }
  | { kind: 'rest'; next: T | null; daysUntilNext: number | null }

// Sessions belong to the current plan week; on a rest day the "next" session
// wraps forward as a preview hint (next week's line-up may differ).
export function resolveTodaySession<T extends SessionLite>(
  sessions: T[],
  todayKey: DayKey,
): TodaySession<T> {
  const match = sessions.find((s) => s.day_of_week === todayKey)
  if (match) return { kind: 'session', session: match }

  const todayIdx = DAY_ORDER.indexOf(todayKey)
  let next: T | null = null
  let best = Infinity
  for (const s of sessions) {
    const idx = DAY_ORDER.indexOf(s.day_of_week as DayKey)
    if (idx === -1) continue
    const delta = (idx - todayIdx + 7) % 7 || 7
    if (delta < best) {
      best = delta
      next = s
    }
  }
  return { kind: 'rest', next, daysUntilNext: next ? best : null }
}

export interface PaddedLoadWeek {
  week: string
  trainingMin: number
  sessions: number
  isCurrent: boolean
}

function addDays(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
}

// computeLoadTrends only emits weeks that have data; the dashboard bar chart
// needs a fixed n-week window ending in the current week.
export function padLoadWeeks(weeks: LoadWeek[], todayKey: string, n: number): PaddedLoadWeek[] {
  const current = weekStartKey(todayKey)
  const byWeek = new Map(weeks.map((w) => [w.week, w]))
  const out: PaddedLoadWeek[] = []
  for (let i = n - 1; i >= 0; i--) {
    const week = addDays(current, -7 * i)
    const row = byWeek.get(week)
    out.push({
      week,
      trainingMin: row?.trainingMin ?? 0,
      sessions: row?.sessions ?? 0,
      isCurrent: i === 0,
    })
  }
  return out
}

export interface TargetRow {
  day_type: string
  calories_target: number
  protein_target: number
  carbs_target: number
  fat_target: number
}

// Mirrors the target selection in components/nutrition/NutritionToday.tsx.
export function fuelTargetsForDayType(
  targets: TargetRow[],
  dayType: NutritionDayType,
): MacroTotals | null {
  const row = targets.find((t) => t.day_type === dayType) ?? targets[0]
  if (!row) return null
  return {
    calories: row.calories_target,
    protein_g: row.protein_target,
    carbs_g: row.carbs_target,
    fat_g: row.fat_target,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/dashboard/today.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/today.ts lib/dashboard/today.test.ts
git commit -m "feat: dashboard today-cockpit derivation helpers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Locale messages for the new dashboard

**Files:**
- Modify: `messages/es.json` (the `"dashboard"` object)
- Modify: `messages/en.json` (the `"dashboard"` object)
- Modify: `messages/de.json` (the `"dashboard"` object)

**Interfaces:**
- Produces: message keys under `dashboard.*` consumed by Tasks 3–5 via `getTranslations('dashboard')`, `getTranslations('dashboard.todaySession')`, `getTranslations('dashboard.fuel')`, `getTranslations('dashboard.week')`.
- Removes: `dashboard.aiLabel`, `aiInsightTitle`, `aiInsight`, `aiInsightEmpty`, `aiGenerate`, `thisWeek`, `weeklyProgress`, `muscleGroups`, `noMuscleData`, `weekLabel`, `metrics`, `progress`, `weekDays`. (These keys are only referenced by the old dashboard page, which Task 5 replaces; the app builds fine with them gone because next-intl resolves keys at runtime and Task 5 lands before any deploy.)

- [ ] **Step 1: Replace the `dashboard` object in `messages/es.json`**

```json
"dashboard": {
  "title": "Dashboard",
  "greeting": "Hola, {name}",
  "registerToday": "+ Registrar hoy",
  "registerCta": "+ Registrar entrenamiento de hoy",
  "recentWorkouts": "Últimos entrenamientos",
  "noActivities": "Aún no hay entrenamientos esta semana.",
  "todaySession": {
    "label": "Sesión de hoy",
    "exercises": "{count} ejercicios",
    "sets": "{count} series",
    "start": "Empezar sesión →",
    "restDay": "Día de descanso",
    "nextUp": "Próxima: {title} · {day}",
    "viewPlan": "Ver plan →",
    "noPlan": "Sin plan activo",
    "noPlanBody": "Crea tu plan semanal para ver aquí la sesión del día.",
    "createPlan": "Crear plan →",
    "notStarted": "Tu plan empieza el {date}",
    "expired": "Tu plan terminó",
    "editPlan": "Editar plan →"
  },
  "fuel": {
    "label": "Nutrición de hoy",
    "dayType": { "hard": "Día fuerte", "moderate": "Día moderado", "rest": "Día de descanso" },
    "kcal": "Calorías",
    "protein": "Proteína",
    "remaining": "Te quedan {kcal} kcal · {protein} g de proteína",
    "over": "Te pasaste por {kcal} kcal",
    "noTargets": "Configura tus objetivos de nutrición para ver el progreso.",
    "logMeal": "Registrar comida →"
  },
  "inputs": {
    "sleep": "Sueño",
    "steps": "Pasos",
    "recovery": "Recuperación"
  },
  "week": {
    "label": "Tu semana",
    "weight": "Peso",
    "perWeek": "sem",
    "phase": { "bulk": "Volumen", "cut": "Definición", "maintenance": "Mantenimiento" },
    "verdict": { "on_track": "En objetivo", "fast": "Rápido", "slow": "Lento" },
    "noWeight": "Registra tu peso para ver la tendencia.",
    "adherence": "Adherencia",
    "logged": "Registrado",
    "kcalOk": "Kcal ±10%",
    "proteinOk": "Proteína",
    "noFuel": "Sin comidas registradas esta semana.",
    "load": "Carga de entrenamiento",
    "sessions": "{count} sesiones esta semana",
    "noLoad": "Sin entrenamientos en las últimas semanas."
  }
}
```

- [ ] **Step 2: Replace the `dashboard` object in `messages/en.json` AND `messages/de.json`**

Use this identical block for both files (de is intentionally English, matching the rest of that file):

```json
"dashboard": {
  "title": "Dashboard",
  "greeting": "Hey, {name}",
  "registerToday": "+ Log today",
  "registerCta": "+ Log today's workout",
  "recentWorkouts": "Recent workouts",
  "noActivities": "No workouts logged this week yet.",
  "todaySession": {
    "label": "Today's session",
    "exercises": "{count} exercises",
    "sets": "{count} sets",
    "start": "Start session →",
    "restDay": "Rest day",
    "nextUp": "Next up: {title} · {day}",
    "viewPlan": "View plan →",
    "noPlan": "No active plan",
    "noPlanBody": "Create your weekly plan to see today's session here.",
    "createPlan": "Create plan →",
    "notStarted": "Your plan starts on {date}",
    "expired": "Your plan has ended",
    "editPlan": "Edit plan →"
  },
  "fuel": {
    "label": "Fuel today",
    "dayType": { "hard": "Hard day", "moderate": "Moderate day", "rest": "Rest day" },
    "kcal": "Calories",
    "protein": "Protein",
    "remaining": "{kcal} kcal · {protein} g protein remaining",
    "over": "Over by {kcal} kcal",
    "noTargets": "Set your nutrition targets to track progress.",
    "logMeal": "Log meal →"
  },
  "inputs": {
    "sleep": "Sleep",
    "steps": "Steps",
    "recovery": "Recovery"
  },
  "week": {
    "label": "Your week",
    "weight": "Weight",
    "perWeek": "wk",
    "phase": { "bulk": "Bulk", "cut": "Cut", "maintenance": "Maintenance" },
    "verdict": { "on_track": "On track", "fast": "Fast", "slow": "Slow" },
    "noWeight": "Log your weight to see the trend.",
    "adherence": "Adherence",
    "logged": "Logged",
    "kcalOk": "Kcal ±10%",
    "proteinOk": "Protein",
    "noFuel": "No meals logged this week.",
    "load": "Training load",
    "sessions": "{count} sessions this week",
    "noLoad": "No workouts in recent weeks."
  }
}
```

- [ ] **Step 3: Verify all three files are valid JSON**

Run: `for f in messages/es.json messages/en.json messages/de.json; do python3 -m json.tool "$f" > /dev/null && echo "$f OK"; done`
Expected: three `OK` lines.

- [ ] **Step 4: Commit**

```bash
git add messages/es.json messages/en.json messages/de.json
git commit -m "feat: dashboard today-cockpit locale messages

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: TodaySessionCard and FuelTodayCard components

**Files:**
- Create: `components/dashboard/TodaySessionCard.tsx`
- Create: `components/dashboard/FuelTodayCard.tsx`

**Interfaces:**
- Consumes: message keys from Task 2; `MacroTotals`, `NutritionDayType` from `@/lib/nutrition/macros`.
- Produces (used by Task 5):
  - `TodaySessionCard` default export, async server component, props `TodaySessionCardProps` (discriminated union on `state`, see code).
  - `FuelTodayCard` default export, async server component, props `{ locale: string; dayType: NutritionDayType; consumed: MacroTotals; target: MacroTotals | null }`.

- [ ] **Step 1: Create `components/dashboard/TodaySessionCard.tsx`**

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'

export type TodaySessionCardProps =
  | {
      state: 'session'
      locale: string
      title: string
      sessionType: string
      exerciseCount: number
      setCount: number
    }
  | { state: 'rest'; locale: string; nextTitle: string | null; nextDayLabel: string | null }
  | { state: 'no_plan'; locale: string }
  | { state: 'inactive'; locale: string; reason: 'not_started' | 'expired'; startDate: string }

export default async function TodaySessionCard(props: TodaySessionCardProps) {
  const t = await getTranslations('dashboard.todaySession')
  const { locale } = props

  let body: ReactNode
  let cta: { href: string; label: string }

  if (props.state === 'session') {
    body = (
      <>
        <p className="display mt-3 text-2xl font-bold leading-tight text-[var(--text)]">{props.title}</p>
        <p className="data mt-1 text-xs text-[var(--text-dim)]">
          {props.sessionType} · {t('exercises', { count: props.exerciseCount })} · {t('sets', { count: props.setCount })}
        </p>
      </>
    )
    cta = { href: `/${locale}/plan`, label: t('start') }
  } else if (props.state === 'rest') {
    body = (
      <>
        <p className="display mt-3 text-2xl font-bold leading-tight text-[var(--text)]">{t('restDay')}</p>
        {props.nextTitle && props.nextDayLabel && (
          <p className="data mt-1 text-xs text-[var(--text-dim)]">
            {t('nextUp', { title: props.nextTitle, day: props.nextDayLabel })}
          </p>
        )}
      </>
    )
    cta = { href: `/${locale}/plan`, label: t('viewPlan') }
  } else if (props.state === 'inactive') {
    body = (
      <p className="display mt-3 text-xl font-bold leading-tight text-[var(--text)]">
        {props.reason === 'not_started' ? t('notStarted', { date: props.startDate }) : t('expired')}
      </p>
    )
    cta = { href: `/${locale}/plan/edit`, label: t('editPlan') }
  } else {
    body = (
      <>
        <p className="display mt-3 text-xl font-bold leading-tight text-[var(--text)]">{t('noPlan')}</p>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t('noPlanBody')}</p>
      </>
    )
    cta = { href: `/${locale}/plan/edit`, label: t('createPlan') }
  }

  return (
    <section className="panel mobile-sheet rounded-[1.6rem] p-5 md:rounded-2xl">
      <p className="data text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">{t('label')}</p>
      {body}
      <Link href={cta.href} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-accent">
        {cta.label}
      </Link>
    </section>
  )
}
```

- [ ] **Step 2: Create `components/dashboard/FuelTodayCard.tsx`**

```tsx
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { MacroTotals, NutritionDayType } from '@/lib/nutrition/macros'

const KCAL_COLOR = '#fbbf24'
const PROTEIN_COLOR = '#38bdf8'

function MacroBar({
  label,
  consumed,
  target,
  color,
}: {
  label: string
  consumed: number
  target: number | null
  color: string
}) {
  const pct = target && target > 0 ? Math.min((consumed / target) * 100, 100) : 0
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[var(--text-dim)]">{label}</span>
        <span className="data text-[var(--text-faint)]">
          {Math.round(consumed)}
          {target != null ? ` / ${Math.round(target)}` : ''}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ring-track)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default async function FuelTodayCard({
  locale,
  dayType,
  consumed,
  target,
}: {
  locale: string
  dayType: NutritionDayType
  consumed: MacroTotals
  target: MacroTotals | null
}) {
  const t = await getTranslations('dashboard.fuel')
  const remainingKcal = target ? Math.round(target.calories - consumed.calories) : null
  const remainingProtein = target ? Math.max(0, Math.round(target.protein_g - consumed.protein_g)) : null

  return (
    <section className="panel mobile-sheet rounded-[1.6rem] p-5 md:rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <p className="data text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">{t('label')}</p>
        <span className="data rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-dim)]">
          {t(`dayType.${dayType}`)}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <MacroBar label={t('kcal')} consumed={consumed.calories} target={target?.calories ?? null} color={KCAL_COLOR} />
        <MacroBar label={t('protein')} consumed={consumed.protein_g} target={target?.protein_g ?? null} color={PROTEIN_COLOR} />
      </div>
      {target && remainingKcal != null ? (
        <p className="data mt-3 text-xs text-[var(--text-dim)]">
          {remainingKcal >= 0
            ? t('remaining', { kcal: remainingKcal, protein: remainingProtein })
            : t('over', { kcal: Math.abs(remainingKcal) })}
        </p>
      ) : (
        <p className="data mt-3 text-xs text-[var(--text-dim)]">{t('noTargets')}</p>
      )}
      <Link href={`/${locale}/nutricion`} className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-accent">
        {t('logMeal')}
      </Link>
    </section>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/TodaySessionCard.tsx components/dashboard/FuelTodayCard.tsx
git commit -m "feat: today-session and fuel-today dashboard cards

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: WeekStrip component

**Files:**
- Create: `components/dashboard/WeekStrip.tsx`

**Interfaces:**
- Consumes: `BarChart` from `@/components/charts/charts` (client component; fine to render from a server component); `PhaseKind`, `Verdict` from `@/lib/trends/compute`; `PaddedLoadWeek` from `@/lib/dashboard/today` (Task 1); `dashboard.week.*` messages (Task 2).
- Produces (used by Task 5): `WeekStrip` default export, async server component, props:

```ts
export interface WeekStripProps {
  locale: string
  body: { phase: PhaseKind | null; ratePerWeek: number; verdict: Verdict | null } | null
  adherence: { loggedPct: number | null; kcalWithin10Pct: number | null; proteinHitPct: number | null } | null
  loadWeeks: PaddedLoadWeek[]
}
```

- [ ] **Step 1: Create `components/dashboard/WeekStrip.tsx`**

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { BarChart } from '@/components/charts/charts'
import type { PhaseKind, Verdict } from '@/lib/trends/compute'
import type { PaddedLoadWeek } from '@/lib/dashboard/today'

const MINT = '#00d26a'
const CYAN = '#38bdf8'
const CORAL = '#fb7185'
const AMBER = '#fbbf24'
const VERDICT_COLOR: Record<Verdict, string> = { on_track: MINT, fast: AMBER, slow: CORAL }

export interface WeekStripProps {
  locale: string
  body: { phase: PhaseKind | null; ratePerWeek: number; verdict: Verdict | null } | null
  adherence: { loggedPct: number | null; kcalWithin10Pct: number | null; proteinHitPct: number | null } | null
  loadWeeks: PaddedLoadWeek[]
}

function signed(value: number, decimals = 2): string {
  const s = value.toFixed(decimals)
  return value > 0 ? `+${s}` : s
}

function StripPanel({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="panel mobile-sheet block rounded-[1.6rem] p-4 transition-colors hover:border-accent md:rounded-2xl">
      {children}
    </Link>
  )
}

function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <p className="data text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">{children}</p>
  )
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="data mt-3 text-[11px] text-[var(--text-faint)]">{children}</p>
}

function AdherenceStat({ label, pct, color }: { label: string; pct: number | null; color: string }) {
  return (
    <div>
      <div className="data text-lg font-bold leading-none" style={{ color }}>
        {pct != null ? `${pct}%` : '—'}
      </div>
      <div className="data mt-1 text-[9px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  )
}

export default async function WeekStrip({ locale, body, adherence, loadWeeks }: WeekStripProps) {
  const t = await getTranslations('dashboard.week')
  const trendsHref = `/${locale}/trends`
  const sessionsThisWeek = loadWeeks.find((w) => w.isCurrent)?.sessions ?? 0
  const hasLoad = loadWeeks.some((w) => w.trainingMin > 0)
  const hasAdherence = adherence != null && adherence.loggedPct != null

  return (
    <div>
      <h2 className="data mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
        {t('label')}
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        <StripPanel href={trendsHref}>
          <PanelLabel>{t('weight')}</PanelLabel>
          {body ? (
            <>
              <p
                className="data mt-3 text-xl font-bold leading-none"
                style={{ color: body.verdict ? VERDICT_COLOR[body.verdict] : 'var(--text)' }}
              >
                {signed(body.ratePerWeek)} kg/{t('perWeek')}
              </p>
              <p className="data mt-2 text-[10px] uppercase tracking-wide text-muted">
                {[body.phase ? t(`phase.${body.phase}`) : null, body.verdict ? t(`verdict.${body.verdict}`) : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </>
          ) : (
            <EmptyNote>{t('noWeight')}</EmptyNote>
          )}
        </StripPanel>

        <StripPanel href={trendsHref}>
          <PanelLabel>{t('adherence')}</PanelLabel>
          {hasAdherence ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <AdherenceStat label={t('logged')} pct={adherence.loggedPct} color={MINT} />
              <AdherenceStat label={t('kcalOk')} pct={adherence.kcalWithin10Pct} color={AMBER} />
              <AdherenceStat label={t('proteinOk')} pct={adherence.proteinHitPct} color={CYAN} />
            </div>
          ) : (
            <EmptyNote>{t('noFuel')}</EmptyNote>
          )}
        </StripPanel>

        <StripPanel href={trendsHref}>
          <PanelLabel>{t('load')}</PanelLabel>
          {hasLoad ? (
            <>
              <div className="mt-3">
                <BarChart
                  data={loadWeeks.map((w) => w.trainingMin)}
                  colors={loadWeeks.map((w) => (w.isCurrent ? MINT : CYAN))}
                  height={48}
                />
              </div>
              <p className="data mt-2 text-[10px] uppercase tracking-wide text-muted">
                {t('sessions', { count: sessionsThisWeek })}
              </p>
            </>
          ) : (
            <EmptyNote>{t('noLoad')}</EmptyNote>
          )}
        </StripPanel>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/WeekStrip.tsx
git commit -m "feat: condensed week strip for dashboard

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Rewrite the dashboard page

**Files:**
- Modify: `app/[locale]/dashboard/page.tsx` (full replacement)

**Interfaces:**
- Consumes everything produced by Tasks 1–4, plus existing code: `getPlanWeek`, `getTodayKey` from `@/lib/workout/logic`; `dateKey`, `dayRangeUtc`, `weekStartKey`, `selectActivePhase`, `computeBodyTrend`, `computeFuelTrends`, `computeLoadTrends`, `FuelDay`, `PhaseKind`, `TrainingPhase` from `@/lib/trends/compute`; `calculateConsumed`, `EMPTY_MACRO_TOTALS`, `NutritionDayType` from `@/lib/nutrition/macros`; `formatActivityDisplayName` from `@/lib/activities/display-name`; `MobilePageIntro`.
- Produces: the final page. Removes the AI insight card, the `insights` query, the week-day emoji grid, generic metric tiles, weekly progress bars, and muscle-group chips.

- [ ] **Step 1: Replace `app/[locale]/dashboard/page.tsx` entirely**

```tsx
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { formatActivityDisplayName } from '@/lib/activities/display-name'
import {
  computeBodyTrend,
  computeFuelTrends,
  computeLoadTrends,
  dateKey,
  dayRangeUtc,
  selectActivePhase,
  weekStartKey,
  type FuelDay,
  type PhaseKind,
  type TrainingPhase,
} from '@/lib/trends/compute'
import { getPlanWeek, getTodayKey } from '@/lib/workout/logic'
import { fuelTargetsForDayType, padLoadWeeks, resolveTodaySession } from '@/lib/dashboard/today'
import { calculateConsumed, EMPTY_MACRO_TOTALS, type NutritionDayType } from '@/lib/nutrition/macros'
import MobilePageIntro from '@/components/mobile/MobilePageIntro'
import TodaySessionCard, { type TodaySessionCardProps } from '@/components/dashboard/TodaySessionCard'
import FuelTodayCard from '@/components/dashboard/FuelTodayCard'
import WeekStrip from '@/components/dashboard/WeekStrip'

const CATEGORY_SYMBOL: Record<string, string> = {
  run: '↗',
  ride: '≈',
  strength: '▲',
  hiit: '◆',
  mobility: '○',
  walk: '→',
  swim: '∿',
  other: '·',
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getDisplayName(fullName: string | null | undefined, email: string | undefined): string {
  const name = fullName?.trim()
  if (name) return name
  return email?.split('@')[0] || ''
}

function getInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return initials || 'M'
}

function InputTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl">
      <p className="data text-[10px] uppercase tracking-[0.18em] text-[var(--text-faint)]">{label}</p>
      <p className="data mt-2 text-xl font-bold text-[var(--text)]">
        {value}
        {unit && <span className="ml-1 text-[10px] font-normal text-[var(--text-faint)]">{unit}</span>}
      </p>
    </div>
  )
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('dashboard')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const todayKey = dateKey(now.toISOString())
  const todayDayKey = getTodayKey(now)
  const weekStart = weekStartKey(todayKey)
  const bodyStart = dateKey(new Date(now.getTime() - 28 * 86400000).toISOString())
  const loadStartIso = dayRangeUtc(dateKey(new Date(now.getTime() - 42 * 86400000).toISOString())).start

  const [
    profileResult,
    todaySleepResult,
    todayMetricResult,
    recentResult,
    plansResult,
    weekNutritionDaysResult,
    targetsResult,
    weekMealLogsResult,
    measurementsResult,
    phasesResult,
    loadActivitiesResult,
  ] = await Promise.all([
    supabase.from('user_profiles').select('full_name').eq('id', user!.id).maybeSingle(),
    supabase
      .from('sleep_logs')
      .select('hours')
      .eq('user_id', user!.id)
      .gte('date', dateKey(new Date(now.getTime() - 2 * 86400000).toISOString()))
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('daily_metrics')
      .select('steps_count, recovery_score')
      .eq('user_id', user!.id)
      .eq('date', todayKey)
      .maybeSingle(),
    supabase
      .from('activities')
      .select('id, activity_name, activity_type, activity_category, source, moving_time_s, start_date_utc, coach_name')
      .eq('user_id', user!.id)
      .order('start_date_utc', { ascending: false })
      .limit(3),
    supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', user!.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase.from('nutrition_days').select('date, day_type').eq('user_id', user!.id).gte('date', weekStart),
    supabase.from('nutrition_targets').select('*').eq('user_id', user!.id),
    supabase
      .from('meal_logs')
      .select('id, date, meal_log_items ( calories, protein_g, carbs_g, fat_g )')
      .eq('user_id', user!.id)
      .gte('date', weekStart)
      .lte('date', todayKey),
    supabase
      .from('body_measurements')
      .select('measured_at, weight_kg')
      .eq('user_id', user!.id)
      .gte('measured_at', bodyStart)
      .order('measured_at', { ascending: true }),
    supabase.from('training_phases').select('*').eq('user_id', user!.id).order('start_date', { ascending: false }),
    supabase
      .from('activities')
      .select('start_date_utc, activity_category, moving_time_s')
      .eq('user_id', user!.id)
      .gte('start_date_utc', loadStartIso),
  ])

  const queryError =
    profileResult.error ?? todaySleepResult.error ?? todayMetricResult.error ??
    recentResult.error ?? plansResult.error ?? weekNutritionDaysResult.error ??
    targetsResult.error ?? weekMealLogsResult.error ?? measurementsResult.error ??
    phasesResult.error ?? loadActivitiesResult.error
  if (queryError) {
    console.error('Failed to load dashboard data', JSON.stringify({
      code: queryError.code,
      message: queryError.message,
      details: queryError.details,
      hint: queryError.hint,
    }))
  }

  const profile = profileResult.data
  const todaySleep = todaySleepResult.data
  const todayMetric = todayMetricResult.data
  const recentActivities = recentResult.data
  const activePlans = plansResult.data
  const weekNutritionDays = weekNutritionDaysResult.data
  const targets = targetsResult.data
  const weekMealLogs = weekMealLogsResult.data
  const measurements = measurementsResult.data
  const phases = phasesResult.data
  const loadActivities = loadActivitiesResult.data

  const displayName = getDisplayName(profile?.full_name, user?.email)

  // ── Today's session ─────────────────────────────────────────────────────────
  const plan = activePlans?.[0] ?? null
  let sessionProps: TodaySessionCardProps = { state: 'no_plan', locale }
  if (plan) {
    const status = getPlanWeek(plan)
    if (!status.active) {
      sessionProps = { state: 'inactive', locale, reason: status.reason as 'not_started' | 'expired', startDate: plan.start_date }
    } else {
      const { data: sessions } = await supabase
        .from('workout_plan_sessions')
        .select('id, day_of_week, title, session_type')
        .eq('plan_id', plan.id)
        .eq('week_number', status.week!)
      const today = resolveTodaySession(sessions ?? [], todayDayKey)
      if (today.kind === 'session') {
        const { data: exercises } = await supabase
          .from('workout_plan_exercises')
          .select('prescribed_sets')
          .eq('session_id', today.session.id)
        sessionProps = {
          state: 'session',
          locale,
          title: today.session.title,
          sessionType: today.session.session_type,
          exerciseCount: (exercises ?? []).length,
          setCount: (exercises ?? []).reduce((s, e) => s + (e.prescribed_sets ?? 0), 0),
        }
      } else {
        const nextDayLabel = today.daysUntilNext != null
          ? new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(
              new Date(now.getTime() + today.daysUntilNext * 86400000),
            )
          : null
        sessionProps = {
          state: 'rest',
          locale,
          nextTitle: today.next?.title ?? null,
          nextDayLabel,
        }
      }
    }
  }

  // ── Fuel today + week adherence ─────────────────────────────────────────────
  const mealLogs = (weekMealLogs ?? []) as unknown as Array<{
    id: string
    date: string
    meal_log_items: Array<{
      calories: number | null
      protein_g: number | null
      carbs_g: number | null
      fat_g: number | null
    }> | null
  }>
  const dayTypeByDate = new Map((weekNutritionDays ?? []).map((row) => [row.date, row.day_type]))
  const todayDayType = (dayTypeByDate.get(todayKey) as NutritionDayType | undefined) ?? 'moderate'
  const todayItems = mealLogs
    .filter((log) => log.date === todayKey)
    .flatMap((log) => log.meal_log_items ?? [])
    .map((item) => ({
      calories: item.calories ?? 0,
      protein_g: item.protein_g ?? 0,
      carbs_g: item.carbs_g ?? 0,
      fat_g: item.fat_g ?? 0,
    }))
  const consumedToday = todayItems.length ? calculateConsumed(todayItems) : EMPTY_MACRO_TOTALS
  const todayTarget = fuelTargetsForDayType(targets ?? [], todayDayType)

  const fuelByDate = new Map<string, { kcal: number; protein: number; items: number }>()
  for (const log of mealLogs) {
    const agg = fuelByDate.get(log.date) ?? { kcal: 0, protein: 0, items: 0 }
    for (const item of log.meal_log_items ?? []) {
      agg.kcal += Number(item.calories) || 0
      agg.protein += Number(item.protein_g) || 0
      agg.items += 1
    }
    fuelByDate.set(log.date, agg)
  }
  const fuelDates = new Set([...fuelByDate.keys(), ...dayTypeByDate.keys()])
  const targetRows = targets ?? []
  const fuelDays: FuelDay[] = [...fuelDates].map((date) => {
    const agg = fuelByDate.get(date)
    const dayType = (dayTypeByDate.get(date) as NutritionDayType | undefined) ?? 'moderate'
    const target = fuelTargetsForDayType(targetRows, dayType)
    return {
      date,
      kcal: Math.round(agg?.kcal ?? 0),
      protein: Math.round(agg?.protein ?? 0),
      kcalTarget: target?.calories ?? null,
      proteinTarget: target?.protein_g ?? null,
      logged: (agg?.items ?? 0) > 0,
    }
  })
  const fuel = computeFuelTrends(fuelDays, todayKey)
  const adherence = fuelDays.length
    ? {
        loggedPct: fuel.adherence.loggedPct,
        kcalWithin10Pct: fuel.adherence.kcalWithin10Pct,
        proteinHitPct: fuel.adherence.proteinHitPct,
      }
    : null

  // ── Body trend ──────────────────────────────────────────────────────────────
  const openPhaseRow = selectActivePhase(phases ?? [], todayKey)
  const activePhase: TrainingPhase | null = openPhaseRow
    ? {
        phase: openPhaseRow.kind as PhaseKind,
        started_on: openPhaseRow.start_date,
        target_rate_kg_per_week: openPhaseRow.target_rate_kg_per_week,
      }
    : null
  const bodyTrend = computeBodyTrend(
    (measurements ?? []).map((m) => ({ measured_on: m.measured_at, weight_kg: m.weight_kg })),
    activePhase,
    todayKey,
  )
  const body = bodyTrend.ratePerWeek != null
    ? { phase: activePhase?.phase ?? null, ratePerWeek: bodyTrend.ratePerWeek, verdict: bodyTrend.verdict }
    : null

  // ── Training load ───────────────────────────────────────────────────────────
  const load = computeLoadTrends(
    (loadActivities ?? [])
      .filter((a) => a.start_date_utc != null)
      .map((a) => ({
        start: a.start_date_utc!,
        category: a.activity_category === 'walk' ? ('lifestyle' as const) : ('training' as const),
        minutes: a.moving_time_s != null ? Math.round(a.moving_time_s / 60) : null,
      })),
    [],
  )
  const loadWeeks = padLoadWeeks(load.weeks, todayKey, 6)

  // ── Today's inputs ──────────────────────────────────────────────────────────
  const sleepValue = todaySleep?.hours != null ? `${Math.round(todaySleep.hours * 10) / 10}` : '—'
  const stepsValue = todayMetric?.steps_count != null ? todayMetric.steps_count.toLocaleString(locale) : '—'
  const recoveryScore = todayMetric?.recovery_score ?? null

  const dateLabel = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(now)

  return (
    <div className="boot mx-auto max-w-5xl p-4 md:p-8">
      <MobilePageIntro
        title={t('greeting', { name: displayName })}
        eyebrow={dateLabel}
        aside={
          <div className="glass grid h-11 w-11 flex-none place-items-center rounded-full border border-[var(--border-hi)] text-xs font-bold text-[var(--text-dim)]">
            {getInitials(displayName)}
          </div>
        }
      />

      {/* Desktop header */}
      <div className="mb-8 hidden items-center justify-between md:flex">
        <div>
          <h1 className="display text-2xl font-bold text-[var(--text)]">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-muted">{dateLabel}</p>
        </div>
        <Link href={`/${locale}/registro`} className="btn-accent rounded-xl px-4 py-2.5 text-sm font-bold">
          {t('registerToday')}
        </Link>
      </div>

      <div className="space-y-5 md:space-y-6">
        {/* Today: session + fuel */}
        <div className="grid gap-4 md:grid-cols-2">
          <TodaySessionCard {...sessionProps} />
          <FuelTodayCard locale={locale} dayType={todayDayType} consumed={consumedToday} target={todayTarget} />
        </div>

        {/* Today's inputs */}
        <div className={`grid gap-3 ${recoveryScore != null ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <InputTile label={t('inputs.sleep')} value={sleepValue} unit="h" />
          <InputTile label={t('inputs.steps')} value={stepsValue} />
          {recoveryScore != null && (
            <InputTile label={t('inputs.recovery')} value={`${Math.round(recoveryScore)}`} unit="%" />
          )}
        </div>

        {/* Week strip */}
        <WeekStrip locale={locale} body={body} adherence={adherence} loadWeeks={loadWeeks} />

        {/* Recent workouts */}
        <div>
          <h2 className="data mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
            {t('recentWorkouts')}
          </h2>
          <div className="panel mobile-sheet overflow-hidden rounded-[1.6rem] md:rounded-2xl">
            {(recentActivities ?? []).length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted">{t('noActivities')}</div>
            ) : (
              (recentActivities ?? []).map((w, i) => (
                <div
                  key={w.id}
                  className={`flex items-center gap-3 px-4 py-4 ${i < (recentActivities?.length ?? 0) - 1 ? 'border-b border-[var(--ink-06)]' : ''}`}
                >
                  <div className="data grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-accent bg-accent-light text-base font-bold text-accent">
                    {CATEGORY_SYMBOL[w.activity_category ?? 'other'] ?? '·'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--text)]">
                      {formatActivityDisplayName(w)}
                    </div>
                    <div className="text-xs text-muted">
                      {[w.source, w.moving_time_s ? formatDuration(w.moving_time_s) : '—', w.coach_name]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  <span className="data text-sm text-muted">→</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Link
        href={`/${locale}/registro`}
        className="btn-accent fixed left-4 right-4 z-40 rounded-2xl py-3.5 text-center text-sm font-bold md:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
      >
        {t('registerCta')}
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. If `activity_type` or `coach_name` typing complains in `formatActivityDisplayName`, check `lib/activities/display-name.ts` for the exact expected shape and adjust the `recentActivities` select to match (the old page passed the same columns — it should already fit).

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: all suites pass (no existing test covers the old page markup, so nothing should break).

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/dashboard/page.tsx
git commit -m "feat: rework dashboard into today cockpit

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Build and state verification

**Files:**
- No new files. Verification only (plus any fixes it forces).

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds with `/[locale]/dashboard` compiled.

- [ ] **Step 2: Verify rendered states in the dev server**

Start the dev server (`npm run dev` or the browser preview tooling) and load `/es/dashboard` logged in as the dev user. Verify:

1. No AI insight card, no emoji week-day grid, no weekly-progress bars, no muscle-group chips anywhere on the page.
2. Today's-session card shows one of its four states and its CTA navigates to `/es/plan` or `/es/plan/edit`.
3. Fuel-today card shows kcal/protein bars against today's targets and the remaining line; CTA navigates to `/es/nutricion`.
4. Inputs row shows sleep and steps (and recovery only if Whoop data exists for today).
5. Week strip shows three panels (weight rate/verdict or its empty note, adherence percentages or its empty note, 6 load bars with the current week in mint) and each panel links to `/es/trends`.
6. Repeat at mobile width (375px) — sections stack, sticky register CTA visible, no horizontal scroll.
7. Load `/en/dashboard` once to confirm the English messages resolve (no `dashboard.todaySession.label`-style raw keys on screen).

- [ ] **Step 3: Commit any verification fixes**

```bash
git add -A
git commit -m "fix: dashboard verification fixes"
```

(Skip the commit if nothing changed. Include the Claude co-author trailer if it happens.)
