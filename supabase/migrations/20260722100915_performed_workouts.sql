-- Canonical performed-workout layer. Planned sessions, manual classes, and
-- wearable activities can now converge on one workout occurrence and set log.

alter table public.workout_plan_sessions
  add constraint workout_plan_sessions_id_user_unique unique (id, user_id);

alter table public.activities
  add constraint activities_id_user_unique unique (id, user_id);

create table public.exercise_catalog (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references public.user_profiles (id) on delete cascade,
  slug                     text not null,
  name_es                  text not null,
  name_en                  text not null,
  name_de                  text not null,
  primary_muscle_group     text,
  secondary_muscle_groups text[] not null default '{}',
  workout_types            text[] not null default '{}',
  default_tracking         text not null default 'reps'
    check (default_tracking in ('reps', 'time', 'distance')),
  active                   boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index exercise_catalog_system_slug_unique
  on public.exercise_catalog (slug)
  where user_id is null;

create unique index exercise_catalog_user_slug_unique
  on public.exercise_catalog (user_id, slug)
  where user_id is not null;

create table public.performed_workouts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.user_profiles (id) on delete cascade,
  plan_session_id  uuid,
  activity_id      uuid,
  origin           text not null
    check (origin in ('planned', 'manual', 'whoop', 'apple_health')),
  title            text not null check (length(btrim(title)) > 0),
  workout_type     text not null check (length(btrim(workout_type)) > 0),
  performed_on     date not null,
  started_at       timestamptz not null,
  ended_at         timestamptz,
  duration_min     int check (duration_min is null or duration_min >= 0),
  notes            text,
  status           text not null default 'draft'
    check (status in ('draft', 'in_progress', 'completed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint performed_workouts_id_user_unique unique (id, user_id),
  constraint performed_workouts_plan_owner_fk
    foreign key (plan_session_id, user_id)
    references public.workout_plan_sessions (id, user_id) on delete set null (plan_session_id),
  constraint performed_workouts_activity_owner_fk
    foreign key (activity_id, user_id)
    references public.activities (id, user_id) on delete set null (activity_id),
  constraint performed_workouts_planned_origin_check
    check (origin <> 'planned' or plan_session_id is not null),
  constraint performed_workouts_completed_check
    check (status <> 'completed' or ended_at is not null),
  constraint performed_workouts_time_order_check
    check (ended_at is null or ended_at >= started_at)
);

create unique index performed_workouts_plan_occurrence_unique
  on public.performed_workouts (user_id, plan_session_id, performed_on)
  where plan_session_id is not null;

create unique index performed_workouts_activity_unique
  on public.performed_workouts (user_id, activity_id)
  where activity_id is not null;

create table public.performed_workout_exercises (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.user_profiles (id) on delete cascade,
  performed_workout_id  uuid not null,
  catalog_exercise_id   uuid references public.exercise_catalog (id) on delete set null,
  exercise_name         text not null check (length(btrim(exercise_name)) > 0),
  primary_muscle_group  text,
  prescribed_sets       int check (prescribed_sets is null or prescribed_sets > 0),
  prescribed_reps       text,
  prescribed_weight_kg numeric(7,2)
    check (prescribed_weight_kg is null or prescribed_weight_kg >= 0),
  target_rpe            text,
  target_rir            text,
  rest_seconds          int check (rest_seconds is null or rest_seconds >= 0),
  order_index           int not null default 0 check (order_index >= 0),
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint performed_exercises_id_workout_user_unique
    unique (id, performed_workout_id, user_id),
  constraint performed_exercises_workout_owner_fk
    foreign key (performed_workout_id, user_id)
    references public.performed_workouts (id, user_id) on delete cascade
);

alter table public.workout_set_logs
  add column performed_workout_id uuid,
  add column performed_exercise_id uuid,
  add constraint workout_set_logs_performed_pair_check
    check (
      (performed_workout_id is null and performed_exercise_id is null)
      or (performed_workout_id is not null and performed_exercise_id is not null)
    ),
  add constraint workout_set_logs_performed_exercise_owner_fk
    foreign key (performed_exercise_id, performed_workout_id, user_id)
    references public.performed_workout_exercises (id, performed_workout_id, user_id)
    on delete cascade;

create index exercise_catalog_user_active
  on public.exercise_catalog (user_id, active);
create index exercise_catalog_primary_muscle
  on public.exercise_catalog (primary_muscle_group);
create index performed_workouts_user_date
  on public.performed_workouts (user_id, performed_on desc, started_at desc);
create index performed_workouts_plan_session
  on public.performed_workouts (plan_session_id);
create index performed_workouts_activity
  on public.performed_workouts (activity_id);
create index performed_exercises_workout_order
  on public.performed_workout_exercises (performed_workout_id, order_index);
create index performed_exercises_catalog
  on public.performed_workout_exercises (catalog_exercise_id);
create index workout_set_logs_performed_workout
  on public.workout_set_logs (performed_workout_id, logged_at);
create index workout_set_logs_performed_exercise
  on public.workout_set_logs (performed_exercise_id, logged_at);

alter table public.exercise_catalog enable row level security;
alter table public.performed_workouts enable row level security;
alter table public.performed_workout_exercises enable row level security;

create policy "exercise_catalog_read_available"
  on public.exercise_catalog for select
  to authenticated
  using (user_id is null or (select auth.uid()) = user_id);

create policy "exercise_catalog_insert_own"
  on public.exercise_catalog for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "exercise_catalog_update_own"
  on public.exercise_catalog for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "exercise_catalog_delete_own"
  on public.exercise_catalog for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "performed_workouts_select_own"
  on public.performed_workouts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "performed_workouts_insert_own"
  on public.performed_workouts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "performed_workouts_update_own"
  on public.performed_workouts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "performed_workouts_delete_own"
  on public.performed_workouts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "performed_exercises_select_own"
  on public.performed_workout_exercises for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "performed_exercises_insert_own"
  on public.performed_workout_exercises for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "performed_exercises_update_own"
  on public.performed_workout_exercises for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "performed_exercises_delete_own"
  on public.performed_workout_exercises for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table
  public.exercise_catalog,
  public.performed_workouts,
  public.performed_workout_exercises
to authenticated;

grant select, insert, update, delete on table
  public.exercise_catalog,
  public.performed_workouts,
  public.performed_workout_exercises
to service_role;
