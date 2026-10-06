-- =============================================================
-- Single-Admin System Schema Migration
-- Migration: single_admin_system.sql
-- Description: Adds is_suspended column to profiles, enables admin logs table
-- =============================================================

-- 1. Ensure profiles columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

-- 2. Create admin activity logs table
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details text,
  created_at timestamptz DEFAULT now()
);

-- 3. Ensure community_rooms table has is_active
ALTER TABLE public.community_rooms ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 4. Enable RLS on admin_activity_logs
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can view all activity logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_activity_logs' AND policyname = 'Admins can view activity logs'
  ) THEN
    CREATE POLICY "Admins can view activity logs" ON public.admin_activity_logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_activity_logs' AND policyname = 'Admins can insert activity logs'
  ) THEN
    CREATE POLICY "Admins can insert activity logs" ON public.admin_activity_logs
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
      );
  END IF;
END $$;

-- Grant privileges
GRANT ALL ON public.admin_activity_logs TO authenticated;
GRANT ALL ON public.admin_activity_logs TO service_role;
