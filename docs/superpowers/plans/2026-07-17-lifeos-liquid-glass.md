# LifeOS Liquid Glass Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring LifeOS's Aurora and Liquid Glass design system to Movu, including iOS-safe mobile glass chrome and a draggable route dock, without changing application data behavior.

**Architecture:** A semantic CSS-token layer provides shared light/dark materials and cheap content panels. Focused shell components own theme state, mobile header context, desktop chrome, and route navigation; pure helper functions hold route and drag math so the highest-risk behavior has deterministic tests. Screen work is limited to semantic presentation migration, leaving Supabase, API, HealthKit, and localization contracts intact.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript, Tailwind CSS 3, next-intl, Vitest, Capacitor/WKWebView-compatible CSS.

## Global Constraints

- Work only in `/Users/alonso/vscode/movu/.worktrees/lifeos-liquid-glass` on `codex/lifeos-liquid-glass`, based on `main`.
- Keep Movu lime as the primary accent; cyan and violet are atmospheric or metric-channel colors.
- Use `next/font/local` with the existing Geist and Geist Mono files; do not add a font dependency or external font request.
- Use true backdrop blur only for persistent chrome, overlays, and at most one hero surface per screen.
- Preserve route structure, next-intl navigation, screen data fetching/mutations, and HealthKit/Capacitor contracts.
- Full-page swipe navigation is excluded; tapping and dragging the bottom dock are both supported.
- Every motion effect must respect `prefers-reduced-motion`; glass must support `prefers-reduced-transparency` and no-`backdrop-filter` fallbacks.
- Mobile chrome must honor `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` and keep touch targets at least 44 CSS pixels.
- Existing `main` has no test files, so `npm test` exits 1 with “No test files found.” New focused tests introduced here must pass.
- A production build without environment variables compiles and type-checks, then fails while collecting `/api/waitlist` because `supabaseUrl is required`; verification must use configured environment values or report this exact baseline limitation.

---

### Task 1: Theme model, local fonts, and Aurora material foundation

**Files:**
- Create: `app/fonts.ts`
- Create: `lib/theme.ts`
- Create: `lib/theme.test.ts`
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `app/[locale]/layout.tsx`
- Modify: `app/(auth)/layout.tsx`

**Interfaces:**
- Produces: `MOVU_THEME_STORAGE_KEY`, `getThemeInitScript()`, Geist CSS variables, `.panel`, `.glass`, `.glass-thick`, `.ticks`, `.display`, `.data`, `.btn-accent`, and reduced-accessibility fallbacks.
- Consumes: existing `app/fonts/GeistVF.woff` and `app/fonts/GeistMonoVF.woff`.

- [x] **Step 1: Write the failing theme-script tests**

```ts
import { describe, expect, it } from 'vitest'
import { MOVU_THEME_STORAGE_KEY, getThemeInitScript } from './theme'

describe('getThemeInitScript', () => {
  it('uses the Movu storage key and system preference fallback', () => {
    const script = getThemeInitScript()
    expect(MOVU_THEME_STORAGE_KEY).toBe('movu-theme')
    expect(script).toContain("localStorage.getItem('movu-theme')")
    expect(script).toContain("prefers-color-scheme: light")
  })

  it('sets a light class before paint without throwing when storage is unavailable', () => {
    const script = getThemeInitScript()
    expect(script).toContain("classList.toggle('light'")
    expect(script).toContain('try{')
    expect(script).toContain('catch')
  })
})
```

- [x] **Step 2: Run the test and verify the missing module failure**

Run: `npm test -- lib/theme.test.ts`

Expected: FAIL because `lib/theme.ts` does not exist.

- [x] **Step 3: Implement the pure theme script helper**

