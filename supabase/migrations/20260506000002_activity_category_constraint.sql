-- Extend activity_category check constraint to match ActivityCategory type in schema
alter table activities drop constraint if exists activities_activity_category_check;
alter table activities
  add constraint activities_activity_category_check
  check (activity_category in ('run', 'ride', 'strength', 'hiit', 'mobility', 'walk', 'swim', 'other'));
