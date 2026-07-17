# Faithful LifeOS Mobile Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose Movu's authenticated mobile experience with the complete modern LifeOS visual language while preserving Movu's routes, data, translations, desktop layout, and native HealthKit behavior.

**Architecture:** Add small display-only mobile primitives and pure progress helpers, then use responsive markup to give Dashboard the reference hierarchy and align the other four routes with it. Keep true backdrop blur limited to fixed chrome and one hero per screen. The localized layout continues to mount one URL-driven mobile dock.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, CSS custom properties, next-intl, Vitest, Supabase SSR, Capacitor platform checks.

## Global Constraints

- Apply the redesign below Tailwind's `md` breakpoint (`768px`); retain the desktop sidebar layout.
- Preserve existing Supabase queries, APIs, mutations, form payloads, authentication, translations, and native platform checks.
- Do not create a recovery score: show `sleep_logs.performance_pct` only when available.
- Limit true `backdrop-filter` to fixed chrome, controls, overlays, the dock, and at most one hero per screen.
- Respect iOS safe areas; keep inputs at least `16px` and touch targets at least `44px`.
- Preserve reduced-motion, reduced-transparency, no-backdrop-filter, light, and dark modes.
- Add no dependencies and do not copy LifeOS branding, tab names, or content.

---

## File Map

- Create `lib/mobile-dashboard.ts` and `lib/mobile-dashboard.test.ts`: pure bounded progress calculations.
- Create `components/mobile/MobilePageIntro.tsx`: mobile page title and contextual eyebrow.
- Create `components/mobile/MobilePanel.tsx`: non-blurred repeated semantic panel.
- Create `components/mobile/MetricTile.tsx`: channel-colored metric tile.
- Create `components/mobile/ProgressRing.tsx`: accessible SVG ring and unavailable state.
- Modify `app/globals.css`: mobile composition, panel, ring, and dock styling.
- Modify `components/MobileHeader.tsx` and `components/BottomNav.tsx`: LifeOS-faithful persistent chrome.
- Modify Dashboard, Plan, Register, Trends, and Profile pages: responsive mobile composition only.
- Modify `messages/en.json`, `messages/es.json`, and `messages/de.json` together if new labels are required.

---

### Task 1: Mobile progress model and visual primitives

**Files:**
- Create: `lib/mobile-dashboard.ts`
- Create: `lib/mobile-dashboard.test.ts`
- Create: `components/mobile/MobilePageIntro.tsx`
- Create: `components/mobile/MobilePanel.tsx`
- Create: `components/mobile/MetricTile.tsx`
- Create: `components/mobile/ProgressRing.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: existing semantic CSS tokens.
- Produces: `clampPercent(value: number): number`, `weeklyActivityProgress(completed: number, target?: number | null): number | null`, and four display-only components.

- [ ] **Step 1: Write failing progress tests**

```ts
import { describe, expect, it } from 'vitest'
import { clampPercent, weeklyActivityProgress } from './mobile-dashboard'

describe('clampPercent', () => {
  it.each([[-20, 0], [0, 0], [58.9, 58.9], [120, 100]])(
    'maps %s to %s',
    (value, expected) => expect(clampPercent(value)).toBe(expected),
  )
})

describe('weeklyActivityProgress', () => {
  it('returns a bounded percentage with a positive target', () => {
    expect(weeklyActivityProgress(3, 5)).toBe(60)
    expect(weeklyActivityProgress(8, 5)).toBe(100)
  })

  it('returns null rather than inventing a target', () => {
    expect(weeklyActivityProgress(3)).toBeNull()
    expect(weeklyActivityProgress(3, 0)).toBeNull()
  })
})
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- lib/mobile-dashboard.test.ts`

Expected: FAIL because `lib/mobile-dashboard.ts` does not exist.

- [ ] **Step 3: Implement pure helpers**

```ts
export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

