# Plan Registration Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Registro in Movu's primary navigation with a contextual registration action inside Plan while preserving the standalone localized form route.

**Architecture:** `MOVU_NAV_ITEMS` remains the single source of truth for both navigation surfaces and is reduced to five ordered destinations. The server-rendered Plan page owns localized links to the existing registration route, while the registration form and APIs remain untouched.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript, next-intl, Tailwind CSS, Vitest

## Global Constraints

- Primary navigation order is exactly Dashboard, Plan, Nutrición, Tendencias, Perfil.
- Keep `/[locale]/registro` independent and directly addressable.
- Remove the standalone registration CTA from the desktop sidebar.
- Keep existing Dashboard registration actions.
- Do not change registration fields, APIs, persistence, or the Plan editor.
- Add the Plan registration action in Spanish, English, and German.

---

## File map

- `lib/navigation.ts`: canonical five-destination order and active-route matching.
- `lib/navigation.test.ts`: order, active-index, fallback, and five-segment dock geometry contracts.
- `components/BottomNav.tsx`: mobile dock rendering without Registro-only icon styling.
- `components/Sidebar.tsx`: desktop primary destinations and footer controls without a global registration CTA.
- `messages/es.json`: Spanish Plan nav label and registration action.
- `messages/en.json`: English Plan nav label and registration action.
- `messages/de.json`: German Plan nav label and registration action.
- `lib/navigation-copy.test.ts`: locale contract for Plan labels and registration CTA copy.
- `app/[locale]/plan/page.tsx`: responsive registration entry point available in all Plan states.

### Task 1: Establish the five-destination navigation contract

**Files:**
- Modify: `lib/navigation.test.ts:22-77`
- Modify: `lib/navigation.ts:1-8`
- Modify: `components/BottomNav.tsx:124-150`
- Modify: `components/Sidebar.tsx:49-60`

**Interfaces:**
- Consumes: `MOVU_NAV_ITEMS`, `getActiveNavigationIndex(pathname: string): number`, `positionFromPointer(clientX: number, left: number, width: number, count: number): number`, and `nearestNavigationIndex(position: number, count: number): number`.
- Produces: `MOVU_NAV_ITEMS` with keys `dashboard | plan | nutricion | trends | perfil` in that order for both navigation components.

- [ ] **Step 1: Rewrite the navigation tests for five destinations**

Replace the `getActiveNavigationIndex`, `positionFromPointer`, and `nearestNavigationIndex` expectations with:

```ts
describe('getActiveNavigationIndex', () => {
  it('exposes the five primary destinations in product order', () => {
    expect(MOVU_NAV_ITEMS.map((item) => item.key)).toEqual([
      'dashboard',
      'plan',
      'nutricion',
      'trends',
      'perfil',
    ])
  })

  it.each([
    ['/dashboard', 0],
    ['/dashboard/activity', 0],
    ['/plan', 1],
    ['/plan/week', 1],
    ['/nutricion', 2],
    ['/nutricion/catalogo', 2],
    ['/trends', 3],
    ['/perfil', 4],
  ])('maps %s to %i', (pathname, expected) => {
    expect(getActiveNavigationIndex(pathname)).toBe(expected)
  })

  it.each(['/registro', '/unknown'])('falls back to Dashboard for non-primary route %s', (pathname) => {
    expect(getActiveNavigationIndex(pathname)).toBe(0)
  })
})

describe('positionFromPointer', () => {
  it('clamps continuous drag positions to the five-item dock', () => {
    expect(positionFromPointer(0, 0, 500, 5)).toBe(0)
    expect(positionFromPointer(250, 0, 500, 5)).toBeCloseTo(2)
    expect(positionFromPointer(600, 0, 500, 5)).toBe(4)
  })

  it('places each segment center on its integer index', () => {
    const width = 500
    const inner = width - 12
    const segment = inner / 5

    for (let index = 0; index < 5; index += 1) {
      const clientX = 6 + segment * (index + 0.5)
      expect(positionFromPointer(clientX, 0, width, 5)).toBeCloseTo(index)
    }
  })
})

describe('nearestNavigationIndex', () => {
  it('rounds a continuous position and clamps it to five routes', () => {
    expect(nearestNavigationIndex(-2, 5)).toBe(0)
    expect(nearestNavigationIndex(2.6, 5)).toBe(3)
    expect(nearestNavigationIndex(20, 5)).toBe(4)
  })
})
```

