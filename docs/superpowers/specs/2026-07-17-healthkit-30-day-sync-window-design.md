# HealthKit 30-Day Sync Window

## Goal

Reduce Apple Health sync time by limiting every native HealthKit query to at most 30 days while preserving a short overlap for late-arriving or corrected health data.

## Window policy

- First sync: query from `now - 30 days` through `now`.
- Incremental sync: query from `lastSyncAt - 48 hours` through `now`.
- Hard ceiling: the incremental start must never be earlier than `now - 30 days`.
- Invalid or missing `lastSyncAt` is treated as a first sync.

In formula form:

```text
floor = now - 30 days
candidate = valid lastSyncAt ? lastSyncAt - 48 hours : floor
start = max(candidate, floor)
end = now
```

## Implementation

Keep the policy in `lib/healthkit/sync.ts`. Replace the 90-day first-sync constant with a 30-day maximum and clamp the existing 48-hour overlap against that maximum. The native Swift plugin and Supabase API contract remain unchanged.

## Tests

Extend `lib/healthkit/sync.test.ts` to verify:

1. A first sync queries exactly 30 days.
2. A recent cursor queries from `lastSyncAt - 48 hours`.
3. A stale cursor is clamped to 30 days.
4. Existing native-platform, enablement, throttling, and payload behavior remains unchanged.

## Deployment

This is a web-bundle change served by Vercel. It requires a production deployment but no database migration and no new native iOS binary.
