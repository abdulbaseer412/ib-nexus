-- Temporary debug function to inspect user auth state
-- This is used for forensic investigation only.

create or replace function public.debug_user_auth_state(email_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_row record;
  identities_list jsonb;
begin
  -- Get user row from auth.users
  select id, email, encrypted_password, raw_app_meta_data, raw_user_meta_data
  into user_row
  from auth.users
  where lower(email) = lower(trim(email_input))
  limit 1;

  if user_row.id is null then
    return jsonb_build_object('error', 'User not found');
  end if;

  -- Get identities from auth.identities
  select jsonb_agg(jsonb_build_object('id', id, 'provider', provider, 'identity_data', identity_data))
  into identities_list
  from auth.identities
  where user_id = user_row.id;

  return jsonb_build_object(
    'user_id', user_row.id,
    'email', user_row.email,
    'has_encrypted_password', (user_row.encrypted_password is not null and length(user_row.encrypted_password) > 0),
    'encrypted_password_length', length(user_row.encrypted_password),
    'raw_app_meta_data', user_row.raw_app_meta_data,
    'raw_user_meta_data', user_row.raw_user_meta_data,
    'identities', identities_list
  );
end;
$$;

revoke all on function public.debug_user_auth_state(text) from public;
grant execute on function public.debug_user_auth_state(text) to anon, authenticated;

notify pgrst, 'reload schema';
