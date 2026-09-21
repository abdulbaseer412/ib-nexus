-- =============================================================
-- Single-Admin System Schema Migration
-- Migration: 20260906000002_single_admin_system.sql
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
CREATE POLICY "Admins can view activity logs" ON public.admin_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Policy: Admin can insert activity logs
CREATE POLICY "Admins can insert activity logs" ON public.admin_activity_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Grant privileges
GRANT ALL ON public.admin_activity_logs TO authenticated;
GRANT ALL ON public.admin_activity_logs TO service_role;
