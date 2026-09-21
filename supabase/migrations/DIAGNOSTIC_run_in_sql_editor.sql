-- =============================================================
-- DIAGNOSTIC: Run this in Supabase SQL Editor.
-- It tells you exactly what is configured and what is broken.
-- =============================================================

-- 1. Does the hook function exist?
select
  routine_name,
  security_type,
  routine_definition
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'authorize_google_signup';
-- Expected: 1 row. If 0 rows → function was never created or was dropped.

-- 2. Does the pending_oauth_signups table exist?
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'pending_oauth_signups'
order by ordinal_position;
-- Expected: id, email, provider, token_hash, expires_at, consumed_at, created_at

-- 3. What pending rows exist right now?
select id, email, provider, expires_at, consumed_at, created_at
from public.pending_oauth_signups
order by created_at desc;
-- After a failed signup attempt: should show 1 row with email='' and consumed_at IS NULL
-- If consumed_at IS NOT NULL: hook ran and consumed it (good)
-- If no rows: createPendingGoogleSignup() never ran or the row was deleted

-- 4. Simulate the hook with a wildcard row to verify the function works:
do $$
declare
  result jsonb;
begin
  -- Insert a test pending row
  insert into public.pending_oauth_signups (email, provider, token_hash, expires_at)
  values ('', 'google', 'test_diagnostic_hash', now() + interval '5 minutes');

  -- Call the hook as if a new Google user is being created
  result := public.authorize_google_signup(
    '{"user": {"email": "newuser@gmail.com", "app_metadata": {"provider": "google"}}}'::jsonb
  );

  raise notice 'Hook result: %', result;

  -- Clean up
  delete from public.pending_oauth_signups where token_hash = 'test_diagnostic_hash';
end;
$$;
-- Expected NOTICE: Hook result: {}
-- If result contains "error": the hook function is not matching the wildcard row

-- 5. Simulate the hook with NO pending row (should block):
select public.authorize_google_signup(
  '{"user": {"email": "blocked@gmail.com", "app_metadata": {"provider": "google"}}}'::jsonb
);
-- Expected: {"error": {"http_code": 403, "message": "..."}}
-- If result is {}: the hook is allowing everything (broken)

-- 6. Check grants on the hook function:
select grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name = 'authorize_google_signup';
-- Expected: supabase_auth_admin has EXECUTE
-- If supabase_auth_admin is missing: hook will fail silently

-- 7. Check if the hook is registered in Supabase's internal config:
-- (This table exists in Supabase hosted projects)
select *
from auth.hooks
where hook_name = 'before_user_created'
   or hook_name like '%before%user%';
-- If this table doesn't exist or returns 0 rows:
-- The hook is NOT configured in the Dashboard → this is why users are being created
