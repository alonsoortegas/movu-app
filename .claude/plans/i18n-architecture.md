# i18n Architecture Plan — Movu

**Status:** Awaiting approval  
**Target locales:** `es` (default, now), `en` (now), `de` (scaffolded, no translations)  
**Assigned agents:** Forge (implementation), Nova (translation copy)

---

## Decision 1 — Library: `next-intl` v3

**Chosen:** `next-intl` 3.x  
**Rejected:** `next-i18next` (Pages Router heritage, requires custom server setup with App Router), custom solution (reinvents middleware, ICU plurals, and type-safety).

**Why `next-intl` v3:**
- Native App Router support: exports `getTranslations()` for Server Components and `useTranslations()` for Client Components — zero prop drilling.
- Middleware-based locale detection + URL routing built in.
- Type-safe message keys via generated types (optional but available).
- Tiny runtime (~4 kB).
- `getRequestConfig` integrates directly with Next.js 14 `unstable_setRequestLocale` to keep Server Components server-only.
- Well-maintained, 7k+ GitHub stars, production-proven with App Router.

**Install:** `npm install next-intl`

---

## Decision 2 — Routing Strategy: `/[locale]/` route group with middleware

**Pattern:** `app/[locale]/` nested segment, locale extracted by middleware.

**Rejected alternatives:**
- `next.config.mjs` i18n block: deprecated for App Router, does not work with App Router layouts.
- Middleware-only (no route segment): makes `lang` attribute on `<html>` and per-locale metadata harder; requires custom request-scoped storage.
- Subdomain routing: overkill for MVP, requires DNS config.

**How it works:**
1. Middleware intercepts every request, detects locale from URL prefix or `Accept-Language`, and rewrites/redirects.
2. Route segment `[locale]` passes the locale down to layouts and pages as a param.
3. `unstable_setRequestLocale(locale)` is called at the top of every layout and page to unblock static rendering.

**Default locale behavior:**  
- `/` and `/dashboard` redirect to `/es/dashboard` (Spanish is the primary market, CDMX users).  
- Accept-Language detection only triggers when the path has no locale prefix yet.
- Once the user is on `/es/...` or `/en/...`, the prefix is sticky.

---

## Decision 3 — Message File Structure: namespaced flat JSON, one file per locale

```
messages/
  es.json
  en.json
  de.json   ← scaffolded, placeholder values only
```

**Namespace schema (top-level keys map to pages/components):**

```json
{
  "common": {},        // shared: nav labels, button text, "save", "cancel"
  "sidebar": {},       // Sidebar.tsx nav labels + CTA
  "bottomNav": {},     // BottomNav.tsx labels
  "dashboard": {},     // dashboard/page.tsx
  "plan": {},          // plan/page.tsx
  "registro": {},      // registro/page.tsx
  "perfil": {},        // perfil/page.tsx
  "localeSwitcher": {} // LocaleSwitcher component
}
```

**One file per locale** (not one file per namespace) because:
- Total string count is ~100. Splitting by namespace at this scale adds file management overhead with zero benefit.
- A single JSON file per locale is trivially manageable; split if string count exceeds ~500.

---

## Decision 4 — Constant Arrays: locale-aware via message keys, defined in messages JSON

Constant arrays (WEEK_DAYS, CLASS_TYPES, PLAN_ROWS, etc.) currently live inline in page files as hardcoded objects.

**New pattern:**  
The arrays keep their non-text fields (value, emoji, pct, durationMin). Text labels become message keys. Pages call `t()` at render time to resolve them.

**Server Component pages:** call `getTranslations('dashboard')`, then map the array and call `t('weekDays.mon')` etc.  
**Client Component pages (`registro`, `perfil`):** call `useTranslations('registro')`, same map pattern.

**The arrays move to the messages JSON** for their text portions. The structural arrays (with non-text metadata) remain as constants in the page files but only carry non-translatable fields (value, emoji, durationMin, pct). Labels are looked up from the translation namespace.

Example for `WEEK_DAYS` in `messages/es.json`:
```json
"dashboard": {
  "weekDays": {
    "mon": { "short": "L", "label": "Lun", "type": "pesas" },
    "tue": { "short": "M", "label": "Mar", "type": "cardio" },
    ...
  }
}
```
The structural array in `dashboard/page.tsx` becomes an ordered key list: `["mon","tue","wed","thu","fri","sat","sun"]`, with emoji and `isToday` kept locally. At render, each entry is enriched with `t.raw('weekDays.mon')`.

