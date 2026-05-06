-- Strengthen the auth trigger to reject signups without a valid invite code.
-- The validation and decrement now happen atomically inside the trigger,
-- so bypassing the signup page UI (e.g. calling Supabase Auth directly) still
-- enforces the invite requirement.

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_code      text := new.raw_user_meta_data->>'invite_code';
  v_code_id   uuid;
begin
  -- Validate invite code: must exist, be active, not expired, and have uses remaining.
  -- Use SELECT ... FOR UPDATE to prevent concurrent signups from double-spending the same code.
  select id into v_code_id
  from public.invite_codes
  where code = v_code
    and active = true
    and (expires_at is null or expires_at > now())
    and uses_count < max_uses
  for update;

  if v_code_id is null then
    raise exception 'invalid_invite_code' using
      hint = 'No valid invite code was provided.',
      errcode = 'P0001';
  end if;

  -- Decrement uses atomically (now safe because we hold the row lock above)
  update public.invite_codes
  set uses_count = uses_count + 1
  where id = v_code_id;

  -- Create the user profile
  insert into public.user_profiles (id, full_name, invite_code_used)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    v_code
  );

  -- Convert waitlist entry if email matches an invited entry
  update public.waitlist
  set status = 'converted'
  where email = new.email and status = 'invited';

  return new;
end;
$$;