export function weeklyActivityProgress(
  completed: number,
  target?: number | null,
): number | null {
  if (!target || target <= 0) return null
  return clampPercent((completed / target) * 100)
}
```

- [ ] **Step 4: Verify the helper tests pass**

Run: `npm test -- lib/mobile-dashboard.test.ts`

Expected: PASS.

- [ ] **Step 5: Implement `MobilePageIntro`**

```tsx
import type { ReactNode } from 'react'

export default function MobilePageIntro({
  title,
  eyebrow,
  aside,
}: {
  title: string
  eyebrow: string
  aside?: ReactNode
}) {
  return (
    <header className="mobile-page-intro md:hidden">
      <div className="min-w-0">
        <h1 className="display text-[clamp(2.25rem,11vw,3.35rem)] font-bold leading-[0.95] text-[var(--text)]">
          {title}
        </h1>
        <p className="data mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-faint)]">
          {eyebrow}
        </p>
      </div>
      {aside}
    </header>
  )
}
```

- [ ] **Step 6: Implement `MobilePanel` and `MetricTile`**

```tsx
// MobilePanel.tsx
import type { HTMLAttributes } from 'react'

export type MobileChannel = 'lime' | 'cyan' | 'violet' | 'coral' | 'amber' | 'neutral'

export default function MobilePanel({
  channel = 'neutral',
  className = '',
  ...props
}: HTMLAttributes<HTMLElement> & { channel?: MobileChannel }) {
  return <section data-channel={channel} className={`mobile-panel ${className}`} {...props} />
}
```

```tsx
// MetricTile.tsx
import MobilePanel, { type MobileChannel } from './MobilePanel'

export default function MetricTile({
  label,
  value,
  context,
  channel,
}: {
  label: string
  value: string
  context?: string
  channel: Exclude<MobileChannel, 'neutral'>
}) {
  return (
    <MobilePanel channel={channel} className="metric-tile p-4 md:hidden">
      <p className="data text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">{label}</p>
      <p className="data mt-3 text-[2.15rem] font-bold leading-none text-[var(--channel)]">{value}</p>
      {context ? <p className="data mt-3 text-[10px] text-[var(--text-faint)]">{context}</p> : null}
    </MobilePanel>
  )
}
```

- [ ] **Step 7: Implement accessible `ProgressRing`**

```tsx
import { clampPercent } from '@/lib/mobile-dashboard'
import type { MobileChannel } from './MobilePanel'

export default function ProgressRing({
  label,
  value,
  displayValue,
  channel,
}: {
  label: string
  value: number | null
  displayValue?: string
  channel: Exclude<MobileChannel, 'neutral' | 'coral'>
}) {
  const bounded = value === null ? 0 : clampPercent(value)
  const aria = value === null ? `${label}: unavailable` : `${label}: ${Math.round(bounded)} percent`

  return (
    <figure className="progress-ring-wrap" role="img" aria-label={aria} data-channel={channel}>
      <div className="progress-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="progress-ring-track" cx="60" cy="60" r="52" pathLength="100" />
          <circle className="progress-ring-value" cx="60" cy="60" r="52" pathLength="100" strokeDasharray={`${bounded} 100`} />
        </svg>
        <span className="data progress-ring-number">
          {value === null ? '—' : (displayValue ?? `${Math.round(bounded)}%`)}
        </span>
      </div>
      <figcaption className="data text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
        {label}
      </figcaption>
    </figure>
  )
}
```

- [ ] **Step 8: Add non-blurred mobile material CSS**

Add after `.data` in `app/globals.css`:

```css
.mobile-panel {
  --channel: var(--accent);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  background:
    radial-gradient(circle at 86% 12%, color-mix(in srgb, var(--channel) 12%, transparent), transparent 42%),
    var(--panel-bg);
  box-shadow: var(--panel-shadow), inset 0 1px 0 var(--ink-02);
}
[data-channel='lime'] { --channel: var(--accent); }
[data-channel='cyan'] { --channel: var(--cyan); }
[data-channel='violet'] { --channel: var(--violet); }
[data-channel='coral'] { --channel: var(--coral); }
[data-channel='amber'] { --channel: var(--amber); }
[data-channel='neutral'] { --channel: var(--text-faint); }
.progress-ring-wrap { display: grid; justify-items: center; gap: .9rem; }
.progress-ring { position: relative; width: min(36vw, 148px); aspect-ratio: 1; }
.progress-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
.progress-ring circle { fill: none; stroke-width: 8; }
.progress-ring-track { stroke: var(--ring-track); }
.progress-ring-value { stroke: var(--channel); stroke-linecap: round; filter: drop-shadow(0 0 9px color-mix(in srgb, var(--channel) 52%, transparent)); }
.progress-ring-number { position: absolute; inset: 0; display: grid; place-items: center; color: var(--text); font-size: clamp(1.8rem, 8vw, 2.75rem); font-weight: 750; }
.metric-tile { min-height: 144px; border-radius: 1.6rem; }

