-- 20250827000000_resources.sql
-- Migration: IB Nexus Resource Library

-- ── Main resources table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ib_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,        -- NULL for platform resources
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  file_type text,
  resource_type text NOT NULL DEFAULT 'other',
  programme text NOT NULL DEFAULT 'dp',
  subject text,
  level text,
  topic text,
  year integer,
  exam_session text,
  paper_number text,
  tags text[] DEFAULT '{}',
  source text NOT NULL DEFAULT 'user',                         -- platform | user | community
  visibility text NOT NULL DEFAULT 'private',                  -- public | private | pending | approved | rejected
  related_resource_id uuid REFERENCES public.ib_resources(id) ON DELETE SET NULL,
  extracted_text text,
  extraction_status text DEFAULT 'pending',
  download_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ── User bookmarks / saves ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ib_resource_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  resource_id uuid REFERENCES public.ib_resources(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, resource_id)
);

-- ── Recently viewed ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ib_resource_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  resource_id uuid REFERENCES public.ib_resources(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamp with time zone DEFAULT now()
);

-- ── Planner integration ───────────────────────────────────────────────────────
ALTER TABLE public.planner_tasks
  ADD COLUMN IF NOT EXISTS resource_id uuid REFERENCES public.ib_resources(id) ON DELETE SET NULL;

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.ib_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ib_resource_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ib_resource_views ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Resources: users can see platform/public resources and their own
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'resources_select_policy') THEN
    CREATE POLICY resources_select_policy ON public.ib_resources
      FOR SELECT USING (
        source = 'platform'
        OR (source = 'community' AND visibility = 'approved')
        OR user_id = auth.uid()
      );
  END IF;

  -- Resources: users can insert their own
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'resources_insert_policy') THEN
    CREATE POLICY resources_insert_policy ON public.ib_resources
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  -- Resources: users can update their own
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'resources_update_policy') THEN
    CREATE POLICY resources_update_policy ON public.ib_resources
      FOR UPDATE USING (user_id = auth.uid());
  END IF;

  -- Resources: users can delete their own
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'resources_delete_policy') THEN
    CREATE POLICY resources_delete_policy ON public.ib_resources
      FOR DELETE USING (user_id = auth.uid());
  END IF;

  -- Saves: user-scoped
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'resource_saves_policy') THEN
    CREATE POLICY resource_saves_policy ON public.ib_resource_saves
      USING (user_id = auth.uid());
  END IF;

  -- Views: user-scoped
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'resource_views_policy') THEN
    CREATE POLICY resource_views_policy ON public.ib_resource_views
      USING (user_id = auth.uid());
  END IF;
END
$$;

-- ── Indexes for performance ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_resources_programme ON public.ib_resources(programme);
CREATE INDEX IF NOT EXISTS idx_resources_subject ON public.ib_resources(subject);
CREATE INDEX IF NOT EXISTS idx_resources_type ON public.ib_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_source ON public.ib_resources(source);
CREATE INDEX IF NOT EXISTS idx_resources_user ON public.ib_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_related ON public.ib_resources(related_resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_saves_user ON public.ib_resource_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_views_user ON public.ib_resource_views(user_id, viewed_at DESC);
