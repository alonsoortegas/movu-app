create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_code text := new.raw_user_meta_data->>'invite_code';
begin
  insert into public.user_profiles (id, full_name, invite_code_used)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    v_code
  );

  if v_code is not null then
    update public.invite_codes
    set uses_count = uses_count + 1
    where code = v_code;

    update public.waitlist
    set status = 'converted'
    where email = new.email and status = 'invited';
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
