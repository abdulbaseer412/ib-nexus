-- =============================================================
-- VERIFICATION: Run after a Google Sign Up attempt.
-- =============================================================

-- 1. Confirm the hook consumed the pending row (consumed_at should be set):
select id, email, expires_at, consumed_at, created_at
from public.pending_oauth_signups
order by created_at desc
limit 5;
-- SUCCESS: consumed_at IS NOT NULL on the most recent row
-- FAILURE: consumed_at IS NULL → hook did not run → not configured in Dashboard

-- 2. Confirm exactly one user was created (replace with the email you used):
-- select id, email, created_at, last_sign_in_at
-- from auth.users
-- where email = 'your-google-email@gmail.com';

-- 3. Confirm exactly one identity:
-- select user_id, provider, created_at
-- from auth.identities
-- where provider = 'google'
-- order by created_at desc
-- limit 5;

-- 4. Confirm profile was created:
-- select id, display_name, onboarding_completed
-- from public.profiles
-- order by created_at desc
-- limit 5;

-- 5. Confirm user_auth_settings was created:
-- select user_id, google_enabled, email_password_enabled
-- from public.user_auth_settings
-- order by created_at desc
-- limit 5;