---

## Decision 5 — Locale Switcher: placed in Sidebar footer (desktop) + BottomNav trailing slot (mobile)

**Component:** `components/LocaleSwitcher.tsx` — `"use client"` (needs `usePathname`, `useRouter`).

**Behavior:**  
- Renders a two-button toggle: `ES | EN` (DE hidden until translations exist).  
- On click: replaces the current locale segment in the pathname and calls `router.push(newPath)`.  
- Active locale is visually highlighted (accent color).  
- Uses `next-intl`'s `useRouter` (locale-aware wrapper) and `usePathname`.

**Sidebar placement:** below the nav `<CTA>` button, at the very bottom of the sidebar `<aside>`, before `</aside>`.  
**BottomNav placement:** not added as a fifth tab (that would break the 4-tab layout). Instead, added as a small `ES|EN` toggle pill fixed in the top-right corner of the bottom nav bar on mobile. Alternatively — and simpler — place it in the top-right of the main content header area on mobile (visible on all pages via the root layout). The header slot approach avoids touching BottomNav internals and is recommended.

---

## File and Folder Structure to Create

```
messages/
  es.json                          ← all Spanish strings
  en.json                          ← all English strings
  de.json                          ← scaffolded (copy of en.json keys, values = English as placeholder)

app/
  [locale]/                        ← NEW route segment
    layout.tsx                     ← locale layout: sets <html lang>, loads metadata, calls setRequestLocale
    page.tsx                       ← redirect to /[locale]/dashboard
    dashboard/
      page.tsx
    plan/
      page.tsx
    registro/
      page.tsx
    perfil/
      page.tsx

  ← REMOVE old top-level pages (dashboard/, plan/, registro/, perfil/, page.tsx, layout.tsx)

middleware.ts                      ← NEW at project root
i18n.ts                            ← NEW at project root (next-intl request config)
i18n/
  routing.ts                       ← NEW: defineRouting() config (locales, defaultLocale)

components/
  LocaleSwitcher.tsx               ← NEW
  Sidebar.tsx                      ← MODIFIED: accepts locale prop or reads from next-intl
  BottomNav.tsx                    ← MODIFIED: hrefs updated to include locale prefix
```

---

## Routing Architecture Detail

### `i18n/routing.ts`
```ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en', 'de'],
  defaultLocale: 'es'
});
```

### `middleware.ts`
```ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)']
};
```

### `i18n.ts` (request config)
```ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './i18n/routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
```

### `app/[locale]/layout.tsx`
```tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { unstable_setRequestLocale } from 'next-intl/server';

export default async function LocaleLayout({ children, params: { locale } }) {
  unstable_setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body ...>
        <NextIntlClientProvider messages={messages}>
          <Sidebar />
          <main>...</main>
        </NextIntlClientProvider>
        <BottomNav />
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
```

`NextIntlClientProvider` wraps the subtree once in the layout, making all messages available to Client Components via `useTranslations()` without prop drilling.

### Server Component page pattern (`dashboard`, `plan`)
```tsx
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

export default async function DashboardPage({ params: { locale } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('dashboard');
  // use t('weekTitle'), t('insightLabel'), etc.
}
```

### Client Component page pattern (`registro`, `perfil`)
```tsx
"use client";
import { useTranslations } from 'next-intl';

export default function RegistroPage() {
  const t = useTranslations('registro');
  // use t('classType'), t('effortLabel.soft'), etc.
}
```

Client Components receive messages from the `NextIntlClientProvider` in the layout — no props needed.

### `Sidebar.tsx` and `BottomNav.tsx` — link href updates
Both components use hardcoded hrefs like `/dashboard`. These must become locale-aware.

`next-intl` exports a `Link` component and `useRouter`/`usePathname` that are locale-aware. Replace Next.js `Link` and `usePathname` imports:
```tsx
import Link from 'next-intl/link';         // locale-prefixed automatically
import { usePathname } from 'next-intl';   // strips locale prefix for active check
```

With these imports, `href="/dashboard"` automatically becomes `/es/dashboard` or `/en/dashboard` based on the current locale — no manual string manipulation.

---

## Message File Key Structure

### `messages/es.json` (abbreviated, showing all namespaces and representative keys)

