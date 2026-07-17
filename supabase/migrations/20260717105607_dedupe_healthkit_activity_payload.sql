create or replace function public.upsert_apple_health_activities(p_rows jsonb)
returns int
language plpgsql
as $$
declare
  affected_count int;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    return 0;
  end if;

  insert into public.activities (
    user_id,
    source,
    activity_type,
    activity_category,
    activity_name,
    start_date_utc,
    start_date_local,
    timezone,
    moving_time_s,
    elapsed_time_s,
    distance_m,
    elevation_gain_m,
    avg_hr_bpm,
    max_hr_bpm,
    avg_pace_per_km_s,
    avg_cadence_spm,
    strain,
    calories_kcal,
    inferred_muscle_groups,
    hr_zones,
    trainer,
    coach_name,
    whoop_activity_id
  )
  with input_rows as (
    select *
    from jsonb_to_recordset(p_rows) as row_data (
      user_id uuid,
      source text,
      activity_type text,
      activity_category text,
      activity_name text,
      start_date_utc timestamptz,
      start_date_local timestamp,
      timezone text,
      moving_time_s int,
      elapsed_time_s int,
      distance_m numeric,
      elevation_gain_m numeric,
      avg_hr_bpm numeric,
      max_hr_bpm numeric,
      avg_pace_per_km_s numeric,
      avg_cadence_spm numeric,
      strain numeric,
      calories_kcal numeric,
      inferred_muscle_groups text[],
      hr_zones jsonb,
      trainer boolean,
      coach_name text,
      whoop_activity_id uuid
    )
    where user_id is not null
      and activity_type is not null
      and start_date_utc is not null
  ),
  deduped_rows as (
    select distinct on (user_id, start_date_utc, activity_type)
      *
    from input_rows
    order by
      user_id,
      start_date_utc,
      activity_type,
      elapsed_time_s desc nulls last,
      calories_kcal desc nulls last,
      activity_name desc nulls last
  )
  select
    user_id,
    'apple_health',
    activity_type,
    activity_category,
    activity_name,
    start_date_utc,
    start_date_local,
    timezone,
    moving_time_s,
    elapsed_time_s,
    distance_m,
    elevation_gain_m,
    avg_hr_bpm,
    max_hr_bpm,
    avg_pace_per_km_s,
    avg_cadence_spm,
    strain,
    calories_kcal,
    inferred_muscle_groups,
    hr_zones,
    trainer,
    coach_name,
    whoop_activity_id
  from deduped_rows
  on conflict (user_id, start_date_utc, activity_type)
  where source = 'apple_health'
  do update set
    activity_category = excluded.activity_category,
    activity_name = excluded.activity_name,
    start_date_local = excluded.start_date_local,
    timezone = excluded.timezone,
    moving_time_s = excluded.moving_time_s,
    elapsed_time_s = excluded.elapsed_time_s,
    distance_m = excluded.distance_m,
    elevation_gain_m = excluded.elevation_gain_m,
    avg_hr_bpm = excluded.avg_hr_bpm,
    max_hr_bpm = excluded.max_hr_bpm,
    avg_pace_per_km_s = excluded.avg_pace_per_km_s,
    avg_cadence_spm = excluded.avg_cadence_spm,
    strain = excluded.strain,
    calories_kcal = excluded.calories_kcal,
    inferred_muscle_groups = excluded.inferred_muscle_groups,
    hr_zones = excluded.hr_zones,
    trainer = excluded.trainer,
    coach_name = excluded.coach_name,
    whoop_activity_id = excluded.whoop_activity_id;

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

revoke all on function public.upsert_apple_health_activities(jsonb) from public;
grant execute on function public.upsert_apple_health_activities(jsonb) to service_role;
