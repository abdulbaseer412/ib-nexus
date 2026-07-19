-- Returns the auth providers linked to a given email address.
-- Used server-side to power intelligent account detection UX.
--
-- Returns examples:
--   {'google'}          — Google-only account
--   {'email'}           — Email+password account
--   {'email','google'}  — Linked account (both methods)
--   {}                  — Email does not exist
--
-- NOTE: array_agg with ORDER BY inside requires PostgreSQL 9.0+.
-- Supabase runs PostgreSQL 15, so this is safe.

create or replace function public.get_account_providers(email_input text)
returns text[]
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select array_agg(i.provider order by i.provider)
      from auth.users u
      join auth.identities i on i.user_id = u.id
      where lower(u.email) = lower(trim(email_input))
    ),
    array[]::text[]
  );
$$;

-- Restrict access: only authenticated users and anon (for sign-in/sign-up flows)
revoke all on function public.get_account_providers(text) from public;
grant execute on function public.get_account_providers(text) to authenticated, anon;
