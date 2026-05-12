# Movu — System Architecture

## High-level overview

```mermaid
graph TB
    subgraph Client["Browser / Mobile Web"]
        UI[Next.js Frontend\nApp Router]
    end

    subgraph Vercel["Vercel (Next.js host)"]
        MW[Middleware\nSession refresh + auth gating]
        API[API Routes\n/api/*]
    end

    subgraph Supabase["Supabase"]
        AUTH[Auth\nMagic link · Google OAuth]
        DB[(Postgres\nRLS on all tables)]
        EF[Edge Functions\nDeno runtime]
    end

    subgraph External["External Services"]
        WHOOP[WHOOP API\nOAuth + REST sync]
        CLAUDE[Claude API\nclaude-sonnet-4-20250514]
        RESEND[Resend\nTransactional email]
    end

    UI -->|every request| MW
    MW -->|session cookie| AUTH
    UI -->|data fetches| API
    API -->|anon / service_role| DB
    API -->|OAuth exchange| WHOOP
    EF -->|service_role| DB
    EF -->|generate insight| CLAUDE
    EF -->|send email| RESEND
```

---

## Request flow — authenticated page

```mermaid
sequenceDiagram
    participant Browser
    participant Middleware
    participant NextAPI as Next.js API Route
    participant SupabaseAuth as Supabase Auth
    participant Postgres

    Browser->>Middleware: GET /dashboard (cookie)
    Middleware->>SupabaseAuth: getUser(cookie)
    SupabaseAuth-->>Middleware: user | null
    alt not authenticated
        Middleware-->>Browser: redirect /login
    end
    Middleware-->>Browser: 200 (refreshed cookie)
    Browser->>NextAPI: GET /api/dashboard
    NextAPI->>SupabaseAuth: getUser(cookie)
    SupabaseAuth-->>NextAPI: user
    NextAPI->>Postgres: SELECT (RLS: user_id = auth.uid())
    Postgres-->>NextAPI: rows
    NextAPI-->>Browser: JSON
```

---

## Invite code + signup flow

```mermaid
sequenceDiagram
    participant User
    participant SignupPage as /signup?code=XXX
    participant ValidateInvite as Edge Fn: validate-invite
    participant SupabaseAuth as Supabase Auth
    participant DBTrigger as DB Trigger: on_auth_user_created
    participant Postgres

    User->>SignupPage: arrives with code in URL
    SignupPage->>ValidateInvite: POST {code}
    ValidateInvite->>Postgres: SELECT invite_codes WHERE code = ?
    alt invalid / expired / used up
        ValidateInvite-->>SignupPage: {valid: false, reason}
        SignupPage-->>User: show error
    end
    ValidateInvite-->>SignupPage: {valid: true}
    User->>SupabaseAuth: signUp(email, password, {invite_code})
    SupabaseAuth->>DBTrigger: AFTER INSERT on auth.users
    DBTrigger->>Postgres: INSERT user_profiles
    DBTrigger->>Postgres: UPDATE invite_codes SET uses_count + 1
    DBTrigger->>Postgres: UPDATE waitlist SET status='converted' (if email matches)
    SupabaseAuth-->>User: confirmation email
```

---

## Weekly coaching insight generation

```mermaid
sequenceDiagram
    participant Cron as pg_cron (Mon 07:00 UTC)
    participant GenerateFn as Edge Fn: generate-insight
    participant Postgres
    participant ClaudeAPI as Claude API

    Cron->>GenerateFn: POST {trigger: "cron"}
    GenerateFn->>Postgres: SELECT user_profiles WHERE onboarding_complete = true
    loop for each user
        GenerateFn->>Postgres: SELECT activities (last 7 days)
        GenerateFn->>Postgres: SELECT sleep_logs (last 7 days)
        GenerateFn->>Postgres: SELECT body_measurements (latest)
        GenerateFn->>ClaudeAPI: messages.create (system prompt + JSON context)
        ClaudeAPI-->>GenerateFn: markdown coaching text
        GenerateFn->>Postgres: INSERT insights
    end
    GenerateFn-->>Cron: {processed: N, succeeded: N}
```

