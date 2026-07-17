# Faithful LifeOS Mobile Design for Movu

**Date:** 2026-07-17
**Status:** Approved direction, pending written-spec review

## Objective

Bring the complete modern mobile visual language of LifeOS into Movu while preserving Movu's product model, routes, translations, Supabase behavior, and native HealthKit integration. The result must feel like the LifeOS mobile dashboard shown in the reference: spacious, luminous, data-forward, and materially glassy—not like Movu's existing card layout with blur added afterward.

This redesign applies below the Tailwind `md` breakpoint. Desktop keeps Movu's existing sidebar-oriented layout and information density.

## Visual Direction

The mobile experience uses a light-forward, cool-white canvas with low-contrast aurora atmosphere and a fully supported dark equivalent. The identity comes from five coordinated elements:

1. Oversized, tightly tracked headings for the current moment or task.
2. Uppercase monospaced context labels for dates, training phases, metrics, and status.
3. Luminous channel colors that carry meaning: lime for positive/readiness, cyan for sleep and endurance, violet for strain or strength, coral for warnings, and amber for time or progress.
4. Translucent surfaces with hairline edges, soft internal light, restrained glow, and generous radii.
5. A persistent floating mobile dock whose active bubble appears to move through liquid glass.

Movu retains its wordmark and lime accent. The design does not copy LifeOS branding, icons, tab names, or content.

## Mobile Shell

### Header

The authenticated mobile header is compact and translucent. It contains the Movu wordmark, the current local date or route context, theme control, and locale control where space permits. It remains fixed, respects the iOS top safe area, and allows page atmosphere to remain visible behind it.

The page itself begins with a large contextual heading. On Dashboard this is the personalized greeting. On other routes it is the task-oriented screen title. A monospaced eyebrow immediately below provides useful context such as the current training week, goal, range, or section—not decorative filler.

### Persistent dock

The dock is mounted once in the localized authenticated layout and remains visible on Dashboard, Plan, Register, Trends, and Profile. It is never rendered on Login or Signup and remains hidden at `md` and above.

The dock:

- floats above `env(safe-area-inset-bottom)`;
- uses true backdrop blur, saturation, a bright top edge, and an opaque fallback;
- keeps all five destinations directly tappable;
- supports the existing drag-to-select gesture;
- enlarges the active destination into a rounded luminous bubble rather than only placing a flat highlight behind the segment;
- resolves its resting state from the current pathname after tap, drag, browser navigation, direct loading, or locale replacement;
- remains readable with reduced transparency and usable with reduced motion.

Content scrolls behind the dock. Every mobile screen reserves enough bottom space that the last control or row remains reachable.

## Dashboard Composition

The Dashboard is the strongest expression of the direction and establishes the system used by the other tabs.

### 1. Moment header

Show a large localized greeting and a concise mono line describing the current training context. The visual hierarchy should resemble LifeOS's greeting/week treatment while using actual Movu data and copy.

### 2. AI training brief

The AI insight becomes the primary hero surface. It uses an asymmetric semantic accent edge, a confidence/status capsule when applicable, one decisive recommendation headline, and a short evidence/action row. Existing insight content and server behavior remain unchanged; the component only reorganizes available content.

### 3. Readiness and progress rings

Where the available data supports them, render two prominent circular indicators:

- recovery/readiness, derived only from existing sleep or recovery data already available to the page;
- weekly training progress, derived from existing weekly targets and completed activity.

If a value is unavailable, render an explicit unavailable state rather than inventing a score. Rings use SVG or CSS presentation only and do not create new health calculations.

### 4. Metric tiles

Sleep, calories, active minutes, or other existing summary values become luminous two-column mobile tiles. Each tile uses a channel color, a mono data value, a compact comparison/context line when the data exists, and restrained surface tinting. Desktop metric cards remain structurally unchanged.

### 5. Activity and training sections

Recent activity, muscle distribution, and progress sections use the same panel grammar: light edge, translucent gradient, large radius, mono labels, and meaningful colored indicators. They remain information-dense enough for fitness use and avoid decorative blur on every card.

## Other Mobile Tabs

### Plan

The weekly plan reads as a sequence of spacious day modules. The active or current day receives the strongest edge/glow, training type is encoded with a channel color, and volume/status data uses the mono utility face. Plan logic remains the single hero glass surface.

### Register

Workout logging uses grouped translucent sheets with large touch targets and clear selected states. The primary save action remains above the dock and safe area. Inputs remain at least 16 pixels on mobile to prevent iOS zoom.

### Trends

Charts sit on quiet luminous panels with consistent axes and channel colors. The date-range selector becomes a compact glass segmented control. Empty and sparse states retain the same spatial hierarchy instead of collapsing into generic cards.

### Profile

Profile becomes a sequence of compact data panels. Native Apple Health/HealthKit status is a primary glass integration surface on iOS; browser XML import behavior remains unchanged. Body-composition values use the same mono metric treatment as Dashboard.

## Material and Performance Rules

True `backdrop-filter` is limited to fixed chrome, overlays, the dock, and at most one hero per screen. Repeated content cards imitate the visual depth using translucent gradients, borders, and shadows without blur. This follows the LifeOS material rules and protects mobile scrolling performance.

All materials provide:

- `@supports` fallbacks when backdrop filtering is unavailable;
- opaque alternatives under reduced transparency;
- disabled or simplified motion under reduced motion;
- sufficient light/dark contrast;
- visible keyboard focus;
- 44-pixel minimum touch targets;
- safe-area-aware fixed positioning.

## Architecture

The redesign should introduce small presentation primitives rather than duplicating long class strings across pages:

- a mobile screen heading/context component;
- a semantic metric tile;
- a reusable progress ring;
- a mobile panel/card primitive supporting semantic channel accents;
- the existing shared navigation model and dock interaction helpers.

These primitives receive display values and labels. They do not fetch data, calculate new health scores, mutate application state, or depend directly on Supabase.

Existing server components, API routes, form handlers, translations, authentication, and native platform checks remain intact. Mobile-specific composition uses responsive markup or shared primitives; desktop behavior must not regress.

## Verification

The implementation is complete when:

- Dashboard at an iPhone viewport clearly matches the reference's hierarchy and material character without copying LifeOS branding;
- the dock remains visible and correctly active across all five authenticated routes;
- tap, drag, cancellation, back/forward navigation, direct routes, and locale changes keep dock state synchronized;
- all mobile screens remain usable at 390x844 and representative iPhone safe areas;
- no final content or fixed action is obscured by the dock;
- light and dark themes retain readable contrast;
- reduced-motion, reduced-transparency, and no-backdrop-filter fallbacks work;
- existing tests, TypeScript checks, and the production build pass;
- no Supabase, authentication, form payload, HealthKit, or API behavior changes are introduced;
- final screenshots cover Dashboard and at least two additional tabs in light and dark mobile themes.

## Out of Scope

- Replacing the desktop sidebar with the mobile dock.
- Copying LifeOS's seven-tab information architecture.
- Creating new recovery science, health scores, database fields, or API endpoints.
- Rebranding Movu as LifeOS.
- Merging or rewriting the separate uncommitted native HealthKit work.
