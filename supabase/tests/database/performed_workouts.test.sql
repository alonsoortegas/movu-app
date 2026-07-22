begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

select has_table('public', 'exercise_catalog', 'exercise catalog exists');
select has_table('public', 'performed_workouts', 'performed workouts exist');
select has_table('public', 'performed_workout_exercises', 'performed workout exercises exist');
select has_column('public', 'workout_set_logs', 'performed_exercise_id', 'set logs link to performed exercises');

select results_eq(
  $$select count(*)::bigint from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('exercise_catalog', 'performed_workouts', 'performed_workout_exercises') and c.relrowsecurity$$,
  array[3::bigint],
  'RLS is enabled on every new exposed table'
);

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'performed-one@example.com'),
  ('10000000-0000-4000-8000-000000000002', 'performed-two@example.com');

insert into public.workout_plans (id, user_id, name, start_date, weeks)
values ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Other plan', '2026-07-20', 4);

insert into public.workout_plan_sessions (id, user_id, plan_id, week_number, day_of_week, title)
values (
  '30000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000002',
  1,
  'monday',
  'Other session'
);

insert into public.performed_workouts (
  id, user_id, origin, title, workout_type, performed_on, started_at, status
) values
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'manual',
    'Own workout',
    'strength',
    '2026-07-22',
    '2026-07-22T14:00:00Z',
    'in_progress'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'manual',
    'Other workout',
    'strength',
    '2026-07-22',
    '2026-07-22T15:00:00Z',
    'in_progress'
  );

insert into public.performed_workout_exercises (
  id, user_id, performed_workout_id, exercise_name, order_index
) values (
  '50000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000002',
  'Other deadlift',
  0
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';

select results_eq(
  'select count(*)::bigint from public.performed_workouts',
  array[1::bigint],
  'a member sees only their own performed workouts'
);

select lives_ok(
  $$insert into public.performed_workouts (user_id, origin, title, workout_type, performed_on, started_at, status) values ('10000000-0000-4000-8000-000000000001', 'manual', 'New own workout', 'strength', '2026-07-23', '2026-07-23T14:00:00Z', 'draft')$$,
  'a member can create their own performed workout'
);

select throws_ok(
  $$insert into public.performed_workouts (user_id, origin, title, workout_type, performed_on, started_at, status) values ('10000000-0000-4000-8000-000000000002', 'manual', 'Foreign workout', 'strength', '2026-07-23', '2026-07-23T14:00:00Z', 'draft')$$,
  '42501',
  null,
  'a member cannot create a performed workout for another user'
);

select throws_ok(
  $$insert into public.performed_workouts (user_id, plan_session_id, origin, title, workout_type, performed_on, started_at, status) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'planned', 'Cross-user plan', 'strength', '2026-07-24', '2026-07-24T14:00:00Z', 'draft')$$,
  '23503',
  null,
  'a member cannot attach another user plan session'
);

select throws_ok(
  $$insert into public.workout_set_logs (user_id, performed_workout_id, performed_exercise_id, exercise_name, set_number, reps) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'Other deadlift', 1, 5)$$,
  '23503',
  null,
  'a member cannot create a set log against another user performed exercise'
);

select * from finish();
rollback;
