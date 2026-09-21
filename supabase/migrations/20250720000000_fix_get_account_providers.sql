-- Fix get_account_providers to check encrypted_password in auth.users
-- This ensures that users who added a password to an OAuth-only account
-- are correctly recognized as having an 'email' provider.

create or replace function public.get_account_providers(email_input text)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  providers_list text[];
  has_password boolean;
begin
  -- 1. Get all providers from auth.identities
  select array_agg(distinct i.provider order by i.provider)
  into providers_list
  from auth.users u
  join auth.identities i on i.user_id = u.id
  where lower(u.email) = lower(trim(email_input));

  -- 2. Check if the user has a password set in auth.users
  select (u.encrypted_password is not null and length(u.encrypted_password) > 0)
  into has_password
  from auth.users u
  where lower(u.email) = lower(trim(email_input))
  limit 1;

  -- 3. If they have a password, ensure 'email' is in the providers list
  if has_password = true then
    if providers_list is null then
      providers_list := array['email'];
    elsif not ('email' = any(providers_list)) then
      providers_list := array_append(providers_list, 'email');
    end if;
  end if;

  return coalesce(providers_list, array[]::text[]);
end;
$$;

revoke all on function public.get_account_providers(text) from public;
grant execute on function public.get_account_providers(text) to anon, authenticated;

notify pgrst, 'reload schema';
