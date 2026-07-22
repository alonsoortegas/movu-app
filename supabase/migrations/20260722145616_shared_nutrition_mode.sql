alter table public.user_profiles
  add column nutrition_tracking_mode text not null default 'macro_targets'
  check (nutrition_tracking_mode in ('plan_document', 'macro_targets'));

update public.user_profiles profile
set nutrition_tracking_mode = 'plan_document'
where exists (
  select 1
  from public.nutrition_plans plan
  where plan.user_id = profile.id
    and plan.active
);
