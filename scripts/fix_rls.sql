-- Fix infinite recursion in user_roles policy
DROP POLICY IF EXISTS "View user roles in organization" ON public.user_roles;

-- Create a helper function that bypasses RLS to get a user's organizations
CREATE OR REPLACE FUNCTION public.get_user_orgs(check_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT organization_id FROM public.user_roles WHERE user_id = check_user_id;
$$;

-- Now use the helper function in the policies to avoid recursion
CREATE POLICY "View user roles in organization"
    ON public.user_roles FOR SELECT
    USING (
        organization_id IN (SELECT public.get_user_orgs(auth.uid()))
    );

-- Also fix the profiles policy to use the helper function
DROP POLICY IF EXISTS "Users can view members of their organization" ON public.profiles;

CREATE POLICY "Users can view members of their organization"
    ON public.profiles FOR SELECT
    USING (
        organization_id IS NOT NULL AND
        organization_id IN (SELECT public.get_user_orgs(auth.uid()))
    );

-- Also fix roles
DROP POLICY IF EXISTS "View roles in organization" ON public.roles;

CREATE POLICY "View roles in organization"
    ON public.roles FOR SELECT
    USING (
        organization_id IN (SELECT public.get_user_orgs(auth.uid()))
    );

-- Also fix role_permissions
DROP POLICY IF EXISTS "View role permissions" ON public.role_permissions;

CREATE POLICY "View role permissions"
    ON public.role_permissions FOR SELECT
    USING (
        role_id IN (
            SELECT id FROM public.roles WHERE organization_id IN (SELECT public.get_user_orgs(auth.uid()))
        )
    );

-- Also fix organizations
DROP POLICY IF EXISTS "View own organization" ON public.organizations;

CREATE POLICY "View own organization"
    ON public.organizations FOR SELECT
    USING (
        id IN (SELECT public.get_user_orgs(auth.uid()))
    );

-- IMPORTANT: Ensure users can ALWAYS view their OWN profile regardless of organization
CREATE POLICY "Users can always view their own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());
