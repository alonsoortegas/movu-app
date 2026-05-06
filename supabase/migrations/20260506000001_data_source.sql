alter table user_profiles
  add column if not exists data_source text
    check (data_source in ('whoop', 'apple_health', 'strava', 'manual'));