- [ ] **Step 2: Run the focused test and verify the old navigation fails**

Run: `npm test -- lib/navigation.test.ts`

Expected: FAIL because the implementation still returns six items, old active indexes, and a six-segment upper clamp.

- [ ] **Step 3: Implement the canonical five-item order**

Replace `MOVU_NAV_ITEMS` in `lib/navigation.ts` with:

```ts
export const MOVU_NAV_ITEMS = [
  { key: 'dashboard', href: '/dashboard', icon: '⊞' },
  { key: 'plan', href: '/plan', icon: '☰' },
  { key: 'nutricion', href: '/nutricion', icon: '◇' },
  { key: 'trends', href: '/trends', icon: '⌁' },
  { key: 'perfil', href: '/perfil', icon: '◉' },
] as const
```

Do not modify the geometry helpers; they already derive their bounds from the supplied item count.

- [ ] **Step 4: Remove Registro-only presentation from the navigation components**

In `components/BottomNav.tsx`, delete:

```ts
const primary = item.key === "registro";
```

Replace the icon span with the uniform five-item treatment:

```tsx
<span
  aria-hidden="true"
  className={`data text-[16px] leading-none transition-all duration-300 ${
    active ? "-translate-y-px scale-110 text-accent" : "text-[var(--text-faint)]"
  }`}
>
  {item.icon}
</span>
```

In `components/Sidebar.tsx`, replace the footer with only the retained settings controls:

```tsx
<div className="flex items-center justify-between gap-2 border-t border-[var(--ink-06)] px-3 py-4">
  <LocaleSwitcher />
  <ThemeToggle />
</div>
```

- [ ] **Step 5: Run the navigation tests and lint the touched components**

Run: `npm test -- lib/navigation.test.ts`

Expected: PASS with no navigation or geometry failures.

Run: `npx eslint lib/navigation.ts lib/navigation.test.ts components/BottomNav.tsx components/Sidebar.tsx`

Expected: exit code 0 with no errors.

- [ ] **Step 6: Commit the navigation contract**

```bash
git add lib/navigation.ts lib/navigation.test.ts components/BottomNav.tsx components/Sidebar.tsx
git commit -m "feat: simplify primary navigation"
```

### Task 2: Add the contextual registration action to Plan

**Files:**
- Create: `lib/navigation-copy.test.ts`
- Modify: `messages/es.json:7-24,218-265`
- Modify: `messages/en.json:7-24,218-265`
- Modify: `messages/de.json:8-25,219-266`
- Modify: `app/[locale]/plan/page.tsx:31-58`

**Interfaces:**
- Consumes: next-intl namespace `plan`, the current locale string, and the existing `/${locale}/registro` route.
- Produces: translation key `plan.registerWorkout: string` in all three catalogs and responsive links to the localized route.

- [ ] **Step 1: Add a failing locale contract test**

Create `lib/navigation-copy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import de from '@/messages/de.json'
import en from '@/messages/en.json'
import es from '@/messages/es.json'

describe('navigation copy', () => {
  it.each([
    ['es', es, 'Registrar entrenamiento'],
    ['en', en, 'Log workout'],
    ['de', de, 'Training erfassen'],
  ] as const)('uses Plan as a destination and exposes the registration action in %s', (_, messages, action) => {
    expect(messages.sidebar.nav.plan).toBe('Plan')
    expect(messages.bottomNav.plan).toBe('Plan')
    expect(messages.plan.registerWorkout).toBe(action)
  })
})
```

- [ ] **Step 2: Run the locale contract and verify it fails**

Run: `npm test -- lib/navigation-copy.test.ts`

Expected: FAIL because the navigation label is currently `Mi Plan`/`My Plan` and `plan.registerWorkout` does not exist.

- [ ] **Step 3: Add exact localized copy**

