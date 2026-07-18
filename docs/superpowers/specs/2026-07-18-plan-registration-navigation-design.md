# Plan registration navigation design

## Goal

Simplify Movu's primary navigation to five destinations and make workout registration a contextual action within the training-plan flow.

## Primary navigation

Both the desktop sidebar and mobile dock use the same ordered destination list:

1. Dashboard
2. Plan
3. Nutrición
4. Tendencias
5. Perfil

`Registro` is removed from the shared navigation list. The existing `/[locale]/registro` route and its form remain unchanged and directly addressable.

The standalone registration CTA at the bottom of the desktop sidebar is removed so the sidebar presents one consistent five-destination information architecture. The locale and theme controls remain in the sidebar footer.

## Plan actions

Plan becomes the main navigation-level entry point for manual workout registration.

- On desktop, the Plan header presents `Registrar entrenamiento` as the primary accent action and `Editar plan` as the secondary action.
- On mobile, the existing edit icon remains in the page header. A prominent, full-width `Registrar entrenamiento` action appears directly below the mobile page intro.
- Both registration actions navigate to the existing localized route `/${locale}/registro`.
- The action appears in every Plan state: active plan, no plan, not-yet-started plan, and expired plan.

Existing contextual registration links on Dashboard remain available because they represent actions tied to today's workout rather than primary navigation destinations.

## Components and data flow

- `lib/navigation.ts` remains the single source of truth for navigation order and contains the five destinations.
- `Sidebar` and `BottomNav` continue rendering from that shared list without special handling for Registro.
- The Plan page renders localized links to the existing registration form; no new component, API route, state, or database behavior is introduced.
- The registration form continues posting to its existing APIs and retains its current success and error handling.

## Localization

Add a Plan-scoped label for the new action in Spanish, English, and German message files. Existing `registro` translations remain because the standalone page continues to use them. Obsolete primary-navigation labels may remain in the message catalogs unless removal is required by validation tooling.

## Accessibility and responsive behavior

- Registration links use descriptive visible text rather than a plus icon alone.
- Existing focus, hover, and active styles are retained through the project's button classes.
- The mobile action remains above the weekly content and does not compete with the five-item bottom dock.
- The reduced dock item count automatically enlarges each touch target while preserving the existing dock geometry.

## Testing and acceptance criteria

- Navigation tests assert the exact five-item order.
- Active-index tests cover all five destinations and their nested routes.
- `/registro` is no longer treated as a primary navigation destination; an unknown/non-primary route falls back to Dashboard under the existing helper behavior.
- Pointer-position tests use five dock segments.
- All three locale catalogs parse successfully and contain the Plan registration action.
- Lint, focused navigation tests, and the production build pass.
- Manual responsive verification confirms the desktop Plan actions, mobile Plan CTA, and five-item dock/sidebar order.

## Out of scope

- Moving or embedding the form inside the Plan page.
- Changing registration APIs, form fields, or persistence.
- Removing Dashboard's contextual registration actions.
- Redirecting or deleting the existing registration route.
