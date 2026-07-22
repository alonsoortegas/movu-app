begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

select has_table('public', 'coach_client_access', 'coach access grants exist');
select has_column('public', 'user_profiles', 'account_role', 'profiles distinguish coach accounts');

insert into auth.users (id, email) values
  ('61000000-0000-4000-8000-000000000001', 'active-client@example.com'),
  ('61000000-0000-4000-8000-000000000002', 'coach@example.com'),
  ('61000000-0000-4000-8000-000000000003', 'pending-client@example.com'),
  ('61000000-0000-4000-8000-000000000004', 'unrelated@example.com');

update public.user_profiles
set account_role = 'coach'
where id = '61000000-0000-4000-8000-000000000002';

insert into public.activities (id, user_id, source, activity_name) values
  ('62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'manual', 'Granted workout'),
  ('62000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000003', 'manual', 'Pending workout'),
  ('62000000-0000-4000-8000-000000000004', '61000000-0000-4000-8000-000000000004', 'manual', 'Unrelated workout');

insert into public.coach_client_access (client_id, coach_id, status, granted_at) values
  ('61000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000002', 'active', now()),
  ('61000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000002', 'pending', null);

set local role authenticated;
set local request.jwt.claim.sub = '61000000-0000-4000-8000-000000000002';

select results_eq(
  $$select id from public.user_profiles where id = '61000000-0000-4000-8000-000000000001'$$,
  array['61000000-0000-4000-8000-000000000001'::uuid],
  'an assigned coach can read an active client profile'
);

select results_eq(
  $$select id from public.activities order by id$$,
  array['62000000-0000-4000-8000-000000000001'::uuid],
  'an assigned coach reads only active-grant client activity'
);

select is_empty(
  $$update public.activities set activity_name = 'Coach edit' where id = '62000000-0000-4000-8000-000000000001' returning id$$,
  'coach access is read-only'
);

select is_empty(
  $$select id from public.activities where user_id = '61000000-0000-4000-8000-000000000003'$$,
  'pending access does not expose client data'
);

select is_empty(
  $$select id from public.activities where user_id = '61000000-0000-4000-8000-000000000004'$$,
  'unrelated users remain hidden'
);

reset role;
update public.coach_client_access
set status = 'revoked', revoked_at = now(), updated_at = now()
where client_id = '61000000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claim.sub = '61000000-0000-4000-8000-000000000002';

select is_empty(
  $$select id from public.activities where user_id = '61000000-0000-4000-8000-000000000001'$$,
  'revocation removes access immediately'
);

set local request.jwt.claim.sub = '61000000-0000-4000-8000-000000000001';
select throws_ok(
  $$update public.user_profiles set account_role = 'coach' where id = '61000000-0000-4000-8000-000000000001'$$,
  'P0001',
  'profile_access_columns_readonly',
  'a member cannot promote their own account to coach'
);

select results_eq(
  $$select status from public.coach_client_access where coach_id = '61000000-0000-4000-8000-000000000002'$$,
  array['revoked'::text],
  'the client can inspect their own grant state'
);

select * from finish();
rollback;