@media (min-width: 768px) {
  .mobile-panel,
  .progress-ring-wrap,
  .mobile-page-intro { display: none; }
}
```

Do not add `backdrop-filter` to these repeated surfaces.

- [ ] **Step 9: Verify and commit primitives**

Run: `npm test -- lib/mobile-dashboard.test.ts && npx tsc --noEmit`

Expected: PASS.

```bash
git add lib/mobile-dashboard.ts lib/mobile-dashboard.test.ts components/mobile app/globals.css
git commit -m "feat: add LifeOS mobile visual primitives"
```

---

### Task 2: Persistent mobile chrome and liquid active bubble

**Files:**
- Modify: `components/MobileHeader.tsx`
- Modify: `components/BottomNav.tsx`
- Modify: `app/globals.css`
- Test: `lib/navigation.test.ts`

**Interfaces:**
- Consumes: existing navigation items and pure route/drag helpers.
- Produces: compact header and protruding active dock bubble without routing changes.

- [ ] **Step 1: Extend route characterization tests**

Add these cases to the existing `it.each` table:

```ts
['/dashboard/activity', 0],
['/plan', 3],
```

- [ ] **Step 2: Run the focused suite**

Run: `npm test -- lib/navigation.test.ts`

Expected: PASS, locking URL-driven state before presentation edits.

- [ ] **Step 3: Recompose `MobileHeader`**

Keep `LocaleSwitcher`, `ThemeToggle`, current route lookup, and safe-area wrapper. Use this inner structure:

```tsx
<div className="flex h-16 items-center gap-2 px-3">
  <div className="mobile-brand-mark" aria-hidden="true">M</div>
  <span className="display text-lg font-bold text-[var(--text)]">
    mov<span className="text-accent">u</span>
  </span>
  <span className="ml-auto flex items-center gap-1.5">
    <LocaleSwitcher compact />
    <ThemeToggle />
    <span className="glass flex min-h-10 items-center rounded-full border border-[var(--border)] px-2.5">
      <span className="pulse-dot mr-2 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
      <span className="display max-w-[64px] truncate text-[10px] font-semibold text-[var(--text-dim)]">
        {t(activeItem.key)}
      </span>
    </span>
  </span>
</div>
```

- [ ] **Step 4: Replace the flat dock pill presentation**

Preserve refs, native non-passive `touchmove`, window pointer listeners, click suppression, localized links, and `aria-current`. Add `mobile-dock` to the container, use `min-h-[58px]` links, and replace the moving layer with:

```tsx
<div
  aria-hidden="true"
  className="mobile-dock-pill absolute"
  style={{
    left: 6,
    width: `calc((100% - 12px) / ${MOVU_NAV_ITEMS.length})`,
    transform: `translateX(${pillPosition * 100}%)`,
    transition: dragging ? 'none' : 'transform 0.45s cubic-bezier(0.3, 1.35, 0.4, 1)',
    willChange: 'transform',
  }}
>
  <div className={`mobile-dock-bubble ${dragging ? 'is-dragging' : ''}`} />
