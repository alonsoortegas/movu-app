create table sleep_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  date       date not null,
  hours      numeric,
  quality    int check (quality between 1 and 5),
  source     text default 'manual',
  notes      text,
  created_at timestamptz default now(),
  unique (user_id, date)
);

alter table sleep_logs enable row level security;

create policy "own_sleep" on sleep_logs
  for all using (auth.uid() = user_id);

create index sleep_user_date on sleep_logs (user_id, date desc);
