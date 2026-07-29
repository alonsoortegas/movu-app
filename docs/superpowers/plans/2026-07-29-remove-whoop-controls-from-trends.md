# Remove WHOOP Controls from Trends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove WHOOP connection and synchronization controls from Trends while preserving every chart backed by stored health data.

**Architecture:** Trends becomes independent of WHOOP credential state and continues reading normalized `daily_metrics`, `sleep_logs`, and `activities`. The WHOOP ingestion routes and Profile integration remain untouched.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 18, next-intl, Supabase, Vitest

## Global Constraints

- Do not delete WHOOP routes, scripts, profile controls, tokens, database columns, or historical data.
- Do not remove recovery, HRV, resting heart rate, sleep, activity, or heart-zone charts.
- Trends must not query token state or call `/api/whoop/sync`.
- Preserve all three locales even if now-unused WHOOP strings remain for Profile.
- Follow red-green-refactor.

---

## File Structure

- `lib/trends/whoop-controls.test.ts` — source regression for removal and chart preservation.
- `app/[locale]/trends/page.tsx` — no credential query/import/render.
- `components/trends/WhoopStatus.tsx` — delete after its only consumer is removed.

### Task 1: Remove the Trends WHOOP Status Dependency

**Files:**
- Create: `lib/trends/whoop-controls.test.ts`
- Modify: `app/[locale]/trends/page.tsx`
- Delete: `components/trends/WhoopStatus.tsx`

**Interfaces:**
- Consumes: stored metrics already queried by Trends
- Produces: Trends with no connection/sync controls

- [ ] **Step 1: Write the failing regression test**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'app/[locale]/trends/page.tsx'), 'utf8')

describe('Trends WHOOP controls', () => {
  it('does not depend on WHOOP credential or sync UI', () => {
    expect(source).not.toContain('WhoopStatus')
    expect(source).not.toContain('whoop_access_token')
    expect(source).not.toContain('whoop_refresh_token')
    expect(source).not.toContain('whoop_token_expires')
    expect(source).not.toContain('/api/whoop/sync')
  })

  it('keeps stored recovery charts', () => {
    expect(source).toContain("t('charts.recovery')")
    expect(source).toContain("t('sections.hrvRhr')")
    expect(source).toContain("t('sections.sleep')")
  })
})
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run lib/trends/whoop-controls.test.ts`

Expected: FAIL on `WhoopStatus` and token fields.

- [ ] **Step 3: Remove only credential-state work**

In `app/[locale]/trends/page.tsx`:

- Remove the `WhoopStatus` import.
- Remove `profileResult` from `Promise.all`.
- Remove it from `queryError`.
- Remove `whoopConnected`, token-expiration, and reauthorization calculations.
- Remove the rendered `<WhoopStatus ... />`.

Keep the Recovery section label and every metric/chart beneath it.

- [ ] **Step 4: Delete the unused component**

Delete `components/trends/WhoopStatus.tsx`. Confirm `rg -n "WhoopStatus" . -g '!node_modules'` returns only the regression test.

- [ ] **Step 5: Verify focused and full suites**

Run: `npx vitest run lib/trends/whoop-controls.test.ts lib/trends/compute.test.ts lib/whoop-utils.test.ts && npm test && npx tsc --noEmit && npm run lint`

Expected: all commands PASS. WHOOP normalization tests remain green because ingestion was not removed.

- [ ] **Step 6: Manually verify**

Open Trends with stored recovery data and confirm charts render without a WHOOP card. Open a user with no recovery data and confirm the existing empty state renders. Open Profile and confirm its WHOOP controls still exist.

- [ ] **Step 7: Commit**

```bash
git add lib/trends/whoop-controls.test.ts app/[locale]/trends/page.tsx components/trends/WhoopStatus.tsx
git commit -m "fix: remove WHOOP sync controls from trends"
```
