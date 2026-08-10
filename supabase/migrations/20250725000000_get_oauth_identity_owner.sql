-- Returns the auth.users id that owns a given OAuth identity.
-- Used server-side during OAuth callback to prevent linking a Google
-- account that already belongs to another IB Nexus user.

create or replace function public.get_oauth_identity_owner(
  provider_input text,
  provider_id_input text
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select user_id
  from auth.identities
  where provider = provider_input
    and provider_id = provider_id_input
  limit 1;
$$;

revoke all on function public.get_oauth_identity_owner(text, text) from public;
grant execute on function public.get_oauth_identity_owner(text, text) to authenticated;

notify pgrst, 'reload schema';