Update both `sidebar.nav.plan` and `bottomNav.plan` to `Plan` in `messages/es.json`, `messages/en.json`, and `messages/de.json`.

Add the following property immediately after `editPlan` in each catalog's `plan` object:

```json
// messages/es.json
"registerWorkout": "Registrar entrenamiento"

// messages/en.json
"registerWorkout": "Log workout"

// messages/de.json
"registerWorkout": "Training erfassen"
```

The comments above identify files only; do not insert comments into JSON.

- [ ] **Step 4: Add mobile and desktop Plan actions**

In the reusable `header` fragment in `app/[locale]/plan/page.tsx`, add this mobile-only link immediately after `MobilePageIntro`:

```tsx
<Link
  href={`/${locale}/registro`}
  className="btn-accent mb-5 flex min-h-11 items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold md:hidden"
>
  {t('registerWorkout')}
</Link>
```

Replace the desktop edit link at the right side of the header with this action group:

```tsx
<div className="flex items-center gap-2">
  <Link
    href={`/${locale}/registro`}
    className="btn-accent rounded-xl px-4 py-2.5 text-sm font-bold"
  >
    {t('registerWorkout')}
  </Link>
  <Link
    href={`/${locale}/plan/edit`}
    className="glass rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-semibold text-[var(--text-dim)] transition-colors hover:border-accent hover:text-[var(--text)]"
  >
    {t('editPlan')}
  </Link>
</div>
```

Because every Plan branch renders `{header}`, do not duplicate these links in the active, empty, not-started, or expired branches.

- [ ] **Step 5: Run the copy contract and static checks**

Run: `npm test -- lib/navigation-copy.test.ts lib/navigation.test.ts`

Expected: PASS for both test files.

Run: `npx eslint 'app/[locale]/plan/page.tsx' lib/navigation-copy.test.ts`

Expected: exit code 0 with no errors.

Run: `node -e "for (const file of ['messages/es.json','messages/en.json','messages/de.json']) JSON.parse(require('fs').readFileSync(file, 'utf8'))"`

Expected: exit code 0 and no output.

- [ ] **Step 6: Commit the Plan entry point**

```bash
git add 'app/[locale]/plan/page.tsx' messages/es.json messages/en.json messages/de.json lib/navigation-copy.test.ts
git commit -m "feat: add workout registration to plan"
```

### Task 3: Verify the complete responsive flow

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: the five-destination navigation and the Plan registration action from Tasks 1 and 2.
- Produces: evidence that tests, lint, build, and responsive behavior satisfy the design specification.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all Vitest files pass.

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors.

Run: `npm run build`

Expected: Next.js production build completes and lists the localized Plan and Registro routes without type or translation errors.

- [ ] **Step 2: Start the app for responsive verification**

Run: `npm run dev`

Expected: Next.js reports a local development URL and serves the application.

- [ ] **Step 3: Verify desktop behavior**

At a viewport at least 1024 px wide, confirm:

- Sidebar order is Dashboard, Plan, Nutrición, Tendencias, Perfil.
- No standalone Registro item or sidebar registration CTA appears.
- Plan shows `Registrar entrenamiento`/localized equivalent as the accent action and `Editar plan` as secondary.
- Activating the registration action opens the current locale's `/registro` page.

- [ ] **Step 4: Verify mobile behavior**

At a viewport around 390 × 844, confirm:

- The bottom dock has five evenly sized items in the required order.
- Dragging/tapping the dock reaches the correct destination.
- Plan retains its edit icon and shows the full-width registration action below the mobile intro.
- The registration action opens the localized standalone form and remains above, not underneath, the bottom dock.

- [ ] **Step 5: Confirm only intended files changed**

Run: `git status --short`

Expected: only pre-existing unrelated user changes remain; no build artifacts or uncommitted feature files are present.

---

## Completion criteria

- The shared navigation contains exactly five destinations in the approved order.
- Registro remains available at its localized standalone route but is absent from both primary navigation surfaces and the desktop sidebar footer.
- Plan exposes the registration action in every plan state on desktop and mobile.
- Spanish, English, and German navigation copy is covered by tests.
- Focused and full tests, ESLint, production build, and responsive verification pass.
