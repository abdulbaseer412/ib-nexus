-- 20250826000000_extend_planner.sql
-- Migration to add planner tables and policies

-- Planner Goals (high-level objectives)
CREATE TABLE IF NOT EXISTS public.planner_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text,
  title text NOT NULL,
  description text,
  type text NOT NULL,
  status text DEFAULT 'active',
  target_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Planner Tasks (what needs to be accomplished)
CREATE TABLE IF NOT EXISTS public.planner_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text,
  title text NOT NULL,
  description text,
  type text,
  subject text,
  topic text,
  goal_id uuid REFERENCES public.planner_goals(id),
  priority text DEFAULT 'medium',
  estimated_duration integer,
  status text DEFAULT 'pending',
  origin text DEFAULT 'manual',
  created_at timestamp with time zone DEFAULT now()
);

-- Planner Deadlines (date/time constraints)
CREATE TABLE IF NOT EXISTS public.planner_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text,
  title text NOT NULL,
  due_at timestamp with time zone NOT NULL,
  goal_id uuid REFERENCES public.planner_goals(id),
  task_id uuid REFERENCES public.planner_tasks(id),
  assessment_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Add deadline_id to planner_tasks now that planner_deadlines exists
ALTER TABLE public.planner_tasks 
  ADD COLUMN IF NOT EXISTS deadline_id uuid REFERENCES public.planner_deadlines(id);

-- Planner Sessions (when the task is scheduled)
CREATE TABLE IF NOT EXISTS public.planner_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  task_id uuid REFERENCES public.planner_tasks(id),
  name text,
  title text,
  scheduled_start timestamp with time zone NOT NULL,
  scheduled_end timestamp with time zone NOT NULL,
  status text DEFAULT 'scheduled', 
  completed_at timestamp with time zone,
  actual_duration integer,
  created_at timestamp with time zone DEFAULT now()
);

-- Planner Preferences (user settings for planner)
CREATE TABLE IF NOT EXISTS public.planner_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  auto_plan_enabled boolean DEFAULT false,
  daily_max_minutes integer DEFAULT 300,
  break_minutes integer DEFAULT 10,
  preferred_start_time time DEFAULT '09:00',
  timezone text
);

-- Row Level Security
ALTER TABLE public.planner_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'planner_goals_user_policy') THEN
    CREATE POLICY planner_goals_user_policy ON public.planner_goals USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'planner_tasks_user_policy') THEN
    CREATE POLICY planner_tasks_user_policy ON public.planner_tasks USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'planner_deadlines_user_policy') THEN
    CREATE POLICY planner_deadlines_user_policy ON public.planner_deadlines USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'planner_sessions_user_policy') THEN
    CREATE POLICY planner_sessions_user_policy ON public.planner_sessions USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'planner_preferences_user_policy') THEN
    CREATE POLICY planner_preferences_user_policy ON public.planner_preferences USING (auth.uid() = user_id);
  END IF;
END
$$;
