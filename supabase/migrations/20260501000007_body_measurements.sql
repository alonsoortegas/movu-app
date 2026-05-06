create table body_measurements (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users not null,
  measured_at      date not null,
  weight_kg        numeric,
  muscle_mass_kg   numeric,
  fat_mass_kg      numeric,
  fat_percentage   numeric,
  muscle_left_arm  numeric,
  muscle_right_arm numeric,
  muscle_left_leg  numeric,
  muscle_right_leg numeric,
  muscle_trunk     numeric,
  notes            text,
  created_at       timestamptz default now()
);

alter table body_measurements enable row level security;

create policy "own_measurements" on body_measurements
  for all using (auth.uid() = user_id);

create index body_user_date on body_measurements (user_id, measured_at desc);
