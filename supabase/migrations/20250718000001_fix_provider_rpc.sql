-- ─── get_account_providers RPC (idempotent) ──────────────────────────────────
--
-- Run this in Supabase SQL Editor.
--
-- This function is the ONLY source of provider data for the UI.
-- If it returns {} for a known email, the UI will always show the
-- generic fallback message regardless of what the frontend code does.
--
-- After running, execute the self-test block at the bottom to confirm
-- it is returning real data before testing the UI.

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

revoke all on function public.get_account_providers(text) from public;
grant execute on function public.get_account_providers(text) to authenticated, anon;


-- ─── SELF-TEST: run this immediately after the function above ─────────────────
--
-- Step 1: List every user and their linked providers.
--         If this returns rows, the function has data to work with.
--
-- select
--   u.email,
--   array_agg(i.provider order by i.provider) as providers
-- from auth.users u
-- join auth.identities i on i.user_id = u.id
-- group by u.email
-- order by u.email;
--
-- Expected output example:
--   email                  | providers
--   -----------------------+-----------
--   user@example.com       | {google}
--   other@example.com      | {email}
--
-- Step 2: Call the function directly with a real email from Step 1.
--
-- select public.get_account_providers('user@example.com');
--
-- Expected: {google}   or   {email}   or   {email,google}
-- If you get {} for an email that exists in Step 1, the join is broken.
--
-- Step 3: Confirm the function is visible to the anon role.
--
-- select routine_name, security_type
-- from information_schema.routines
-- where routine_schema = 'public'
--   and routine_name = 'get_account_providers';
--
-- Expected: one row with security_type = 'DEFINER'