---

## Database schema

```mermaid
erDiagram
    auth_users {
        uuid id PK
        text email
    }

    invite_codes {
        uuid id PK
        text code UK
        uuid created_by FK
        int max_uses
        int uses_count
        timestamptz expires_at
        boolean active
        text note
    }

    waitlist {
        uuid id PK
        text email UK
        text name
        text city
        text goal
        text referred_by FK
        int position
        text status
        timestamptz invited_at
    }

    user_profiles {
        uuid id PK_FK
        text full_name
        text city
        text goal
        int max_hr_bpm
        numeric weight_kg
        text invite_code_used FK
        boolean onboarding_complete
    }

    activities {
        uuid id PK
        uuid user_id FK
        text source
        text activity_type
        text activity_category
        text activity_name
        timestamptz start_date_utc
        int moving_time_s
        numeric distance_m
        int avg_hr_bpm
        int rpe
        text[] inferred_muscle_groups
        jsonb hr_zones
    }

    sleep_logs {
        uuid id PK
        uuid user_id FK
        date date
        numeric hours
        int quality
        text source
    }

    body_measurements {
        uuid id PK
        uuid user_id FK
        date measured_at
        numeric weight_kg
        numeric muscle_mass_kg
        numeric fat_percentage
    }

    insights {
        uuid id PK
        uuid user_id FK
        date period_start
        date period_end
        text type
        text content
        text model_used
    }

    auth_users ||--o| user_profiles : "extends"
    auth_users ||--o{ activities : "owns"
    auth_users ||--o{ sleep_logs : "owns"
    auth_users ||--o{ body_measurements : "owns"
    auth_users ||--o{ insights : "owns"
    invite_codes ||--o{ waitlist : "referred_by"
    invite_codes ||--o{ user_profiles : "invite_code_used"
```

---

## Folder structure

```
movu/
├── app/
│   ├── api/
│   │   ├── me/                      GET  user profile
│   │   ├── activities/              GET  paginated list + zone summary
│   │   │   └── [id]/rpe/            POST submit RPE
│   │   ├── insights/latest/         GET  most recent insight
│   │   ├── dashboard/               GET  weekly aggregated stats
│   │   ├── waitlist/                POST join waitlist (public)
│   │   └── auth/callback/           GET  Supabase auth redirect
│   ├── (auth)/
│   │   ├── signup/                  Invite-gated signup
│   │   └── login/                   Login
│   ├── dashboard/                   Weekly training view
│   ├── admin/                       Waitlist + invite code management
│   └── waitlist/                    Public waitlist landing page
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                Browser client
│   │   ├── server.ts                Server client (cookie-based)
│   │   └── admin.ts                 Service-role client
│   └── claude/
│       ├── prompts.ts               Spanish coaching system prompt
│       └── insights.ts              Claude API call
│
├── supabase/
│   ├── migrations/                  9 SQL files, run in order
│   ├── functions/
│   │   ├── _shared/                 cors.ts, supabase-admin.ts
│   │   ├── validate-invite/         Check invite code before signup
│   │   ├── generate-insight/        Weekly Claude coaching call
│   │   ├── create-invite-code/      Admin: generate new codes
│   │   └── send-waitlist-email/     Resend confirmation email
│   └── seed.sql                     5 invite codes, 10 waitlist entries
│
├── types/
│   └── database.ts                  Typed schema for supabase-js generics
│
└── proxy.ts                         Session refresh + route gating
```

---

## Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Public — safe in browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Public — RLS enforces access |
| `SUPABASE_SERVICE_ROLE_KEY` | API routes + Edge Functions | **Never expose client-side** |
| `ANTHROPIC_API_KEY` | Edge Function: generate-insight | Claude API |
| `RESEND_API_KEY` | Edge Function: send-waitlist-email | Optional — emails skip if missing |
| `ADMIN_USER_IDS` | /admin page | Comma-separated Supabase UUIDs |
