# Movu LifeOS Liquid Glass Design

## Objective

Bring the mobile Liquid Glass design language from the adjacent LifeOS repository into Movu, with the Capacitor iOS app as the highest-priority environment. The result should feel like the same design family while preserving Movu's fitness-focused identity, route structure, localization, and in-progress HealthKit integration.

## Chosen approach

Use one responsive design system for the web app and the Capacitor app. Port LifeOS's material mechanics, depth, atmospheric background, motion, accessibility fallbacks, and iOS-safe navigation behavior, then adapt them to Movu's routes and existing lime brand.

This is preferred over either copying LifeOS's exact product identity or maintaining an iOS-only visual fork. A shared responsive system avoids drift because Capacitor loads the deployed Next.js interface, while Movu-specific accents and content preserve the product's identity.

## Visual system

### Palette and materials

Movu will gain semantic dark and light theme tokens modeled on LifeOS:

- Deep blue-black and airy blue-white page backgrounds.
- Elevated and nested surfaces, subtle borders, primary/secondary/tertiary text, translucent ink fills, and ring tracks.
- Thin, regular, and thick glass materials with specular top-edge highlights.
- Movu lime as the primary accent, with cyan and violet used only in the ambient Aurora wash and restrained data channels.
- Coral and amber reserved for destructive and warning states.

Neutral colors in application components will use semantic tokens rather than hardcoded white, black, or gray values. Literal colors remain appropriate for metric channels and status semantics.

### Typography

Use the repository's local Geist and Geist Mono files through `next/font/local`:

- Geist for display, labels, and body text.
- Geist Mono for measurements, dates, counts, and other tabular data.
- Tight display tracking and compact uppercase utility labels where they encode information hierarchy.

This removes the render-blocking Google Fonts import and makes the iOS bundle independent of an external font request.

### Background and depth

The page background uses a fixed Aurora wash in lime, cyan, and violet plus a very subtle grain layer. True backdrop blur is limited to persistent chrome, overlays, and at most one hero surface per screen. Normal content cards use an opaque/translucent gradient panel with inset highlight and shadow, avoiding stacked backdrop filters that degrade WKWebView scrolling.

Cards use larger, consistent radii. Dividers use subtle ink tokens. Interactive elements get visible focus states, short pressed-scale feedback, and restrained transitions.

## Responsive application shell

### Mobile and iOS header

Add a fixed `MobileHeader` below the iOS top safe area. It uses the thick glass material and contains:

- The Movu wordmark.
- The localized current-section label derived from the route.
- Compact access to locale selection.
- A subtle bottom hairline with a slow lime-to-cyan glint.

The content area receives matching safe-area-aware top padding. Existing page-level titles remain content headings; the shell label acts as location context, not a duplicate large heading.

### Floating bottom dock

Replace Movu's full-width white mobile navigation bar with a floating glass dock based on LifeOS `TabBar`:

- Five equal route destinations: Dashboard, Trends, Register, Plan, and Profile.
- A glossy lime selection pill that springs between destinations.
- The pill tracks horizontal dragging and navigates to the nearest route when released.
- iOS-safe native non-passive `touchmove` cancellation and window-level pointer tracking prevent Safari/WKWebView from stealing the gesture.
- Navigation remains route-based and localized through Movu's i18n router.
- The dock accounts for `env(safe-area-inset-bottom)` and has at least 44-point touch targets.
- The primary register action remains visually distinct without breaking the dock's shared selection behavior.

Full-page swipe navigation is intentionally excluded. Movu contains forms, charts, and horizontal controls where route swipes would cause accidental navigation and lost input.

### Desktop shell

Keep the current desktop information architecture. Restyle the sidebar as a thin glass chrome surface with semantic tokens, a luminous active state, and updated controls. Content uses the same panel and typography system, so desktop and iOS remain one product rather than separate themes.

## Content surface migration

The five authenticated screens, authentication screens, and shared controls will migrate from hardcoded colors to the new tokens:

- Dashboard: glass hero insight, panel-based metric and activity cards, channel-colored metric details, and a floating glossy mobile action.
- Trends: tokenized charts, tracks, legends, empty/error states, and data cards while preserving each metric's semantic channel color.
- Register: glass/panel form sections, tokenized inputs and segmented selections, clear success/error states, and keyboard-safe spacing.
- Plan: panel-based mobile rows and desktop table, tokenized training-type chips, progress tracks, and plan explanation hero.
- Profile: panelized account, HealthKit, WHOOP, settings, and body-composition sections; native iOS HealthKit controls remain unchanged in behavior.
- Login and signup: thick-glass auth card on the Aurora background with tokenized inputs and glossy accent actions.