</div>
```

- [ ] **Step 5: Add active bubble CSS**

```css
.mobile-brand-mark {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-radius: .8rem;
  color: #10210b;
  font-family: var(--font-geist-mono, monospace);
  font-weight: 800;
  background: linear-gradient(145deg, #d9ffc9, var(--accent));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.72), 0 0 22px rgba(107,224,64,.24);
}
.mobile-dock { min-height: 68px; overflow: visible; }
.mobile-dock-pill { top: -9px; bottom: -9px; }
.mobile-dock-bubble {
  width: 100%;
  height: 100%;
  border: 1px solid color-mix(in srgb, var(--accent) 52%, white 12%);
  border-radius: 27px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.32), rgba(255,255,255,.04) 46%),
    linear-gradient(180deg, rgba(107,224,64,.32), rgba(107,224,64,.13));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.48), 0 9px 24px rgba(15,23,42,.18), 0 0 30px rgba(107,224,64,.28);
  transform: scaleX(1.08);
  transition: transform .2s cubic-bezier(.3,1.35,.4,1), box-shadow .2s ease;
}
.mobile-dock-bubble.is-dragging {
  transform: scale(1.1);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.58), 0 12px 28px rgba(15,23,42,.24), 0 0 38px rgba(107,224,64,.42);
}
```

- [ ] **Step 6: Verify mechanics and commit**

Run: `npm test -- lib/navigation.test.ts && npx tsc --noEmit`

At `390x844`, drag Dashboard to Profile and use Back. Expected: localized route changes and bubble returns to Dashboard.

```bash
git add components/MobileHeader.tsx components/BottomNav.tsx app/globals.css lib/navigation.test.ts
git commit -m "feat: deepen LifeOS mobile chrome"
```

---

### Task 3: Recompose Dashboard around the LifeOS hierarchy

**Files:**
- Modify: `app/[locale]/dashboard/page.tsx`
- Modify: all three locale message files only when a new label is necessary
- Test: `lib/mobile-dashboard.test.ts`

**Interfaces:**
- Consumes: all Task 1 primitives.
- Produces: moment header, AI hero, honest rings, metric tiles, and luminous activity panels; desktop and queries remain intact.

- [ ] **Step 1: Characterize the existing five-workout target**

Add:

```ts
it('represents the existing Dashboard five-workout goal', () => {
  expect(weeklyActivityProgress(4, 5)).toBe(80)
})
```

Run: `npm test -- lib/mobile-dashboard.test.ts`

Expected: PASS.

- [ ] **Step 2: Derive ring values without changing queries**

```ts
const recoveryPercent = todaySleep?.performance_pct == null
  ? null
  : clampPercent(todaySleep.performance_pct)
const trainingProgress = weeklyActivityProgress(acts.length, 5)
```

- [ ] **Step 3: Render the mobile moment header**

```tsx
<MobilePageIntro
  title={t('greeting', { name: displayName })}
  eyebrow={t('weekLabel')}
  aside={
    <div className="glass grid h-11 w-11 flex-none place-items-center rounded-full border border-[var(--border-hi)] text-xs font-bold text-[var(--text-dim)]">
      {getInitials(displayName)}
    </div>
  }
/>
```

Keep the current desktop title separately under `hidden md:block`.

- [ ] **Step 4: Turn insight into the single mobile hero**

Render one rounded `MobilePanel channel="lime"` with `.ticks`, mono `aiLabel`, existing title/empty copy, and actual `cachedInsight.content` as a 1.55rem display headline. When absent, retain the current Generate link. Do not invent confidence, evidence, or actions. Keep desktop insight markup separate.

- [ ] **Step 5: Add the two-ring row**

```tsx
<section className="mb-6 grid grid-cols-2 gap-4 md:hidden" aria-label={t('weeklyProgress')}>
  <ProgressRing label={t('metrics.sleep')} value={recoveryPercent} channel="lime" />
  <ProgressRing label={t('weeklyProgress')} value={trainingProgress} displayValue={`${acts.length}/5`} channel="amber" />
