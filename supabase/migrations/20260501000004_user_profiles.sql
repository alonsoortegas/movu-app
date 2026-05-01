create table user_profiles (
  id                   uuid references auth.users primary key,
  full_name            text,
  city                 text,
  goal                 text,
  max_hr_bpm           int default 185,
  weight_kg            numeric,
  strava_athlete_id    bigint,
  strava_access_token  text,
  strava_refresh_token text,
  strava_token_expires timestamptz,
  invite_code_used     text references invite_codes(code),
  onboarding_complete  boolean default false,
  created_at           timestamptz default now()
);

alter table user_profiles enable row level security;

create policy "own_profile" on user_profiles
  for all using (auth.uid() = id);