```ts
export const MOVU_THEME_STORAGE_KEY = 'movu-theme'

export function getThemeInitScript(): string {
  return `(function(){try{var t=localStorage.getItem('${MOVU_THEME_STORAGE_KEY}');var l=t==='light'||(t!=='dark'&&window.matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.classList.toggle('light',l)}catch(e){}})()`
}
```

- [x] **Step 4: Add local font exports**

```ts
import localFont from 'next/font/local'

export const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  display: 'swap',
})

export const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  display: 'swap',
})
```

- [x] **Step 5: Replace global primitives with the Aurora token system**

Define dark values on `:root` and light overrides on `html.light` for `--bg`, `--surface`, `--surface-2`, `--border`, `--border-hi`, `--text`, `--text-dim`, `--text-faint`, `--ink-02`, `--ink-04`, `--ink-06`, `--ink-08`, `--material-regular`, `--material-thick`, `--glass-edge`, `--panel-bg`, `--panel-shadow`, `--shadow-pop`, `--aurora-1`, `--aurora-2`, and `--aurora-3`. Use Movu lime `#6be040` for `--accent`, darker lime `#55c030` for `--accent-strong`, cyan `#38bdf8`, violet `#a78bfa`, coral `#fb7185`, and amber `#fbbf24`.

```css
.panel {
  background: var(--panel-bg);
  border: 1px solid var(--border);
  box-shadow: var(--panel-shadow);
}

.glass {
  background: var(--material-regular);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow: var(--glass-edge);
}

.glass-thick {
  background: var(--material-thick);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  box-shadow: var(--glass-edge), var(--shadow-pop);
}
```

Add the fixed lime/cyan/violet radial background, subtle fixed grain, glossy accent button, gradient hero border, stagger/fade/glint/sheet/pulse animations, focus-visible styles, semantic form styling, and the exact fallback media blocks required by the global constraints.

- [x] **Step 6: Point Tailwind colors and fonts at semantic variables**

```ts
colors: {
  accent: 'var(--accent)',
  'accent-light': 'var(--accent-soft)',
  'accent-dark': 'var(--accent-strong)',
  surface: 'var(--surface)',
  border: 'var(--border)',
  muted: 'var(--text-dim)',
  sidebar: 'var(--material-regular)',
  background: 'var(--bg)',
  foreground: 'var(--text)',
},
fontFamily: {
  sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
  mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
},
```

- [x] **Step 7: Apply fonts and the pre-paint script in both root layouts**

Use `${geistSans.variable} ${geistMono.variable}` on each root `<html>`, `suppressHydrationWarning`, `<script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />`, and semantic body classes. In the localized layout, set `width`, `initialScale`, `maximumScale: 1`, and `viewportFit: 'cover'` in the viewport export.

- [x] **Step 8: Run focused tests and commit**

Run: `npm test -- lib/theme.test.ts && npm run build`

Expected: theme tests PASS; build compiles and type-checks. With no Supabase values, the known page-data collection failure is acceptable only if it remains `supabaseUrl is required` for `/api/waitlist`.

```bash
git add app/fonts.ts lib/theme.ts lib/theme.test.ts app/globals.css tailwind.config.ts 'app/[locale]/layout.tsx' 'app/(auth)/layout.tsx'
git commit -m "feat: add Movu Aurora material system"
```

---

### Task 2: Shared navigation model, theme toggle, and mobile glass header

**Files:**
- Create: `lib/navigation.ts`
- Create: `lib/navigation.test.ts`
- Create: `components/ThemeToggle.tsx`
- Create: `components/MobileHeader.tsx`
- Modify: `components/LocaleSwitcher.tsx`
- Modify: `app/[locale]/layout.tsx`

**Interfaces:**
- Produces: `MOVU_NAV_ITEMS`, `getActiveNavigationIndex(pathname)`, `positionFromPointer(clientX, left, width, count)`, `ThemeToggle`, and `MobileHeader`.
- Consumes: `MOVU_THEME_STORAGE_KEY`, next-intl `bottomNav` labels, and locale-aware `usePathname`/`useRouter`.

- [x] **Step 1: Write navigation helper tests**

```ts
import { describe, expect, it } from 'vitest'
import { getActiveNavigationIndex, positionFromPointer } from './navigation'

describe('getActiveNavigationIndex', () => {
  it.each([
    ['/dashboard', 0], ['/trends', 1], ['/registro', 2], ['/plan/week', 3], ['/perfil', 4],
  ])('maps %s to %i', (pathname, expected) => {
    expect(getActiveNavigationIndex(pathname)).toBe(expected)
  })
})

describe('positionFromPointer', () => {
  it('clamps continuous drag positions to the dock', () => {
    expect(positionFromPointer(0, 0, 500, 5)).toBe(0)
    expect(positionFromPointer(250, 0, 500, 5)).toBeCloseTo(2)
    expect(positionFromPointer(700, 0, 500, 5)).toBe(4)
  })
})
```

- [x] **Step 2: Run the helper test and verify failure**

Run: `npm test -- lib/navigation.test.ts`

Expected: FAIL because the exported helpers do not exist.

- [x] **Step 3: Implement the shared navigation model and drag math**

```ts
export const MOVU_NAV_ITEMS = [
  { key: 'dashboard', href: '/dashboard', icon: '⊞' },
  { key: 'trends', href: '/trends', icon: '⌁' },
  { key: 'registro', href: '/registro', icon: '+' },
  { key: 'plan', href: '/plan', icon: '☰' },
  { key: 'perfil', href: '/perfil', icon: '◉' },
] as const

export function getActiveNavigationIndex(pathname: string): number {
  const index = MOVU_NAV_ITEMS.findIndex(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
  return index < 0 ? 0 : index
}

export function positionFromPointer(clientX: number, left: number, width: number, count: number): number {
  const padding = 6
  const segment = (width - padding * 2) / count
  const position = (clientX - left - padding) / segment - 0.5
  return Math.min(count - 1, Math.max(0, position))
}
```

- [x] **Step 4: Implement an accessible saved-preference theme toggle**

The control reads the current `html.light` state after mount, toggles the class, stores `light` or `dark` under `movu-theme`, exposes `aria-label`, and uses a 40-pixel circular glass surface. It must not render a hydration-dependent text label.

- [x] **Step 5: Implement the safe-area-aware mobile header**

Render `md:hidden` fixed chrome with top padding `env(safe-area-inset-top)`, Movu wordmark, current translated route label from `getActiveNavigationIndex`, a compact `LocaleSwitcher`, and `ThemeToggle`. Give the header a `.glass-thick` background and `.glint-track` bottom hairline.

- [x] **Step 6: Mount mobile chrome and update content spacing**

Mount `MobileHeader` inside the localized provider. Change the authenticated `<main>` mobile padding to include the glass header and floating dock while retaining desktop behavior.

- [x] **Step 7: Tokenize LocaleSwitcher and run tests**

Replace literal gray/white classes with `var(--surface-2)`, `var(--text)`, `var(--text-dim)`, `var(--ink-04)`, and `var(--border)`. Preserve the existing locale filtering and `router.replace` behavior.

Run: `npm test -- lib/navigation.test.ts lib/theme.test.ts`

Expected: PASS.

- [x] **Step 8: Commit the shell header unit**

```bash
git add lib/navigation.ts lib/navigation.test.ts components/ThemeToggle.tsx components/MobileHeader.tsx components/LocaleSwitcher.tsx 'app/[locale]/layout.tsx'
git commit -m "feat: add glass mobile header and theme controls"
```

---

### Task 3: iOS-safe draggable floating route dock

**Files:**
- Modify: `components/BottomNav.tsx`
- Test: `lib/navigation.test.ts`

**Interfaces:**
- Consumes: `MOVU_NAV_ITEMS`, `getActiveNavigationIndex`, `positionFromPointer`, next-intl labels, and locale-aware router.
- Produces: tap-accessible and drag-accessible floating route dock with transient continuous pill position.

- [x] **Step 1: Extend drag-resolution coverage**

```ts
it('places each segment center on its integer index', () => {
  const width = 500
  const inner = width - 12
  const segment = inner / 5
  for (let index = 0; index < 5; index += 1) {
    const clientX = 6 + segment * (index + 0.5)
    expect(positionFromPointer(clientX, 0, width, 5)).toBeCloseTo(index)
  }
})
```

- [x] **Step 2: Replace the full-width bar with the LifeOS dock interaction**

Use a `barRef`, `dragPosition` state plus mirrored ref, native non-passive `touchmove` cancellation on the dock, and window-level `pointermove`, `pointerup`, and `pointercancel` listeners while dragging. Derive the resting pill from the pathname and navigate with `router.push(MOVU_NAV_ITEMS[Math.round(final)].href)` on release.

The outer nav must be pointer-transparent and safe-area-aware; the dock must be `.glass`, `max-w-md`, `rounded-[28px]`, and pointer-active. Use `touchAction: 'none'`, `WebkitUserSelect: 'none'`, `WebkitTouchCallout: 'none'`, and `WebkitTapHighlightColor: 'transparent'`.

- [x] **Step 3: Render the glossy spring pill and accessible links**

Use a lime specular gradient, inset highlight, shadow/glow, and `transform 0.45s cubic-bezier(0.3, 1.35, 0.4, 1)` when not dragging. Each destination remains a localized `<Link>`, has `aria-current="page"` when active, at least 52 pixels of height, visible focus, and pressed-scale feedback.

- [x] **Step 4: Keep Register visually primary without changing mechanics**

Give the center Register glyph a slightly stronger lime fill/glow, but keep all five segments equal and allow the shared pill to represent its active state.

- [x] **Step 5: Run tests and commit**

Run: `npm test -- lib/navigation.test.ts`

Expected: PASS.

```bash
git add components/BottomNav.tsx lib/navigation.test.ts
git commit -m "feat: add draggable iOS glass navigation dock"
```

---

### Task 4: Desktop glass chrome and shared semantic controls

**Files:**
- Modify: `components/Sidebar.tsx`
- Modify: `components/LocaleSwitcher.tsx`

**Interfaces:**
- Consumes: `MOVU_NAV_ITEMS`, semantic tokens, `LocaleSwitcher`, and `ThemeToggle`.
- Produces: desktop sidebar using the same route model and material system as mobile.

- [x] **Step 1: Rebuild Sidebar from the shared navigation model**

Use a `.glass-thick` sticky desktop aside, semantic border/text colors, a luminous lime active row, monochrome icons, and pressed/focus states. Keep the localized CTA and mount `ThemeToggle` beside `LocaleSwitcher` in the footer.

- [x] **Step 2: Verify route and locale behavior manually**

Run: `npm run dev`

Expected: all five sidebar links retain localized navigation; locale replacement keeps the current route; theme choice persists after refresh.

- [x] **Step 3: Commit the desktop chrome unit**

```bash
git add components/Sidebar.tsx components/LocaleSwitcher.tsx
git commit -m "feat: align desktop chrome with liquid glass"
```

---

### Task 5: Dashboard and Plan surface migration

**Files:**
- Modify: `app/[locale]/dashboard/page.tsx`
- Modify: `app/[locale]/plan/page.tsx`

**Interfaces:**
- Consumes: `.panel`, `.glass`, `.ticks`, `.btn-accent`, `.display`, `.data`, and semantic colors.
- Produces: themed Dashboard and Plan with unchanged server data and translations.

- [x] **Step 1: Convert Dashboard hierarchy**

Replace hardcoded neutral text/background/borders with semantic tokens. Make the AI insight the single `.glass ticks` hero, metric cards `.panel`, recent activities one `.panel` list, and progress/muscle sections `.panel`. Use mono data values and channel-colored metric accents. Keep all Supabase queries, grouping, and translation keys unchanged.

- [x] **Step 2: Convert Dashboard mobile action**

Render the fixed Register action as `.btn-accent` above the taller floating dock with bottom offset `calc(env(safe-area-inset-bottom) + 88px)`. Preserve the localized link target.

- [x] **Step 3: Convert Plan mobile and desktop surfaces**

Use `.panel` for day rows, table, volume, and goals; `.glass ticks` for plan logic; semantic rest rows/tracks; and literal amber/violet only for training-type channels. Replace hardcoded neutral classes without changing `t.raw` data or layout breakpoints.

- [x] **Step 4: Verify both routes in both themes and commit**

At 390×844 and 1440×900, confirm readable text, no horizontal overflow, a single true-blur hero per page, and the mobile CTA does not overlap the dock.

```bash
git add 'app/[locale]/dashboard/page.tsx' 'app/[locale]/plan/page.tsx'
git commit -m "feat: apply Aurora panels to dashboard and plan"
```

---

### Task 6: Trends chart and state migration

**Files:**
- Modify: `app/[locale]/trends/page.tsx`

**Interfaces:**
- Consumes: semantic surface/text/track tokens while retaining literal metric channel colors.
- Produces: theme-safe SVG charts, stats, empty/error states, and activity panels.

- [x] **Step 1: Tokenize SVG axes, tracks, and labels**

Replace `#e8e8e8`/`#eeeeee` chart tracks with `var(--border)` or `var(--ink-08)`. Keep `CATEGORY_COLORS` and meaningful series colors literal. Ensure SVG text and legend labels use semantic foreground variables.

- [x] **Step 2: Convert cards and states**

Use `.panel` for stat cards, chart cards, category/activity lists, and secondary summaries. Use `.glass ticks` for the primary insight/empty callout. Convert error presentation to coral-tinted semantic material while preserving its message and Profile link.

- [x] **Step 3: Verify sparse, empty, and populated rendering**

Confirm null series still render the empty state, category tracks remain visible in both themes, and no chart label uses a light-only neutral.

- [x] **Step 4: Commit the Trends unit**

```bash
git add 'app/[locale]/trends/page.tsx'
git commit -m "feat: make trends surfaces theme aware"
```

---

### Task 7: Register and Profile form migration

**Files:**
- Modify: `app/[locale]/registro/page.tsx`
- Modify: `app/[locale]/perfil/page.tsx`

**Interfaces:**
- Consumes: shared form, panel, button, text, border, and status primitives.
- Produces: iOS-friendly themed forms without changing requests, payloads, HealthKit rendering conditions, or mutations.

- [x] **Step 1: Convert Register sections and controls**

Use `.panel` for workout and daily-log groups; semantic input/select backgrounds; lime selection states; mono numeric/date values; and coral/green semantic error/success states. Preserve `handleSave`, `handleDailySave`, payload keys, workout subtype behavior, and conditional period/distance fields.

- [x] **Step 2: Protect iOS form ergonomics**

Keep input text at 16 pixels on mobile, add visible `focus-visible`/`focus-within` rings, maintain 44-pixel heights, and ensure sticky/fixed save actions sit above `calc(env(safe-area-inset-bottom) + 88px)`.

- [x] **Step 3: Convert Profile sections and controls**

Use `.panel` for account, integrations, body measurements, training markers, segmental muscle, composition bar, and history. Use `.glass ticks` for the native Apple Health integration card. Preserve `Capacitor.isNativePlatform()` checks, authorization/sync handlers, WHOOP links, XML-import conditions, and all form payloads.

- [x] **Step 4: Verify native-specific presentation conditions**

Check source code and rendered browser fallback to ensure native-only HealthKit UI remains hidden on web, XML import remains available on web, and no styling changes alter button disabled/loading conditions.

- [x] **Step 5: Commit the form unit**

```bash
git add 'app/[locale]/registro/page.tsx' 'app/[locale]/perfil/page.tsx'
git commit -m "feat: apply liquid panels to fitness forms"
```

---

### Task 8: Authentication glass experience

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/signup/page.tsx`

**Interfaces:**
- Consumes: authenticated theme initialization from the auth layout and shared material/form utilities.
- Produces: theme-safe login and signup flows with unchanged Supabase behavior.

- [x] **Step 1: Convert login card and inputs**

Use a `.glass-thick ticks` card, semantic labels/inputs/errors, `.btn-accent` submit button, and Movu display wordmark. Preserve `signInWithPassword`, redirect validation, loading state, and signup link.

- [x] **Step 2: Convert every signup stage**

Apply the same surface and controls to invite validation, account creation, and confirmation states. Preserve `/api/invite/validate`, Supabase signup, metadata, redirects, and all existing copy.

- [x] **Step 3: Verify keyboard and dark/light rendering and commit**

At an iPhone viewport, focus every input and confirm no layout zoom, card clipping, or unreadable autofill text. Confirm both themes and reduced transparency.

```bash
git add app/'(auth)'/login/page.tsx app/'(auth)'/signup/page.tsx
git commit -m "feat: add glass authentication experience"
```

---

### Task 9: Full design verification and regression cleanup

**Files:**
- Modify only files already in scope when verification exposes a defect.
- Update: `docs/superpowers/plans/2026-07-17-lifeos-liquid-glass.md` checkbox state during execution.

**Interfaces:**
- Consumes: complete implementation.
- Produces: evidence that the spec's success criteria are met.

- [x] **Step 1: Run automated checks**

Run: `npm test -- lib/theme.test.ts lib/navigation.test.ts`

Expected: all focused tests PASS.

Run: `npm run build`

Expected: compile and type-check PASS. With valid Supabase environment values, the full build passes; otherwise record only the known `/api/waitlist` `supabaseUrl is required` page-data limitation.

- [x] **Step 2: Scan for light-only neutral leaks**

Run:

```bash
rg -n "bg-white|text-\[#111|text-\[#222|text-\[#333|text-\[#444|text-\[#555|bg-\[#f|border-\[#e" app components --glob '*.tsx'
```

Expected: no hardcoded light neutral remains in migrated shell, auth, or five authenticated route files. Literal semantic metric/status colors may remain.

- [x] **Step 3: Verify responsive routes in a real browser**

Render `/login`, `/signup`, and each localized authenticated route at 390×844 and 1440×900. Capture light and dark screenshots. Confirm safe-area spacing, chrome layering, scroll performance, no overlap, no horizontal overflow, and consistent panel hierarchy.

- [x] **Step 4: Exercise the dock interaction matrix**

Verify tap, drag across multiple items, short drag, pointer cancellation, browser back/forward, direct route load, and locale replacement. Confirm visual pill state always resolves to the pathname and tapping remains available with reduced motion.

- [x] **Step 5: Exercise accessibility fallbacks**

Emulate reduced motion and reduced transparency, navigate all chrome by keyboard, inspect focus visibility and `aria-current`, and disable backdrop-filter support. Confirm opaque fallbacks preserve hierarchy.

- [ ] **Step 6: Verify Capacitor integration boundary**

Bring the branch into the iOS/HealthKit integration checkout or merge that work after it is committed. Run the Capacitor iOS Simulator and verify top/bottom safe areas, dock dragging, keyboard behavior, app foreground return, and native Profile HealthKit controls. Resolve only shell-file conflicts while preserving `HealthKitSyncManager`, `viewportFit: 'cover'`, and existing sync behavior.

- [x] **Step 7: Review diff scope and commit verification fixes**

Run: `git status --short && git diff --check && git diff --stat main...HEAD`

Expected: only design-system, shell, screen presentation, focused test, spec, and plan files are changed; no API, database, migration, or native plugin file is modified.

```bash
git add app components lib tailwind.config.ts docs/superpowers/plans/2026-07-17-lifeos-liquid-glass.md
git commit -m "fix: polish liquid glass responsive behavior"
```
