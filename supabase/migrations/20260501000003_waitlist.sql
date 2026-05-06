create table waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  name        text,
  city        text,
  goal        text check (goal in ('lose_weight', 'build_muscle', 'compete', 'habits')),
  referred_by text references invite_codes(code),
  position    int generated always as identity,
  status      text default 'waiting' check (status in ('waiting', 'invited', 'converted')),
  invited_at  timestamptz,
  created_at  timestamptz default now()
);

alter table waitlist enable row level security;

-- Anyone can join the waitlist (public form)
create policy "public_insert" on waitlist
  for insert with check (true);
