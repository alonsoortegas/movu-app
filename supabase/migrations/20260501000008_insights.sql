create table insights (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  period_start date,
  period_end   date,
  type         text check (type in ('weekly_summary', 'recovery_alert', 'plan_suggestion')),
  content      text,
  model_used   text,
  created_at   timestamptz default now()
);

alter table insights enable row level security;

create policy "own_insights" on insights
  for all using (auth.uid() = user_id);

create index insights_user_date on insights (user_id, created_at desc);
