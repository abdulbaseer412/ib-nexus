-- Clean up experimental Admin / Organization / Device Security structures from TEST database

-- 1. Drop experimental tables safely
DROP TABLE IF EXISTS public.admin_device_credentials CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- 2. Drop experimental helper functions
DROP FUNCTION IF EXISTS public.is_parent_owner(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_role_identifier(UUID, UUID);
DROP FUNCTION IF EXISTS public.has_permission(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.is_user_suspended(UUID, UUID);

-- 3. Remove organization_id column from profiles if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id;
