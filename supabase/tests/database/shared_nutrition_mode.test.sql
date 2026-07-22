begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

select has_column('public', 'user_profiles', 'nutrition_tracking_mode', 'profiles store nutrition mode');

insert into auth.users (id, email) values
  ('71000000-0000-4000-8000-000000000001', 'nutrition-owner@example.com'),
  ('71000000-0000-4000-8000-000000000002', 'nutrition-coach@example.com'),
  ('71000000-0000-4000-8000-000000000003', 'nutrition-other@example.com');

update public.user_profiles
set account_role = 'coach'
where id = '71000000-0000-4000-8000-000000000002';

insert into public.coach_client_access (client_id, coach_id, status, granted_at)
values (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  'active',
  now()
);

select results_eq(
  $$select nutrition_tracking_mode from public.user_profiles where id = '71000000-0000-4000-8000-000000000001'$$,
  array['macro_targets'::text],
  'new profiles default to macro targets'
);

set local role authenticated;
set local request.jwt.claim.sub = '71000000-0000-4000-8000-000000000001';

select lives_ok(
  $$update public.user_profiles set nutrition_tracking_mode = 'plan_document' where id = '71000000-0000-4000-8000-000000000001'$$,
  'member can update their own nutrition mode'
);

select results_eq(
  $$select nutrition_tracking_mode from public.user_profiles where id = '71000000-0000-4000-8000-000000000001'$$,
  array['plan_document'::text],
  'member reads the updated nutrition mode'
);

select is_empty(
  $$update public.user_profiles set nutrition_tracking_mode = 'plan_document' where id = '71000000-0000-4000-8000-000000000003' returning id$$,
  'member cannot update another profile'
);

select throws_ok(
  $$update public.user_profiles set nutrition_tracking_mode = 'automatic' where id = '71000000-0000-4000-8000-000000000001'$$,
  '23514',
  null,
  'database rejects unknown nutrition modes'
);

set local request.jwt.claim.sub = '71000000-0000-4000-8000-000000000002';

select results_eq(
  $$select nutrition_tracking_mode from public.user_profiles where id = '71000000-0000-4000-8000-000000000001'$$,
  array['plan_document'::text],
  'active coach can read client nutrition mode'
);

select is_empty(
  $$update public.user_profiles set nutrition_tracking_mode = 'macro_targets' where id = '71000000-0000-4000-8000-000000000001' returning id$$,
  'coach cannot update client nutrition mode'
);

select * from finish();
rollback;
