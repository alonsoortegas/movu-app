create or replace function public.import_workout_plan(p_plan jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  imported_plan_id uuid;
  imported_session_id uuid;
  week_row jsonb;
  session_row jsonb;
  exercise_row jsonb;
  exercise_ordinality bigint;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.workout_plans (
    user_id,
    name,
    start_date,
    weeks,
    active
  )
  values (
    caller_id,
    btrim(p_plan->>'name'),
    (p_plan->>'start_date')::date,
    jsonb_array_length(p_plan->'weeks'),
    false
  )
  returning id into imported_plan_id;

  for week_row in
    select value from jsonb_array_elements(p_plan->'weeks')
  loop
    for session_row in
      select value from jsonb_array_elements(week_row->'sessions')
    loop
      insert into public.workout_plan_sessions (
        user_id,
        plan_id,
        week_number,
        day_of_week,
        title,
        session_type,
        notes
      )
      values (
        caller_id,
        imported_plan_id,
        (week_row->>'week_number')::int,
        session_row->>'day_of_week',
        btrim(session_row->>'title'),
        session_row->>'session_type',
        nullif(btrim(session_row->>'notes'), '')
      )
      returning id into imported_session_id;

      for exercise_row, exercise_ordinality in
        select value, ordinality
        from jsonb_array_elements(session_row->'exercises') with ordinality
      loop
        insert into public.workout_plan_exercises (
          user_id,
          session_id,
          order_index,
          exercise_name,
          prescribed_sets,
          prescribed_reps,
          prescribed_weight_kg,
          target_rpe,
          superset_group,
          rest_seconds,
          is_isometric,
          notes
        )
        values (
          caller_id,
          imported_session_id,
          (exercise_ordinality - 1)::int,
          btrim(exercise_row->>'name'),
          (exercise_row->>'sets')::int,
          nullif(btrim(exercise_row->>'reps'), ''),
          (exercise_row->>'suggested_weight_kg')::real,
          nullif(btrim(exercise_row->>'target_rpe'), ''),
          (exercise_row->>'superset_group')::int,
          (exercise_row->>'rest_seconds')::int,
          coalesce((exercise_row->>'is_isometric')::boolean, false),
          nullif(btrim(exercise_row->>'notes'), '')
        );
      end loop;
    end loop;
  end loop;

  update public.workout_plans
  set active = false
  where user_id = caller_id
    and active = true
    and id <> imported_plan_id;

  update public.workout_plans
  set active = true
  where id = imported_plan_id
    and user_id = caller_id;

  return imported_plan_id;
end;
$$;

revoke all on function public.import_workout_plan(jsonb) from public, anon;
grant execute on function public.import_workout_plan(jsonb) to authenticated;