</section>
```

- [ ] **Step 6: Replace mobile metrics with channel tiles**

Use a `md:hidden grid grid-cols-2 gap-3`: Sleep/cyan, Steps/lime, Calories/coral, and Time/violet. Use existing values and translations. Keep current cards under `hidden md:grid`.

- [ ] **Step 7: Align week and activity sections**

Move the mobile week strip below rings. Use mono symbols or channel dots instead of emoji as the primary mobile marker. Wrap week and recent activity groups in rounded `MobilePanel`s. Preserve content, empty states, links, and desktop emoji.

- [ ] **Step 8: Verify and commit Dashboard**

Run: `npm test -- lib/mobile-dashboard.test.ts && npx tsc --noEmit`

At `390x844`, expected initial order is greeting, AI hero, rings. Confirm no overflow and Register CTA above dock.

```bash
git add 'app/[locale]/dashboard/page.tsx' messages lib/mobile-dashboard.test.ts
git commit -m "feat: recompose mobile dashboard like LifeOS"
```

---

### Task 4: Carry the grammar through Plan and Register

**Files:**
- Modify: `app/[locale]/plan/page.tsx`
- Modify: `app/[locale]/registro/page.tsx`
- Modify: `messages/en.json`
- Modify: `messages/es.json`
- Modify: `messages/de.json`

**Interfaces:**
- Consumes: `MobilePageIntro` and `MobilePanel`.
- Produces: mobile day modules and grouped logging sheets with unchanged desktop rendering and mutations.

- [ ] **Step 1: Add the missing Register subtitle in every locale**

Add `registro.subtitle` with these exact values:

```json
// messages/en.json
"subtitle": "Log today's training"

// messages/es.json
"subtitle": "Registra el entrenamiento de hoy"

// messages/de.json
"subtitle": "Heutiges Training erfassen"
```

- [ ] **Step 2: Add mobile moment headers**

Use existing route title and subtitle/context translations:

```tsx
<MobilePageIntro title={t('title')} eyebrow={t('subtitle')} />
```

Use Plan's existing `subtitle` and Register's new translated `subtitle`. Keep desktop headings separate.

- [ ] **Step 3: Convert mobile Plan days to semantic modules**

Preserve `t.raw`, rest logic, groups, and volume. Use a `MobilePanel` per day: lime for current emphasis, violet for strength, cyan for endurance, neutral for rest. Use mono uppercase day labels and a display workout title. Keep desktop table/grid unchanged.

- [ ] **Step 4: Keep Plan logic as the only blurred hero**

Retain `.glass.ticks` for the explanation. Use non-blurred `MobilePanel` for every repeated day row.

- [ ] **Step 5: Convert Register groups to mobile sheets**

Wrap current mobile form groups in rounded `MobilePanel`s. Preserve every input name/value, setter, conditional distance/period field, validation message, payload, and handler.

- [ ] **Step 6: Verify iOS form ergonomics**

Confirm mobile inputs compute to `16px`, targets are at least `44px`, and fixed actions use:

```tsx
style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
```

- [ ] **Step 7: Verify and commit**

Run: `npx tsc --noEmit && npm test`

At `390x844`, exercise workout type, subtype, duration, and conditional inputs. Expected: current validation/state behavior remains.

```bash
git add 'app/[locale]/plan/page.tsx' 'app/[locale]/registro/page.tsx' messages/en.json messages/es.json messages/de.json
git commit -m "feat: align mobile plan and register with LifeOS"
```

---

### Task 5: Carry the grammar through Trends and Profile

**Files:**
- Modify: `app/[locale]/trends/page.tsx`
- Modify: `app/[locale]/perfil/page.tsx`

**Interfaces:**
- Consumes: mobile primitives, current chart data, form handlers, `Capacitor.isNativePlatform()`, and HealthKit state.
- Produces: mobile chart/data panels and one conditional native integration hero without behavior changes.

- [ ] **Step 1: Add mobile moment headers**

Use existing title/context translations for Trends and Profile. Keep desktop headings unchanged.

- [ ] **Step 2: Restyle Trends range selection**

Keep current query/link/state mechanics. On mobile, use one glass rounded segmented container with 44-pixel segments and a luminous active state.

- [ ] **Step 3: Convert chart cards to non-blurred panels**

Wrap existing chart SVGs/summaries in `MobilePanel`: sleep/recovery cyan or lime, load/strength violet, warnings coral, time/goal progression amber. Do not alter calculations, paths, queries, or empty-state conditions.

- [ ] **Step 4: Make Apple Health the native Profile hero**

Preserve the exact platform condition, handlers, loading states, and web XML fallback. Within the existing native-only condition, use the route's only `.glass.ticks` hero.

- [ ] **Step 5: Convert Profile sections to data panels**

Use mono values and semantic accents. Preserve all fields, history, conditional rendering, payloads, disabled states, and submit behavior.

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit && npm test`

