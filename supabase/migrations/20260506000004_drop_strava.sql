-- Remove all Strava-specific columns and constraints

-- Drop strava token columns from user_profiles
alter table user_profiles
  drop column if exists strava_athlete_id,
  drop column if exists strava_access_token,
  drop column if exists strava_refresh_token,
  drop column if exists strava_token_expires;

-- Drop strava_id column and its index from activities
drop index if exists activities_strava_id;
alter table activities drop column if exists strava_id;

-- Reset activities.source default to 'manual'
alter table activities alter column source set default 'manual';

-- Update data_source check constraint on user_profiles (remove 'strava')
alter table user_profiles
  drop constraint if exists user_profiles_data_source_check;
alter table user_profiles
  add constraint user_profiles_data_source_check
  check (data_source in ('whoop', 'apple_health', 'manual'));

-- Update source check constraint on activities (remove 'strava')
alter table activities
  drop constraint if exists activities_source_check;
alter table activities
  add constraint activities_source_check
  check (source in ('whoop', 'apple_health', 'manual'));
