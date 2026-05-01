create table activities (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users not null,
  strava_id             bigint unique,
  source                text default 'strava',
  activity_type         text,
  activity_category     text check (activity_category in ('run', 'strength', 'hiit', 'mobility', 'other')),
  activity_name         text,
  start_date_utc        timestamptz,
  start_date_local      timestamptz,
  moving_time_s         int,
  elapsed_time_s        int,
  distance_m            numeric,
  elevation_gain_m      numeric,
  avg_hr_bpm            int,
  max_hr_bpm            int,
  avg_pace_per_km_s     int,
  avg_cadence_spm       int,
  rpe                   int check (rpe between 1 and 10),
  inferred_muscle_groups text[],
  hr_zones              jsonb,
  trainer               boolean,
  created_at            timestamptz default now()
);

alter table activities enable row level security;

create policy "own_activities" on activities
  for all using (auth.uid() = user_id);

create index activities_user_date     on activities (user_id, start_date_utc desc);
create index activities_user_category on activities (user_id, activity_category);
create index activities_strava_id     on activities (strava_id);