Browser expectation: native controls absent and XML import present. Capacitor expectation after integration: native card present with unchanged handler conditions.

```bash
git add 'app/[locale]/trends/page.tsx' 'app/[locale]/perfil/page.tsx'
git commit -m "feat: align mobile trends and profile with LifeOS"
```

---

### Task 6: Full mobile interaction and visual verification

**Files:**
- Modify observed presentation defects only in files from Tasks 1–5.
- Modify: `docs/superpowers/plans/2026-07-17-faithful-lifeos-mobile.md`

**Interfaces:**
- Consumes: complete mobile implementation.
- Produces: automated and visual evidence across all routes and iOS constraints.

- [ ] **Step 1: Run full automation**

```bash
npm test
npx tsc --noEmit
set -a; source /Users/alonso/vscode/movu/.env.local; set +a; npm run build
```

Expected: all tests pass, TypeScript exits zero, and every route builds.

- [ ] **Step 2: Audit implementation boundaries**

```bash
git diff --check
git diff --stat 3082d11...HEAD
git diff 3082d11...HEAD -- lib/supabase app/api lib/apple-health
rg -n 'backdrop-filter|glass-thick' app components
```

Expected: no whitespace errors, no Supabase/API/Apple Health logic diff, and true glass limited to allowed surfaces.

- [ ] **Step 3: Verify every route at iPhone sizes**

Inspect `/en/dashboard`, `/en/plan`, `/en/registro`, `/en/trends`, and `/en/perfil` at `390x844`, `375x812`, and `430x932`. Confirm persistent dock, correct bubble, reachable final content, no overflow, and no runtime overlay.

- [ ] **Step 4: Exercise navigation**

Test direct load, tap, multi-item drag, short drag, pointer cancellation, Back, Forward, locale replacement, and refresh. Expected: bubble resolves to pathname and gesture scroll lock releases.

- [ ] **Step 5: Exercise themes and accessibility**

Capture Dashboard, Plan, and Profile at `390x844` in light and dark. Emulate reduced motion, reduced transparency, and no backdrop filter. Navigate dock/forms by keyboard; verify focus and opaque fallbacks.

- [ ] **Step 6: Verify iOS boundary**

Open the URL in iPhone Simulator Safari and verify safe areas, fixed chrome, scroll-behind, and input focus without zoom. After merging with HealthKit work, repeat in Capacitor and verify native controls and foreground return.

- [ ] **Step 7: Fix observed defects and commit**

For each defect, record route and viewport, make the smallest presentation correction, then repeat the exposing check. Run:

```bash
npm test && npx tsc --noEmit
git diff --check
git status --short
```

Expected: PASS and only intended files modified.

```bash
git add app components lib docs/superpowers/plans/2026-07-17-faithful-lifeos-mobile.md messages
git commit -m "fix: polish faithful LifeOS mobile experience"
```
