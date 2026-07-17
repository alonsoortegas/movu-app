-- lifeos port: user-authored workout plans + set logs, nutrition catalog +
-- logging, and training phases. All tables owner-scoped via RLS.

-- ── Workout ──────────────────────────────────────────────────────────────────

create table workout_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references user_profiles (id) on delete cascade,
  name        text not null,
  start_date  date not null,
  weeks       int not null check (weeks between 1 and 52),
  active      boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now()
);

create table workout_plan_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references user_profiles (id) on delete cascade,
  plan_id       uuid not null references workout_plans (id) on delete cascade,
  week_number   int not null check (week_number between 1 and 52),
  day_of_week   text not null check (day_of_week in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  title         text not null,
  session_type  text not null default 'strength' check (session_type in ('strength','activation','cardio','other')),
  notes         text,
  created_at    timestamptz not null default now()
);

create table workout_plan_exercises (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references user_profiles (id) on delete cascade,
  session_id           uuid not null references workout_plan_sessions (id) on delete cascade,
  order_index          int not null default 0,
  exercise_name        text not null,
  prescribed_sets      int,
  prescribed_reps      text,
  prescribed_weight_kg numeric(6,2),
  target_rpe           text,
  superset_group       int,
  rest_seconds         int,
  is_isometric         boolean not null default false,
  notes                text,
  created_at           timestamptz not null default now()
);

create table workout_set_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references user_profiles (id) on delete cascade,
  exercise_id   uuid references workout_plan_exercises (id) on delete set null,
  exercise_name text not null,
  set_number    int,
  weight_kg     numeric(6,2),
  reps          int,
  rpe           numeric(3,1),
  notes         text,
  logged_at     timestamptz not null default now()
);

-- ── Nutrition ────────────────────────────────────────────────────────────────

create table food_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references user_profiles (id) on delete cascade,
  name           text not null,
  category       text not null check (category in ('protein','carb','fat','mixed','veg')),
  portion_label  text not null,
  grams          numeric(7,1),
  calories       int not null default 0,
  protein_g      numeric(6,1) not null default 0,
  carbs_g        numeric(6,1) not null default 0,
  fat_g          numeric(6,1) not null default 0,
  tracking_unit  text not null default 'grams' check (tracking_unit in ('piece','cup','grams','scoop','slice')),
  notes          text,
  created_at     timestamptz not null default now(),
  unique (user_id, name)
);

create table saved_food_portions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references user_profiles (id) on delete cascade,
  normalized_name  text not null,
  name             text not null,
  calories         int not null default 0,
  protein_g        numeric(6,1) not null default 0,
  carbs_g          numeric(6,1) not null default 0,
  fat_g            numeric(6,1) not null default 0,
  created_at       timestamptz not null default now(),
  unique (user_id, normalized_name)
);

create table food_substitution_groups (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references user_profiles (id) on delete cascade,
  name            text not null,
  macro_type      text not null check (macro_type in ('carb','protein')),
  target_macro_g  numeric(6,1) not null,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (user_id, name)
);

create table food_substitution_group_items (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references food_substitution_groups (id) on delete cascade,
  food_item_id  uuid not null references food_items (id) on delete cascade,
  quantity      numeric(7,2) not null default 1,
  label         text not null,
  created_at    timestamptz not null default now()
);

create table nutrition_targets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references user_profiles (id) on delete cascade,
  day_type         text not null check (day_type in ('hard','moderate','rest')),
  calories_target  int not null,
  protein_target   int not null,
  carbs_target     int not null,
  fat_target       int not null,
  created_at       timestamptz not null default now(),
  unique (user_id, day_type)
);

create table nutrition_days (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references user_profiles (id) on delete cascade,
  date        date not null,
  day_type    text not null check (day_type in ('hard','moderate','rest')),
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);

create table meal_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references user_profiles (id) on delete cascade,
  date        date not null,
  meal_name   text not null check (meal_name in ('breakfast','midday','pre_workout','post_workout','dinner','snack')),
  logged_at   timestamptz not null default now(),
  notes       text
);