Decorative emoji will not be added. Existing workout-category emoji may remain where it carries category meaning, but shell and control iconography uses monochrome symbols so it participates in the glass material rather than looking pasted on.

## Theme behavior

Dark and light values follow the user's saved preference, falling back to `prefers-color-scheme`. A pre-paint script applies the correct class before rendering to avoid a flash. Theme preference is shared by auth and authenticated layouts.

The iOS metadata uses `viewport-fit=cover`, an appropriate translucent status-bar style, and theme colors for both schemes. Inputs avoid iOS focus zoom and fixed chrome detachment through viewport configuration and minimum usable text sizing.

## Accessibility and resilience

- `prefers-reduced-motion` disables entrance, glint, pulse, and spring animations while retaining immediate state changes.
- `prefers-reduced-transparency` replaces blurred glass with opaque semantic surfaces.
- Browsers without `backdrop-filter` receive opaque surface fallbacks.
- Navigation exposes `aria-current`, readable labels, keyboard focus, and link semantics.
- Dragging never becomes the only way to navigate; every destination remains tappable and keyboard accessible.
- Interactive targets meet mobile sizing expectations and do not rely on color alone.
- Theme foreground/background combinations must retain readable contrast.

## Architecture and boundaries

The implementation will keep responsibilities isolated:

- `app/globals.css`: theme tokens, Aurora background, panel/glass utilities, animations, reduced-motion/transparency fallbacks, and shared form primitives.
- Root layouts: local font variables, theme initialization, viewport/metadata, and shell spacing.
- `components/MobileHeader.tsx`: localized mobile chrome and current-route context.
- `components/BottomNav.tsx`: localized route configuration, draggable pill state, and iOS-safe gesture handling.
- `components/ThemeToggle.tsx`: saved theme preference and accessible control.
- `components/Sidebar.tsx` and `components/LocaleSwitcher.tsx`: desktop chrome and shared control migration.
- Screen components: content hierarchy and semantic class migration only; data fetching and mutation behavior stay unchanged.

No database, API, Supabase, HealthKit plugin, or Capacitor bridge contract changes are required.

## State, navigation, and failure handling

The active dock item is derived from the localized pathname. During a drag, visual pill position is local transient state; on release it resolves to a route and uses the existing locale-aware router. Cancelled gestures settle to the closest valid destination. Route changes update the pill even when navigation originates elsewhere.

If theme storage is unavailable, the system preference remains authoritative. If blur is unsupported or reduced transparency is enabled, opaque surfaces preserve the hierarchy. Existing screen-level API errors and empty states retain their behavior and receive tokenized presentation.

## Verification

Verification must cover the design as rendered, not only compilation:

1. Run unit tests and a production build to catch behavior, type, and CSS integration regressions.
2. Render all five authenticated routes plus login and signup at a desktop viewport and an iPhone viewport in both light and dark schemes.
3. Confirm no hardcoded light neutral leaves unreadable text or surfaces in dark mode.
4. Exercise dock tapping, dragging, cancellation, browser back/forward navigation, and localized route changes.
5. Verify top and bottom safe areas in the Capacitor iOS Simulator, including scrolling, keyboard display, and returning from background.
6. Verify reduced-motion, reduced-transparency, keyboard focus, and no-backdrop-filter fallbacks.
7. Confirm HealthKit connect/sync controls still render and behave in the native iOS profile screen.

## Out of scope

- Reworking application data models, APIs, or fitness calculations.
- Adding full-page swipe route navigation.
- Introducing a separate native SwiftUI design layer.
- Copying LifeOS-specific product labels, icons, financial features, or information architecture.
- Broad desktop layout redesign beyond applying the shared visual system.

## Success criteria

The work is complete when Movu visibly uses the LifeOS-derived Aurora and Liquid Glass system across authenticated and auth screens; the iOS shell has safe-area-aware glass chrome and the interactive floating dock; all screens remain readable in light and dark modes; accessibility fallbacks work; current localized navigation, data behavior, and HealthKit integration are preserved; and the rendered desktop and iOS experiences have been verified.
