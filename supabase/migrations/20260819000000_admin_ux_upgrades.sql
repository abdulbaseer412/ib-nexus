-- 1. Add is_suspended to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;

-- 2. Helper function to check if a user is suspended in any of their orgs
CREATE OR REPLACE FUNCTION public.is_user_suspended(check_user_id UUID, check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT is_suspended 
    FROM public.user_roles 
    WHERE user_id = check_user_id AND organization_id = check_org_id;
$$;

-- 3. We do NOT drop existing RLS, but if we wanted to enforce it strictly at DB level we could.
-- Since the application layer (middleware/authorization) checks the context, 
-- we will primarily enforce suspension there for better UX (redirecting to a "suspended" page).
