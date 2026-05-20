alter table user_profiles
  add column if not exists sex text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_sex_check'
  ) then
    alter table user_profiles
      add constraint user_profiles_sex_check
        check (sex is null or sex in ('female', 'male', 'other', 'prefer_not_to_say'));
  end if;
end $$;

alter table daily_metrics
  add column if not exists is_on_period boolean;
