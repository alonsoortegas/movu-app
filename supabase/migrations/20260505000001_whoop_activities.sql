-- user_profiles: WHOOP OAuth tokens + body data from /v2/user/measurement/body
alter table user_profiles
  add column if not exists whoop_user_id       bigint,
  add column if not exists whoop_access_token  text,
  add column if not exists whoop_refresh_token text,
  add column if not exists whoop_token_expires timestamptz,
  add column if not exists height_m            numeric;

-- activities: WHOOP-specific columns
alter table activities
  add column if not exists whoop_activity_id uuid unique,
  add column if not exists strain             numeric,
  add column if not exists calories_kcal      numeric,
  add column if not exists timezone           text;

create index activities_whoop_id on activities (whoop_activity_id);
