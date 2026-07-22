-- Explicit member-to-coach access grants. Coaches receive read-only access to
-- the granted member's coaching data; every write remains owner-only.

alter table public.user_profiles
  add column email text,
  add column account_role text not null default 'member'
    check (account_role in ('member', 'coach'));

update public.user_profiles profile
set email = lower(auth_user.email)
from auth.users auth_user
where auth_user.id = profile.id
  and auth_user.email is not null;

create unique index user_profiles_email_unique
  on public.user_profiles (lower(email))
  where email is not null;

create or replace function public.protect_profile_access_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' and (
    new.account_role is distinct from old.account_role
    or new.email is distinct from old.email
  ) then
    raise exception 'profile_access_columns_readonly'
      using hint = 'Email and account role may only be updated by the server.', errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger enforce_profile_access_column_protection
  before update of email, account_role on public.user_profiles
  for each row execute procedure public.protect_profile_access_columns();

revoke all on function public.protect_profile_access_columns() from public, anon, authenticated;
revoke insert, delete on table public.user_profiles from authenticated;

create table public.coach_client_access (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.user_profiles (id) on delete cascade,
  coach_id    uuid not null references public.user_profiles (id) on delete cascade,
  status      text not null default 'active'
    check (status in ('pending', 'active', 'revoked')),
  granted_at  timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (client_id, coach_id),
  check (client_id <> coach_id),
  check (status <> 'active' or granted_at is not null),
  check (status <> 'revoked' or revoked_at is not null)
);

create index coach_client_access_coach_status
  on public.coach_client_access (coach_id, status, client_id);
create index coach_client_access_client_status
  on public.coach_client_access (client_id, status, coach_id);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_coach_account(candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_profiles profile
    where profile.id = candidate_id
      and profile.account_role = 'coach'
  );
$$;

create or replace function private.can_coach_read(client_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.coach_client_access access_grant
    join public.user_profiles coach on coach.id = access_grant.coach_id
    where access_grant.client_id = client_user_id
      and access_grant.coach_id = (select auth.uid())
      and access_grant.status = 'active'
      and coach.account_role = 'coach'
  );
$$;

revoke all on function private.is_coach_account(uuid) from public, anon;
revoke all on function private.can_coach_read(uuid) from public, anon;
grant execute on function private.is_coach_account(uuid) to authenticated;
grant execute on function private.can_coach_read(uuid) to authenticated;

alter table public.coach_client_access enable row level security;

create policy "coach_access_select_participant"
  on public.coach_client_access for select
  to authenticated
  using (
    client_id = (select auth.uid())
    or coach_id = (select auth.uid())
  );

create policy "coach_access_insert_client"
  on public.coach_client_access for insert
  to authenticated
  with check (
    client_id = (select auth.uid())
    and private.is_coach_account(coach_id)
  );

create policy "coach_access_update_client"
  on public.coach_client_access for update
  to authenticated
  using (client_id = (select auth.uid()))
  with check (
    client_id = (select auth.uid())
    and private.is_coach_account(coach_id)
  );

-- Coach reads are additive SELECT policies. Existing owner policies continue
-- to control every insert, update, and delete.
create policy "coach_read_client_profile" on public.user_profiles
  for select to authenticated using (private.can_coach_read(id));
create policy "coach_read_client_activities" on public.activities
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_sleep" on public.sleep_logs
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_measurements" on public.body_measurements
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_daily_metrics" on public.daily_metrics
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_insights" on public.insights
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_workout_plans" on public.workout_plans
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_plan_sessions" on public.workout_plan_sessions
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_plan_exercises" on public.workout_plan_exercises
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_set_logs" on public.workout_set_logs
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_performed_workouts" on public.performed_workouts
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_performed_exercises" on public.performed_workout_exercises
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_nutrition_targets" on public.nutrition_targets
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_nutrition_days" on public.nutrition_days
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_meal_logs" on public.meal_logs
  for select to authenticated using (private.can_coach_read(user_id));
create policy "coach_read_client_meal_items" on public.meal_log_items
  for select to authenticated using (
    exists (
      select 1 from public.meal_logs meal
      where meal.id = meal_log_id
        and private.can_coach_read(meal.user_id)
    )
  );
create policy "coach_read_client_training_phases" on public.training_phases
  for select to authenticated using (private.can_coach_read(user_id));

grant select, insert, update on table public.coach_client_access to authenticated;
grant select, insert, update, delete on table public.coach_client_access to service_role;

-- Keep profile email synchronized for future registrations while preserving
-- the invite conversion behavior from the original auth trigger.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := new.raw_user_meta_data->>'invite_code';
begin
  insert into public.user_profiles (id, email, full_name, invite_code_used)
  values (
    new.id,
    lower(new.email),
    new.raw_user_meta_data->>'full_name',
    v_code
  );

  if v_code is not null then
    update public.invite_codes
    set uses_count = uses_count + 1
    where code = v_code;

    update public.waitlist
    set status = 'converted'
    where email = new.email and status = 'invited';
  end if;

  return new;
end;
$$;