```json
{
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "optional": "opcional",
    "registerToday": "+ Registrar hoy"
  },
  "sidebar": {
    "tagline": "Entrena más inteligente.",
    "nav": {
      "dashboard": "Dashboard",
      "registro": "Registro",
      "plan": "Mi Plan",
      "perfil": "Perfil"
    },
    "cta": "+ Registrar hoy"
  },
  "bottomNav": {
    "dashboard": "Dashboard",
    "registro": "Registrar",
    "plan": "Mi Plan",
    "perfil": "Perfil"
  },
  "dashboard": {
    "title": "Dashboard",
    "greeting": "Hola, Ana",
    "weekRange": "Semana del 14–20 Abr · 2025",
    "registerCta": "+ Registrar hoy",
    "registerCtaMobile": "+ Registrar entrenamiento de hoy",
    "insightLabel": "Insight de hoy",
    "insightBadge": "IA",
    "insightText": "Hoy es buen día para intensidad alta...",
    "thisWeek": "Esta semana",
    "recentWorkouts": "Últimos entrenamientos",
    "weeklyProgress": "Progreso semanal",
    "muscleGroups": "Grupos musculares",
    "metrics": {
      "sleep": "Sueño",
      "sleepQuality": "Buena calidad",
      "calories": "Calorías",
      "time": "Tiempo"
    },
    "progress": {
      "workouts": "Entrenamientos",
      "activeMinutes": "Minutos activos",
      "calories": "Calorías"
    },
    "weekDays": {
      "mon": { "short": "L", "label": "Lun", "type": "pesas" },
      "tue": { "short": "M", "label": "Mar", "type": "cardio" },
      "wed": { "short": "X", "label": "Mié", "type": "pesas" },
      "thu": { "short": "J", "label": "Jue", "type": "descanso" },
      "fri": { "short": "V", "label": "Vie", "type": "correr" },
      "sat": { "short": "S", "label": "Sáb", "type": "combinado" },
      "sun": { "short": "D", "label": "Dom", "type": "—" }
    }
  },
  "plan": {
    "title": "Mi Plan Semanal",
    "subtitle": "Generado por IA · Semana 14–20 Abr",
    "regenerate": "Regenerar plan",
    "regenerateMobile": "Regenerar",
    "planLogic": "LÓGICA DEL PLAN",
    "planLogicText": "Basado en tu historial...",
    "weeklyVolume": "Volumen semanal",
    "weeklyGoal": "Meta semanal",
    "muscleGroupsWeek": "Grupos musculares esta semana",
    "tableHeaders": {
      "day": "Día",
      "muscleGroup": "Grupo Muscular",
      "type": "Tipo",
      "min": "Min"
    },
    "planRows": {
      "mon": { "day": "Lunes", "dayShort": "Lun", "muscle": "Pecho + Tríceps", "type": "Pesas" },
      "tue": { "day": "Martes", "dayShort": "Mar", "muscle": "Pierna", "type": "Pesas" },
      "wed": { "day": "Miércoles", "dayShort": "Mié", "muscle": "Cardio HIIT", "type": "Cardio" },
      "thu": { "day": "Jueves", "dayShort": "Jue", "muscle": "Descanso", "type": "—" },
      "fri": { "day": "Viernes", "dayShort": "Vie", "muscle": "Espalda + Bícep", "type": "Pesas" },
      "sat": { "day": "Sábado", "dayShort": "Sáb", "muscle": "Full Body", "type": "Combinado" },
      "sun": { "day": "Domingo", "dayShort": "Dom", "muscle": "Descanso", "type": "—" }
    },
    "typeLabels": {
      "pesas": "Pesas",
      "cardio": "Cardio",
      "combinado": "Combinado"
    },
    "muscleBadges": {
      "chest": "Pecho",
      "legs": "Pierna",
      "cardio": "Cardio",
      "back": "Espalda"
    },
    "volumeBars": {
      "chestTriceps": "Pecho / Tríceps",
      "legs": "Pierna",
      "backBicep": "Espalda / Bícep",
      "core": "Core",
      "cardio": "Cardio"
    },
    "daysGoal": "/ 5 días"
  },
  "registro": {
    "title": "Registrar entrenamiento",
    "dateLabel": "Lunes 21 de Abril",
    "classType": "Tipo de clase",
    "className": "Nombre de la clase",
    "classNamePlaceholder": "ej. Spinning, Barre, HIIT...",
    "studio": "Estudio o lugar",
    "studioPlaceholder": "ej. Cyclo Studio, Gym Club, CDMX...",
    "duration": "Duración (min)",
    "durationPlaceholder": "ej. 60",
    "calories": "Calorías",
    "caloriesPlaceholder": "ej. 420",
    "distance": "Distancia en km",
    "effort": "Esfuerzo percibido",
    "effortSoft": "Suave",
    "effortMax": "Máximo",
    "save": "Guardar entrenamiento",
    "saved": "✓ Entrenamiento guardado",
    "effortLabels": {
      "1": "Muy suave",
      "2": "Suave",
      "3": "Moderado",
      "4": "Intenso",
      "5": "Máximo"
    },
    "classTypes": {
      "pesas": "Pesas",
      "cardio": "Cardio",
      "correr": "Correr",
      "combinado": "Combinado",
      "bootcamp": "Bootcamp",
      "taller": "Taller"
    }
  },
  "perfil": {
    "title": "Perfil",
    "subtitle": "Tus datos y metas de entrenamiento",
    "personalInfo": "Información personal",
    "name": "Nombre",
    "mainGoal": "Objetivo principal",
    "weeklyGoal": "Meta semanal de entrenamientos",
    "inbodyData": "Datos InBody",
    "muscleMass": "Masa muscular",
    "bodyFat": "Grasa corporal",
    "bodyComposition": "Composición corporal",
    "muscle": "Músculo",
    "fat": "Grasa",
    "save": "Guardar cambios",
    "saved": "✓ Perfil guardado",
    "savedMobile": "✓ Guardado",
    "goals": {
      "loseGainMuscle": "Perder grasa y ganar músculo",
      "gainMuscle": "Ganar músculo",
      "loseFat": "Perder peso",
      "endurance": "Mejorar resistencia",
      "stayActive": "Mantenerme activo/a"
    }
  },
  "localeSwitcher": {
    "label": "Idioma"
  },
  "metadata": {
    "title": "Movu — Entrena más inteligente",
    "description": "Plataforma de inteligencia fitness para usuarios de boutique fitness en CDMX."
  }
}
```

