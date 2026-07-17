# Compact LifeOS Dock Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Movu's mobile dock to the exact restrained active-pill proportions used by LifeOS.

**Architecture:** Define the four reference geometry values as a tested navigation constant and consume them directly in `BottomNav`. Keep CSS responsible only for material fill and shadows, while all routing and drag mechanics remain unchanged.

**Tech Stack:** React, TypeScript, Tailwind CSS, CSS, Vitest.

## Global Constraints

- Dock radius is exactly `28px`.
- Tab minimum height is exactly `52px`.
- Active pill is inset exactly `6px` from the dock top and bottom.
- Resting pill scale is `1`; dragging scale is `1.06`.
- Do not change route mapping, localized links, safe-area position, accessibility, or pointer/touch behavior.

---

### Task 1: Restore the compact dock geometry

**Files:**
- Modify: `lib/navigation.ts`
- Modify: `lib/navigation.test.ts`
- Modify: `components/BottomNav.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `LIFEOS_DOCK_GEOMETRY` with `radius`, `itemMinHeight`, `pillInset`, `restScale`, and `dragScale` numeric properties.
- Consumes: the existing dock route and drag helpers without signature changes.

- [ ] **Step 1: Write the failing geometry test**

```ts
import { LIFEOS_DOCK_GEOMETRY } from './navigation'

describe('LIFEOS_DOCK_GEOMETRY', () => {
  it('keeps the active material compact and inside the dock', () => {
    expect(LIFEOS_DOCK_GEOMETRY).toEqual({
      radius: 28,
      itemMinHeight: 52,
      pillInset: 6,
      restScale: 1,
      dragScale: 1.06,
    })
  })
})
```

- [ ] **Step 2: Run the test and verify the missing-export failure**

Run: `npm test -- lib/navigation.test.ts`

Expected: FAIL because `LIFEOS_DOCK_GEOMETRY` is not exported.

- [ ] **Step 3: Implement the geometry constant**

```ts
export const LIFEOS_DOCK_GEOMETRY = {
  radius: 28,
  itemMinHeight: 52,
  pillInset: 6,
  restScale: 1,
  dragScale: 1.06,
} as const
```

- [ ] **Step 4: Consume exact geometry in BottomNav**

Import the constant. Set the dock `borderRadius`, link `minHeight`, pill `top`/`bottom`, and bubble `transform` through existing inline style objects. Remove `rounded-[30px]`, `min-h-[58px]`, and the protruding geometry from CSS.

```tsx
style={{
  borderRadius: LIFEOS_DOCK_GEOMETRY.radius,
  boxShadow: 'var(--glass-edge), var(--shadow-pop)',
  touchAction: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  WebkitTapHighlightColor: 'transparent',
}}
```

```tsx
style={{
  top: LIFEOS_DOCK_GEOMETRY.pillInset,
  bottom: LIFEOS_DOCK_GEOMETRY.pillInset,
  left: 6,
  width: `calc((100% - 12px) / ${MOVU_NAV_ITEMS.length})`,
  transform: `translateX(${pillPosition * 100}%)`,
  transition: dragging ? 'none' : 'transform 0.45s cubic-bezier(0.3, 1.35, 0.4, 1)',
}}
```

Set the bubble transform to `scale(1.06)` only while dragging and `scale(1)` at rest. Restore LifeOS's smaller resting and dragging shadow values.

- [ ] **Step 5: Verify tests, typecheck, and mobile rendering**

Run: `npm test -- lib/navigation.test.ts && npx tsc --noEmit`

Expected: PASS.

At `390px`, verify the active pill stays inside the dock and all five routes remain tappable.

- [ ] **Step 6: Commit**

```bash
git add lib/navigation.ts lib/navigation.test.ts components/BottomNav.tsx app/globals.css
git commit -m "fix: restore compact LifeOS dock geometry"
```
