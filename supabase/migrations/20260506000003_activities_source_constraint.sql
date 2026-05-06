alter table activities drop constraint if exists activities_source_check;
alter table activities
  add constraint activities_source_check
  check (source in ('strava', 'whoop', 'apple_health', 'manual'));
