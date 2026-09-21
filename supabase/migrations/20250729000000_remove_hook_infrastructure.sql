-- =============================================================
-- Remove hook-based signup gating.
--
-- The "Before User Created" hook approach is replaced by
-- callback-side intent enforcement + immediate orphan deletion.
--
-- Run this in the Supabase SQL Editor, then go to:
--   Authentication → Hooks
-- and DELETE the "Before user is created" hook entry.
-- =============================================================

-- Drop the hook functions (no longer called).
drop function if exists public.authorize_google_signup(jsonb);
drop function if exists public.cleanup_pending_oauth_signups();

-- Drop the pending signups table (no longer needed).
drop table if exists public.pending_oauth_signups;

notify pgrst, 'reload schema';
