-- Secure helper for sign-in error messaging (server-side only via RPC).
-- Returns whether an auth user exists for the given email.

create or replace function public.email_exists(email_input text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(email_input))
  );
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to authenticated, anon;