### `messages/en.json` (same structure, English values)

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "optional": "optional",
    "registerToday": "+ Log today"
  },
  "sidebar": {
    "tagline": "Train smarter.",
    "nav": {
      "dashboard": "Dashboard",
      "registro": "Log",
      "plan": "My Plan",
      "perfil": "Profile"
    },
    "cta": "+ Log today"
  },
  "bottomNav": {
    "dashboard": "Dashboard",
    "registro": "Log",
    "plan": "My Plan",
    "perfil": "Profile"
  },
  "dashboard": {
    "title": "Dashboard",
    "greeting": "Hey, Ana",
    "weekRange": "Week of Apr 14–20, 2025",
    "registerCta": "+ Log today",
    "registerCtaMobile": "+ Log today's workout",
    "insightLabel": "Today's insight",
    "insightBadge": "AI",
    "insightText": "Today is a good day for high intensity...",
    "thisWeek": "This week",
    "recentWorkouts": "Recent workouts",
    "weeklyProgress": "Weekly progress",
    "muscleGroups": "Muscle groups",
    "metrics": {
      "sleep": "Sleep",
      "sleepQuality": "Good quality",
      "calories": "Calories",
      "time": "Time"
    },
    "progress": {
      "workouts": "Workouts",
      "activeMinutes": "Active minutes",
      "calories": "Calories"
    },
    "weekDays": {
      "mon": { "short": "M", "label": "Mon", "type": "weights" },
      "tue": { "short": "T", "label": "Tue", "type": "cardio" },
      "wed": { "short": "W", "label": "Wed", "type": "weights" },
      "thu": { "short": "T", "label": "Thu", "type": "rest" },
      "fri": { "short": "F", "label": "Fri", "type": "run" },
      "sat": { "short": "S", "label": "Sat", "type": "combined" },
      "sun": { "short": "S", "label": "Sun", "type": "—" }
    }
  },
  "plan": { "..." : "..." },
  "registro": { "..." : "..." },
  "perfil": { "..." : "..." },
  "localeSwitcher": { "label": "Language" },
  "metadata": {
    "title": "Movu — Train smarter",
    "description": "Fitness intelligence platform for boutique fitness users in CDMX."
  }
}
```

### `messages/de.json` — German scaffolding approach

Copy `en.json` verbatim. Add a `"_i18n_status"` key at the top level:

```json
{
  "_i18n_status": "UNTRANSLATED — German translations pending. Values are English placeholders.",
  "common": { ... },
  ...
}
```

This ensures:
- The app does not crash if a user lands on `/de/...` (e.g., via manual URL).
- Engineers can clearly see which file needs translation work.
- No need for a fallback locale config in `next-intl` (which would silently serve English anyway, but with no indication in the JSON).

When German translations are ready, replace values in-place and remove `_i18n_status`.

---

## Migration Order

Migrate in this sequence to minimize breakage at each step. Each step is independently deployable.

**Step 1 — Infrastructure (no UI changes)**
1. Install `next-intl`.
2. Create `i18n/routing.ts`, `i18n.ts`, `middleware.ts`.
3. Create `messages/es.json` with all ~100 strings extracted (English still missing).
4. Create `messages/en.json` as a copy of `es.json` (Spanish values — temporary; makes app functional before translations are written).
5. Create `messages/de.json` as scaffolded placeholder.
6. Move all pages under `app/[locale]/`. Update `app/[locale]/layout.tsx` with `NextIntlClientProvider`.
7. Add `generateStaticParams` to locale layout.
8. Verify app loads at `/es/dashboard` with no translation calls yet.

**Step 2 — Shared components (Sidebar, BottomNav)**
1. Update `href` imports to `next-intl/link` and `usePathname` to `next-intl`.
2. Add `useTranslations('sidebar')` and `useTranslations('bottomNav')`.
3. Replace hardcoded strings.
4. Build and verify active-state logic still works (next-intl's `usePathname` returns the path without locale prefix, so existing `pathname === href` checks work unchanged).

**Step 3 — LocaleSwitcher component**
1. Create `components/LocaleSwitcher.tsx`.
2. Add to Sidebar footer and main layout header (mobile).
3. Verify switching from `/es/dashboard` to `/en/dashboard` works.

**Step 4 — Server Component pages (dashboard, plan)**
1. Migrate `dashboard/page.tsx`: add `unstable_setRequestLocale`, `getTranslations`, replace strings.
2. Migrate `plan/page.tsx`: same pattern. Move PLAN_ROWS text fields to messages JSON.
3. Verify static rendering is preserved (no forced dynamic rendering).

**Step 5 — Client Component pages (registro, perfil)**
1. Migrate `registro/page.tsx`: add `useTranslations('registro')`, move CLASS_TYPES labels and EFFORT_LABELS to messages JSON.
2. Migrate `perfil/page.tsx`: add `useTranslations('perfil')`, move goal options to messages JSON.

**Step 6 — Metadata**
1. Add `generateMetadata` to `app/[locale]/layout.tsx` using `getTranslations('metadata')`.
2. Verify `<html lang>` and `<title>` update per locale.

**Step 7 — English translations**
1. Write proper English values in `en.json` (Nova's task).
2. Remove temporary Spanish-as-English placeholder values.
3. Test full EN locale end-to-end.

**Step 8 — Cleanup**
1. Delete old `app/dashboard/`, `app/plan/`, `app/registro/`, `app/perfil/`, `app/page.tsx`, `app/layout.tsx`.
2. Confirm `/dashboard` redirects to `/es/dashboard` via middleware.
3. Update any hardcoded paths in tests or configs.

---

## `next.config.mjs` Change

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // next-intl does NOT use next.config i18n block with App Router.
  // Routing is handled entirely by middleware + [locale] segment.
};

export default nextConfig;
```

No change needed. The `next.config.mjs` i18n block is Pages Router only — do not add it.

---

## Summary of Agent Assignments

| Agent | Tasks |
|-------|-------|
| Forge | Steps 1–8: all implementation, file moves, component wiring |
| Nova  | Step 7: write proper English translations in `messages/en.json` |

---

## Open Questions (resolved)

- **Default locale:** `/` and `/dashboard` redirect to `/es/*` by middleware. No opt-in to browser language detection needed for MVP.
- **German:** scaffolded, English placeholders, no DE-specific features in Phase 1.
- **`unstable_setRequestLocale`:** required for static rendering in next-intl v3; will be stabilized in next-intl v4. Use it with the understanding it may rename in a future upgrade.
- **Type safety:** optional for MVP — skip `next-intl` message type generation. Add in Phase 2 when the string set stabilizes.
