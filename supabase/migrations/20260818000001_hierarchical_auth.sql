-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Display Name
    identifier TEXT NOT NULL, -- Internal stable ID (e.g., parent_owner, researcher)
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, identifier)
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 3. Role Permissions Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 4. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, organization_id) -- A user has one role per organization
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    impersonation BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Add organization_id to profiles for easy querying
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 6. Helper Functions

-- Check if user is parent owner
CREATE OR REPLACE FUNCTION public.is_parent_owner(check_user_id UUID, check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = check_org_id AND parent_user_id = check_user_id
    );
$$;

-- Get user's role identifier
CREATE OR REPLACE FUNCTION public.get_user_role_identifier(check_user_id UUID, check_org_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT r.identifier
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_user_id AND ur.organization_id = check_org_id;
$$;

-- Check granular permission
CREATE OR REPLACE FUNCTION public.has_permission(check_user_id UUID, check_org_id UUID, check_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_parent BOOLEAN;
    has_perm BOOLEAN;
BEGIN
    -- 1. Parent always bypasses
    is_parent := public.is_parent_owner(check_user_id, check_org_id);
    IF is_parent THEN
        RETURN TRUE;
    END IF;

    -- 2. Check role permissions
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.role_permissions rp ON r.id = rp.role_id
        WHERE ur.user_id = check_user_id 
          AND ur.organization_id = check_org_id
          AND rp.permission = check_permission
    ) INTO has_perm;

    RETURN has_perm;
END;
$$;


-- 7. Data Migration

DO $$
DECLARE
    parent_email TEXT := 'ab4689372@gmail.com';
    parent_user_id UUID;
    org_id UUID;
    parent_role_id UUID;
    manager_role_id UUID;
    researcher_role_id UUID;
    admin_record RECORD;
BEGIN
    -- Find the designated Parent Owner
    SELECT id INTO parent_user_id FROM auth.users WHERE email = parent_email;

    IF parent_user_id IS NOT NULL THEN
        -- Create the root organization
        INSERT INTO public.organizations (name, parent_user_id)
        VALUES ('IB Nexus Team', parent_user_id)
        RETURNING id INTO org_id;

        -- Create Parent Owner role
        INSERT INTO public.roles (organization_id, name, identifier, description, is_system)
        VALUES (org_id, 'Owner', 'parent_owner', 'Immutable root authority of the organization.', true)
        RETURNING id INTO parent_role_id;

        -- Create Manager role (default fallback for other admins)
        INSERT INTO public.roles (organization_id, name, identifier, description, is_system)
        VALUES (org_id, 'Manager', 'manager', 'Administrative manager with broad access.', true)
        RETURNING id INTO manager_role_id;

        -- Create Researcher role
        INSERT INTO public.roles (organization_id, name, identifier, description, is_system)
        VALUES (org_id, 'Researcher', 'researcher', 'Focuses on content and research.', false)
        RETURNING id INTO researcher_role_id;

        -- Assign permissions to Manager
        INSERT INTO public.role_permissions (role_id, permission) VALUES
        (manager_role_id, 'users.view'), (manager_role_id, 'users.manage'),
        (manager_role_id, 'content.view'), (manager_role_id, 'content.edit'),
        (manager_role_id, 'community.view'), (manager_role_id, 'community.moderate'),
        (manager_role_id, 'impersonation.child');

        -- Assign permissions to Researcher
        INSERT INTO public.role_permissions (role_id, permission) VALUES
        (researcher_role_id, 'content.view'), (researcher_role_id, 'content.edit'),
        (researcher_role_id, 'community.view');

        -- Assign the Parent user
        INSERT INTO public.user_roles (user_id, role_id, organization_id)
        VALUES (parent_user_id, parent_role_id, org_id);

        UPDATE public.profiles SET organization_id = org_id WHERE id = parent_user_id;

        -- Migrate other existing admins to Manager
        FOR admin_record IN 
            SELECT id FROM public.profiles WHERE is_admin = true AND id != parent_user_id
        LOOP
            INSERT INTO public.user_roles (user_id, role_id, organization_id)
            VALUES (admin_record.id, manager_role_id, org_id)
            ON CONFLICT DO NOTHING;

            UPDATE public.profiles SET organization_id = org_id WHERE id = admin_record.id;
        END LOOP;
        
        -- We won't remove is_admin yet, just map it temporarily.
    END IF;
END $$;


-- 8. Basic RLS Policies

-- Profiles: Add check for organization visibility
CREATE POLICY "Users can view members of their organization"
    ON public.profiles FOR SELECT
    USING (
        organization_id IS NOT NULL AND
        organization_id IN (
            SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

-- Roles: Anyone in org can view roles
CREATE POLICY "View roles in organization"
    ON public.roles FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

-- Role Permissions: Anyone in org can view permissions
CREATE POLICY "View role permissions"
    ON public.role_permissions FOR SELECT
    USING (
        role_id IN (
            SELECT id FROM public.roles WHERE organization_id IN (
                SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
            )
        )
    );

-- User Roles: Anyone in org can view assignments
CREATE POLICY "View user roles in organization"
    ON public.user_roles FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

-- Only Parent Owner can modify roles (for now)
CREATE POLICY "Parent owner can manage roles"
    ON public.roles FOR ALL
    USING (
        public.is_parent_owner(auth.uid(), organization_id)
    );

-- Only Parent Owner can modify user roles
CREATE POLICY "Parent owner can manage user roles"
    ON public.user_roles FOR ALL
    USING (
        public.is_parent_owner(auth.uid(), organization_id)
    );

-- Organizations: users can view their own
CREATE POLICY "View own organization"
    ON public.organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

-- Prevent ANY update to organizations except by parent owner
CREATE POLICY "Parent owner can update organization"
    ON public.organizations FOR UPDATE
    USING (parent_user_id = auth.uid());
