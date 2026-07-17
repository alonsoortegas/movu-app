# Movu → iOS via Capacitor + native HealthKit pipeline

> Implementation plan for an AI coding agent (Codex). Follow phases in order; Phases 1→2→3 are pure web work and fully testable before touching Xcode. Do not modify `/api/apple-health/import` or the WHOOP pipeline. All decisions below are final — do not re-litigate them, but flag (don't silently work around) anything that contradicts the actual code.

## Context

Movu is a Next.js 16 (App Router, SSR) + Supabase web app deployed on Vercel. Health data currently arrives three ways: WHOOP OAuth sync (`lib/whoop/*`, `/api/whoop/*`), manual forms (registro → `/api/activities`, `/api/daily-log`), and an Apple Health **XML export** import (user uploads `export.xml` in Perfil, browser parses it via `lib/apple-health/parser-browser.ts`, posts to `/api/apple-health/import`). Goal: ship an iOS app so HealthKit feeds the same data **live and automatically**, replacing the XML dance while keeping WHOOP/manual/web pipelines intact.

**Decisions already made with the product owner:**
- **Capacitor wrapper** — WKWebView loading the deployed Next.js app via remote `server.url` (the app is SSR; static export would kill API routes). Web app keeps working unchanged.
- **Auto-sync on app open/foreground**, throttled to once per hour; no iOS background delivery in v1.
- **Data scope:** XML-parser parity (workouts, sleep stages, resting HR, HRV SDNN, respiratory rate, active+basal energy, exercise minutes, VO2max, physical effort) **plus step count and body weight**.

**Key seam to reuse:** `lib/apple-health/normalize.ts` maps `HKWorkout` / `HKSleepRecord` / `HKDailyRecord` (types in `lib/apple-health/parser.ts`) → `activities` / `sleep_logs` / `daily_metrics` rows. The Swift plugin emits exactly those JSON shapes, so the server reuses the normalize layer unchanged (plus one new `steps` field).

**Load-bearing conventions the Swift plugin MUST honor** (verified against `normalize.ts`):
- Dates are ISO 8601 **with local offset** (`2026-07-01T07:30:00-06:00`). `localWallClock()` strips the offset to derive `start_date_local`; sleep and daily records are bucketed by `startDate.slice(0,10)` = local date.
- `HKWorkout.duration` is in **minutes** (normalize does `duration * 60`).
- `activityType` strings are full `HKWorkoutActivityType*` enum names (must match `HK_CATEGORY_MAP` keys).
- Sleep values are the exact strings `HKCategoryValueSleepAnalysisAsleepREM | AsleepDeep | AsleepCore | Awake` (map `.asleepUnspecified` → `AsleepCore`, drop `.inBed`).

## Design decisions (final)

| Topic | Decision | Why |
|---|---|---|
| Endpoint | New `GET/POST /api/healthkit/sync`; leave `/api/apple-health/import` untouched | Incremental sync needs upsert semantics, not the import route's delete-range-then-insert; zero regression risk to web XML import. |
| Source value | Reuse `'apple_health'` | Already allowed by the source check constraints; no migration; UI/insights already understand it. |
| Activity dedupe | **Partial unique index** `(user_id, start_date_utc, activity_type) WHERE source='apple_health'` + SQL RPC for the upsert | A global index would break registro: manual entries all get `start_date_utc = <date>T12:00:00.000Z` (`app/api/activities/route.ts:25`), so two same-type manual workouts on one day would hit a 23505 unique violation. PostgREST `onConflict` cannot target partial indexes, hence the RPC. The RPC's `ON CONFLICT DO UPDATE` set excludes `rpe`, so user ratings survive re-syncs within the 48h overlap window. |
| Sync anchor | Server-side `user_profiles.healthkit_last_sync_at`; query window = `lastSync − 48h → now`; 90-day backfill on first sync | Survives app reinstalls (HKAnchoredObjectQuery anchors are device-local); upserts make the overlap idempotent. |
| Steps | HealthKit overwrites `daily_metrics.steps_count` for synced days | Device wins; manual entry (`/api/daily-log`) still works for unsynced days. |
| Weight | Update `user_profiles.weight_kg` to newest sample; insert weight-only `body_measurements` row per date **only if none exists for that date** | Keeps profile current without clobbering manual InBody entries. |
| `data_source` flag | Set to `'apple_health'` only if currently null or `'manual'` | Never hijack an active WHOOP connection. (The XML import route unconditionally overwrites; this difference is intentional.) |
| Auth in WKWebView | Nothing to build | Remote-URL mode makes the Vercel domain the first-party origin; Supabase SSR cookies work in WKWebView and persist across launches. |
| HealthKit bridge | Small custom app-local Swift plugin (`MovuHealthKit`, 3 methods); no community npm plugin | Needed types (physicalEffort, per-stage sleep, daily statistics buckets) aren't reliably covered by community plugins; emitting the parser JSON shape natively removes all web-side transformation. |
| Sync trigger | `HealthKitSyncManager` client component: sync on mount + `App.appStateChange`, 1h `localStorage` throttle, opt-in flag set by the Perfil connect card | Simple; no iOS background modes in v1. |

---

## Phase 0 — Repo hygiene (15 min)

Append to `.gitignore`:

```
# Capacitor / iOS
ios/App/Pods/
ios/App/App/public/
ios/App/output/
ios/**/xcuserdata/
ios/DerivedData/
```

(The giant sample `*.xml` exports in repo root are already covered by an existing `*.xml` rule and are untracked.)

## Phase 1 — DB migration (30 min)

Create `supabase/migrations/<timestamp>_healthkit_sync.sql`:

1. `alter table user_profiles add column if not exists healthkit_last_sync_at timestamptz;`
2. Dedupe existing `source='apple_health'` activities on `(user_id, start_date_utc, activity_type)`, keeping the newest row (by `created_at`, id as tiebreak).
3. ```sql
   create unique index if not exists activities_apple_health_natural_key
     on activities (user_id, start_date_utc, activity_type)
     where source = 'apple_health';
   ```
4. RPC `upsert_apple_health_activities(p_rows jsonb) returns int`:
   `insert into activities … select … from jsonb_to_recordset(p_rows) … on conflict (user_id, start_date_utc, activity_type) where source = 'apple_health' do update set` duration/calories/distance/category/name/muscle-groups/`start_date_local` — **never `rpe`**. Return affected row count.

Mirror the new column in `db/schema.ts` (also add the missing `data_source` field there — known drizzle drift), `types/database.ts`, and document in `docs/schema.md`.

## Phase 2 — Server route (half day)

- `lib/apple-health/parser.ts`: add optional `steps?: number` to `HKDailyRecord` (the XML parser simply never sets it).
- `lib/apple-health/normalize.ts`: in `normalizeDailyMetrics`, add `steps_count: s.steps !== undefined ? Math.round(s.steps) : undefined`. (Undefined values are stripped by supabase-js, so upserts leave existing manual steps untouched when absent.)
- Create `app/api/healthkit/sync/route.ts` — pattern-match `app/api/apple-health/import/route.ts` (auth via `createClient().auth.getUser()`, writes via `createAdminClient()`):

**GET** → `{ lastSyncAt: user_profiles.healthkit_last_sync_at, dataSource }`.

**POST** body:

```jsonc
{
  "workouts": [            // HKWorkout[] — parser.ts shape
    { "activityType": "HKWorkoutActivityTypeRunning",
      "startDate": "2026-07-01T07:30:00-06:00",   // ISO WITH local offset — load-bearing
      "endDate":   "2026-07-01T08:10:00-06:00",
      "duration": 40.0,                            // MINUTES
      "totalEnergyBurned": 412.3,                  // kcal
      "totalDistance": 6400.2,                     // metres
      "sourceName": "Apple Watch" }
  ],
  "sleepRecords": [
    { "value": "HKCategoryValueSleepAnalysisAsleepREM",
      "startDate": "2026-06-30T23:12:00-06:00",
      "endDate":   "2026-06-30T23:47:00-06:00" }
  ],
  "dailySummaries": {      // keyed by LOCAL date YYYY-MM-DD
    "2026-07-01": {
      "date": "2026-07-01",
      "restingHeartRate": 52, "hrv": 68.4, "respiratoryRate": 14.2,
      "activeEnergyKcal": 612, "basalEnergyKcal": 1710, "exerciseMinutes": 44,
      "vo2Max": 46.1, "physicalEffort": 5.2,
      "steps": 10432
    }
  },
  "weightSamples": [ { "date": "2026-07-01", "weightKg": 71.4 } ],
  "syncedThrough": "2026-07-04T09:00:00.000Z"
}
```

Handler steps:
1. Activities: `normalizeWorkouts()` → ISO-stringify the Date fields (same mapping as import route) → `admin.rpc('upsert_apple_health_activities', { p_rows })`.
2. Sleep / daily metrics: `normalizeSleep()` / `normalizeDailyMetrics()` → upsert `onConflict: 'user_id,date'` (identical pattern to the import route).
3. Weight: for each sample date, insert into `body_measurements` (`notes: 'Apple Health'`) only if no row exists for that date; update `user_profiles.weight_kg` from the newest sample.
4. Profile: `healthkit_last_sync_at = syncedThrough`; `data_source = 'apple_health'` only if currently null/`'manual'` (read first).
5. Return `{ synced: { activities, sleep, daily_metrics, weight_samples }, lastSyncAt }`.

## Phase 3 — Web client (1 day)

- Deps: `npm i @capacitor/core @capacitor/app` and `npm i -D @capacitor/cli @capacitor/ios`. (`Capacitor.isNativePlatform()` is safely `false` in browsers; in remote-URL mode the native runtime injects the bridge into the loaded page.)
- `lib/healthkit/plugin.ts`:

```ts
import { registerPlugin } from '@capacitor/core'
import type { HKWorkout, HKSleepRecord, HKDailyRecord } from '@/lib/apple-health/parser'

export interface HealthKitQueryResult {
  workouts: HKWorkout[]
  sleepRecords: HKSleepRecord[]
  dailySummaries: Record<string, HKDailyRecord>
  weightSamples: { date: string; weightKg: number }[]
}
export interface MovuHealthKitPlugin {
  isAvailable(): Promise<{ available: boolean }>
  requestAuthorization(): Promise<{ requested: boolean }>
  queryHealthData(opts: { startDate: string; endDate: string }): Promise<HealthKitQueryResult>
}
export const MovuHealthKit = registerPlugin<MovuHealthKitPlugin>('MovuHealthKit')
```

- `lib/healthkit/sync.ts` — `runHealthKitSync({ force = false })`:
  1. Bail unless `Capacitor.isNativePlatform()` and platform `'ios'`.
  2. Bail unless `localStorage.movu_hk_enabled === '1'` (opt-in, set by Perfil connect).
  3. Throttle: skip if last attempt < 1h ago and not `force`.
  4. `GET /api/healthkit/sync` → window: `start = lastSyncAt ? lastSyncAt − 48h : now − 90d`, `end = now`.
  5. `MovuHealthKit.queryHealthData(...)` → POST result + `syncedThrough: end`.
  6. Record attempt timestamp; return counts for UI.
- `components/HealthKitSyncManager.tsx` (`"use client"`, renders null): on mount run sync and register `App.addListener('appStateChange', ({isActive}) => isActive && runHealthKitSync())` (dynamic-import `@capacitor/app`); cleanup on unmount. Mount it in `app/[locale]/layout.tsx`.
- `app/[locale]/perfil/page.tsx`: "Apple Health" card rendered only when native (set a state in `useEffect` to avoid hydration mismatch): Connect button → `requestAuthorization()` → set enabled flag → `runHealthKitSync({force:true})`; show last-synced time, "Sync now" button, syncing/error states. Hide the XML-import UI when native.
- i18n: add `healthkit.*` keys (title, description, connect, syncNow, lastSynced, syncing, error) to `messages/es.json`, `en.json`, `de.json`.
- Native polish: add a `viewport` export (`viewportFit: 'cover'`) to `app/[locale]/layout.tsx`; add `pb-[env(safe-area-inset-bottom)]` to `components/BottomNav.tsx`.

## Phase 4 — Capacitor scaffold + Xcode config (half day)

1. `capacitor/www/index.html` — minimal "Loading Movu…" stub (`cap sync` requires a webDir even in remote mode). Commit it.
2. `capacitor.config.ts` at repo root:

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const devUrl = process.env.CAP_SERVER_URL // e.g. http://192.168.1.50:3000
const config: CapacitorConfig = {
  appId: 'app.movu.ios',
  appName: 'Movu',
  webDir: 'capacitor/www',
  server: devUrl
    ? { url: devUrl, cleartext: true }
    : { url: 'https://<prod-vercel-domain>', cleartext: false },
  ios: { contentInset: 'automatic' },
}
export default config
```

Dev loop: `CAP_SERVER_URL=http://localhost:3000 npx cap sync ios` (Simulator; a physical device needs the Mac's LAN IP). Prod: plain `npx cap sync ios`.
3. `npx cap add ios` (requires CocoaPods). Commit `ios/` minus the ignored paths.
4. Xcode (`npx cap open ios`): add the **HealthKit capability** (creates the entitlement; do NOT enable Clinical Health Records); add `NSHealthShareUsageDescription` to `Info.plist` (read-only integration — no `NSHealthUpdateUsageDescription`).

**App Store note:** remote-URL webview apps carry guideline 4.2 (minimum functionality) risk. HealthKit is the genuine native functionality mitigating it; safe-area polish and no browser chrome help. Flag honestly at submission.

## Phase 5 — Custom Swift plugin (1–1.5 days)

Create `ios/App/App/HealthKit/MovuHealthKitPlugin.swift` + `MovuHealthKitPlugin.m` (the `.m` holds the `CAP_PLUGIN(MovuHealthKitPlugin, "MovuHealthKit", …)` macro registering `isAvailable`, `requestAuthorization`, `queryHealthData` as `CAPPluginReturnPromise`). Add both to the App target.

**Authorization read set:**

```
HKObjectType.workoutType()
HKCategoryTypeIdentifier.sleepAnalysis
HKQuantityTypeIdentifier.restingHeartRate          // daily avg → restingHeartRate (bpm)
HKQuantityTypeIdentifier.heartRateVariabilitySDNN  // daily avg → hrv (ms)
HKQuantityTypeIdentifier.respiratoryRate           // daily avg → respiratoryRate
HKQuantityTypeIdentifier.activeEnergyBurned        // daily sum → activeEnergyKcal
HKQuantityTypeIdentifier.basalEnergyBurned         // daily sum → basalEnergyKcal
HKQuantityTypeIdentifier.appleExerciseTime         // daily sum → exerciseMinutes
HKQuantityTypeIdentifier.vo2Max                    // latest per day → vo2Max
HKQuantityTypeIdentifier.physicalEffort            // iOS 17+, guard #available; daily avg
HKQuantityTypeIdentifier.stepCount                 // daily sum → steps
HKQuantityTypeIdentifier.bodyMass                  // latest per day → weightSamples (kg)
```

`requestAuthorization`: `healthStore.requestAuthorization(toShare: nil, read: <set>)`; resolve `{requested: true}` on completion — HealthKit hides read-denial status by design; queries on denied types just return empty.

**`queryHealthData(startDate, endDate)`:**
- **Workouts**: `HKSampleQuery` on `workoutType()`. Emit `activityType` as `"HKWorkoutActivityType" + enum-case-name` (must match the XML export naming). `duration = workout.duration / 60` (**minutes**). Energy via `workout.statistics(for: activeEnergyBurned)?.sumQuantity()` (fallback to deprecated `totalEnergyBurned` pre-iOS 16). Distance in metres. Dates via `ISO8601DateFormatter` configured for the **local timezone with offset** — this format is load-bearing for `start_date_local`.
- **Sleep**: `HKSampleQuery` on `sleepAnalysis`; map the enum to the four exact value strings; same local-offset ISO dates.
- **Daily summaries**: one `HKStatisticsCollectionQuery` per quantity type, daily interval anchored at local midnight — `.cumulativeSum` for activeEnergyBurned/basalEnergyBurned/appleExerciseTime/stepCount; `.discreteAverage` for HRV/respiratoryRate/restingHeartRate/physicalEffort; vo2Max via `HKSampleQuery` keeping the last sample per day. Merge into `Record<localDate, HKDailyRecord>`.
- **bodyMass**: `HKSampleQuery`, latest sample per local date, unit kg → `weightSamples`.
- Run queries concurrently (async/await + `withCheckedContinuation`), resolve a single JSON payload matching the Phase 2 shape.

## Phase 6 — Verification

1. **Web regression**: `npm run build` + existing tests pass; perfil XML import and WHOOP sync still work in a browser; no HealthKit card appears on web; registro can still log **two same-type workouts on the same day** (proves the partial index doesn't bite manual rows).
2. **Migration**: apply on a Supabase branch first; check dedupe count and index creation; re-run an XML import to confirm it coexists with the new index.
3. **Endpoint idempotency** (curl as an authenticated user): POST a fixture payload (2 workouts, 1 night of sleep, 2 dailySummaries incl. steps, 1 weightSample) twice → identical row counts, no duplicates, `steps_count` set, exactly one Apple Health `body_measurements` row, `weight_kg` and `healthkit_last_sync_at` updated. Set an `rpe` on a synced activity, re-POST → rpe survives.
4. **Simulator e2e**: `npm run dev` → `CAP_SERVER_URL=http://localhost:3000 npx cap sync ios` → run in Simulator → add sample data in the Simulator's Health app → log in (verify the cookie session survives app kill/relaunch) → Perfil → Connect Apple Health → grant → confirm rows in `activities` (source=apple_health), `sleep_logs`, `daily_metrics`.
5. **Foreground re-sync**: verify the 1h throttle and the `lastSyncAt − 48h` incremental window; verify a WHOOP-connected account keeps `data_source='whoop'`.
6. **Device test** against the prod Vercel URL before TestFlight.

## Sequencing

Phases 1 → 2 → 3 are pure web work, shippable and curl-testable before any Xcode involvement. Phases 4 → 5 are iOS-only. Phase 0 anytime. Estimate: ~4–5 dev days.

## File manifest

**Create:** `supabase/migrations/<ts>_healthkit_sync.sql` · `app/api/healthkit/sync/route.ts` · `lib/healthkit/plugin.ts` · `lib/healthkit/sync.ts` · `components/HealthKitSyncManager.tsx` · `capacitor.config.ts` · `capacitor/www/index.html` · `ios/` (generated) + `ios/App/App/HealthKit/MovuHealthKitPlugin.swift|.m`

**Modify:** `lib/apple-health/parser.ts` · `lib/apple-health/normalize.ts` · `app/[locale]/perfil/page.tsx` · `app/[locale]/layout.tsx` · `components/BottomNav.tsx` · `db/schema.ts` · `types/database.ts` · `docs/schema.md` · `messages/{es,en,de}.json` · `.gitignore` · `package.json`
