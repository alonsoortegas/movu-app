begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

select has_column('public', 'nutrition_plans', 'protein_target_g', 'plan stores protein target');
select has_column('public', 'nutrition_plans', 'carbs_target_g', 'plan stores carbohydrate target');
select has_column('public', 'nutrition_plans', 'fat_target_g', 'plan stores fat target');

insert into auth.users (id, email) values
  ('83000000-0000-4000-8000-000000000001', 'target-owner@example.com'),
  ('83000000-0000-4000-8000-000000000002', 'target-coach@example.com');

update public.user_profiles
set account_role = 'coach'
where id = '83000000-0000-4000-8000-000000000002';

insert into public.coach_client_access (client_id, coach_id, status, granted_at)
values (
  '83000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000002',
  'active',
  now()
);

insert into public.nutrition_plans (
  id, user_id, title, starts_on, storage_path, original_filename, active
) values (
  '84000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000001',
  'Manual targets',
  '2026-07-29',
  '83000000-0000-4000-8000-000000000001/plan/manual.pdf',
  'manual.pdf',
  true
);

set local role authenticated;
set local request.jwt.claim.sub = '83000000-0000-4000-8000-000000000001';

select lives_ok(
  $$update public.nutrition_plans set calories_target = 2400, protein_target_g = 170, carbs_target_g = 280, fat_target_g = 75 where id = '84000000-0000-4000-8000-000000000001'$$,
  'owner updates manual targets'
);

select throws_ok(
  $$update public.nutrition_plans set protein_target_g = -1 where id = '84000000-0000-4000-8000-000000000001'$$,
  '23514',
  null,
  'negative macros are rejected'
);

select throws_ok(
  $$update public.nutrition_plans set carbs_target_g = 1001 where id = '84000000-0000-4000-8000-000000000001'$$,
  '23514',
  null,
  'excessive macros are rejected'
);

set local request.jwt.claim.sub = '83000000-0000-4000-8000-000000000002';

select is_empty(
  $$update public.nutrition_plans set calories_target = 2500 where id = '84000000-0000-4000-8000-000000000001' returning id$$,
  'coach cannot update client targets'
);

select results_eq(
  $$select protein_target_g::real, carbs_target_g::real, fat_target_g::real from public.nutrition_plans where id = '84000000-0000-4000-8000-000000000001'$$,
  $$values (170::real, 280::real, 75::real)$$,
  'owner values remain unchanged'
);

select * from finish();
rollback;
