alter table activities
  add column if not exists coach_name text;

alter table daily_metrics
  add column if not exists steps_count int;