create table meal_log_items (
  id            uuid primary key default gen_random_uuid(),
  meal_log_id   uuid not null references meal_logs (id) on delete cascade,
  food_item_id  uuid references food_items (id) on delete set null,
  name          text not null,
  quantity      numeric(7,2) not null default 1,
  calories      int not null default 0,
  protein_g     numeric(6,1) not null default 0,
  carbs_g       numeric(6,1) not null default 0,
  fat_g         numeric(6,1) not null default 0,
  created_at    timestamptz not null default now()
);

-- ── Trends ───────────────────────────────────────────────────────────────────

create table training_phases (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references user_profiles (id) on delete cascade,
  kind                     text not null check (kind in ('bulk','cut','maintenance')),
  start_date               date not null,
  end_date                 date,
  target_rate_kg_per_week  numeric(4,2),
  created_at               timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index workout_plans_user_active        on workout_plans (user_id, active);
create index workout_plan_sessions_plan_week  on workout_plan_sessions (plan_id, week_number);
create index workout_plan_exercises_session   on workout_plan_exercises (session_id, order_index);
create index workout_set_logs_user_logged     on workout_set_logs (user_id, logged_at desc);
create index workout_set_logs_exercise        on workout_set_logs (exercise_id);
create index food_items_user                  on food_items (user_id);
create index saved_food_portions_user         on saved_food_portions (user_id);
create index food_sub_group_items_group       on food_substitution_group_items (group_id);
create index food_sub_group_items_food        on food_substitution_group_items (food_item_id);
create index nutrition_days_user_date         on nutrition_days (user_id, date desc);
create index meal_logs_user_date              on meal_logs (user_id, date desc);
create index meal_log_items_log               on meal_log_items (meal_log_id);
create index training_phases_user_start       on training_phases (user_id, start_date desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table workout_plans                 enable row level security;
alter table workout_plan_sessions        enable row level security;
alter table workout_plan_exercises       enable row level security;
alter table workout_set_logs             enable row level security;
alter table food_items                   enable row level security;
alter table saved_food_portions          enable row level security;
alter table food_substitution_groups     enable row level security;
alter table food_substitution_group_items enable row level security;
alter table nutrition_targets            enable row level security;
alter table nutrition_days               enable row level security;
alter table meal_logs                    enable row level security;
alter table meal_log_items               enable row level security;
alter table training_phases              enable row level security;

create policy "own_workout_plans" on workout_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_workout_plan_sessions" on workout_plan_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_workout_plan_exercises" on workout_plan_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_workout_set_logs" on workout_set_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_food_items" on food_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_saved_food_portions" on saved_food_portions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_food_substitution_groups" on food_substitution_groups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Child rows are owned through their parent group.
create policy "own_food_substitution_group_items" on food_substitution_group_items
  for all using (
    exists (
      select 1 from food_substitution_groups g
      where g.id = group_id and g.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from food_substitution_groups g
      where g.id = group_id and g.user_id = auth.uid()
    )
  );

create policy "own_nutrition_targets" on nutrition_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_nutrition_days" on nutrition_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_meal_logs" on meal_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Child rows are owned through their parent meal log.
create policy "own_meal_log_items" on meal_log_items
  for all using (
    exists (
      select 1 from meal_logs m
      where m.id = meal_log_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from meal_logs m
      where m.id = meal_log_id and m.user_id = auth.uid()
    )
  );

create policy "own_training_phases" on training_phases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Data API grants (kept explicit, matching 20260513105053) ─────────────────

grant select, insert, update, delete on table
  public.workout_plans,
  public.workout_plan_sessions,
  public.workout_plan_exercises,
  public.workout_set_logs,
  public.food_items,
  public.saved_food_portions,
  public.food_substitution_groups,
  public.food_substitution_group_items,
  public.nutrition_targets,
  public.nutrition_days,
  public.meal_logs,
  public.meal_log_items,
  public.training_phases
to authenticated;

grant select, insert, update, delete on table
  public.workout_plans,
  public.workout_plan_sessions,
  public.workout_plan_exercises,
  public.workout_set_logs,
  public.food_items,
  public.saved_food_portions,
  public.food_substitution_groups,
  public.food_substitution_group_items,
  public.nutrition_targets,
  public.nutrition_days,
  public.meal_logs,
  public.meal_log_items,
  public.training_phases
to service_role;
