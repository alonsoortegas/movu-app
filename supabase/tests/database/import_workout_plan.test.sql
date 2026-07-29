begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

create function pg_temp.valid_plan_fixture(plan_name text default 'Imported HYROX')
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'schema_version', '1.0',
    'name', plan_name,
    'start_date', '2026-08-01',
    'weeks', jsonb_build_array(
      jsonb_build_object(
        'week_number', 1,
        'sessions', jsonb_build_array(
          jsonb_build_object(
            'day_of_week', 'monday',
            'title', 'Strength',
            'session_type', 'strength',
            'notes', null,
            'exercises', jsonb_build_array(
              jsonb_build_object(
                'name', 'Wall balls',
                'sets', 4,
                'reps', '15',
                'suggested_weight_kg', 6,
                'target_rpe', '7',
                'rest_seconds', 60,
                'superset_group', null,
                'is_isometric', false,
                'notes', null
              )
            )
          ),
          jsonb_build_object(
            'day_of_week', 'wednesday',
            'title', 'Run',
            'session_type', 'cardio',
            'notes', null,
            'exercises', jsonb_build_array(
              jsonb_build_object(
                'name', 'Intervals',
                'sets', 5,
                'reps', '800 m',
                'suggested_weight_kg', null,
                'target_rpe', '8',
                'rest_seconds', 120,
                'superset_group', null,
                'is_isometric', false,
                'notes', null
              )
            )
          )
        )
      )
    )
  );
$$;

create function pg_temp.failing_plan_fixture()
returns jsonb
language sql
as $$
  select jsonb_set(
    pg_temp.valid_plan_fixture('Broken import'),
    '{weeks,0,sessions,1,exercises,0,suggested_weight_kg}',
    '"not-a-number"'::jsonb
  );
$$;

insert into auth.users (id, email) values
  ('81000000-0000-4000-8000-000000000001', 'import-one@example.com'),
  ('81000000-0000-4000-8000-000000000002', 'import-two@example.com');

insert into public.workout_plans (id, user_id, name, start_date, weeks, active)
values (
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'Existing plan',
  '2026-07-01',
  4,
  true
);

select has_function('public', 'import_workout_plan', array['jsonb'], 'atomic import function exists');

set local role authenticated;
set local request.jwt.claim.sub = '81000000-0000-4000-8000-000000000001';

select lives_ok(
  $$select public.import_workout_plan(pg_temp.valid_plan_fixture())$$,
  'owner imports a valid plan'
);

select results_eq(
  $$select count(*)::bigint from public.workout_plan_sessions s join public.workout_plans p on p.id = s.plan_id where p.name = 'Imported HYROX'$$,
  array[2::bigint],
  'all sessions are imported'
);

select results_eq(
  $$select e.prescribed_weight_kg::real from public.workout_plan_exercises e join public.workout_plan_sessions s on s.id = e.session_id join public.workout_plans p on p.id = s.plan_id where p.name = 'Imported HYROX' and e.exercise_name = 'Wall balls'$$,
  array[6::real],
  'suggested weight maps to the prescription'
);

select results_eq(
  $$select name from public.workout_plans where active order by name$$,
  array['Imported HYROX'::text],
  'the imported plan replaces the old active plan'
);

select throws_ok(
  $$select public.import_workout_plan(pg_temp.failing_plan_fixture())$$,
  '22P02',
  null,
  'a failed child insert aborts the import'
);

select results_eq(
  $$select name from public.workout_plans where active order by name$$,
  array['Imported HYROX'::text],
  'the active plan survives a failed import'
);

set local request.jwt.claim.sub = '81000000-0000-4000-8000-000000000002';

select lives_ok(
  $$select public.import_workout_plan(pg_temp.valid_plan_fixture('Second user plan'))$$,
  'a second user imports independently'
);

select results_eq(
  $$select count(*)::bigint from public.workout_plans where user_id = '81000000-0000-4000-8000-000000000002' and active$$,
  array[1::bigint],
  'ownership always comes from the authenticated user'
);

select * from finish();
rollback;
