# Compact LifeOS Dock Correction

**Date:** 2026-07-17
**Status:** Approved direction, pending written-spec review

## Objective

Correct Movu's mobile tab selector so its active glass material uses the same restrained proportions as the LifeOS reference. The current Movu bubble extends nine pixels above and below the dock and makes the selector visually dominant.

## Geometry

- Keep the dock mobile-only and fixed above the iOS bottom safe area.
- Restore the LifeOS outer radius of `28px`.
- Restore a `52px` minimum height for each tab destination.
- Position the moving active pill at `top: 6px` and `bottom: 6px`, fully inside the dock.
- Give the pill a full rounded shape without horizontal resting scale.
- Scale the pill to `1.06` only during an active drag.
- Use the LifeOS-strength resting and dragging shadows rather than the larger Movu glow.

## Behavior

Do not change route mapping, localized links, `aria-current`, tap behavior, pointer math, the native non-passive touch listener, window drag listeners, safe-area offset, or reduced-motion behavior.

## Verification

- At `390px` width, the selector matches the LifeOS visual proportions and no glass layer protrudes beyond the dock.
- All five labels remain readable and tappable.
- Tap and drag still resolve to the correct localized route.
- Navigation tests, TypeScript, and the production build pass.
