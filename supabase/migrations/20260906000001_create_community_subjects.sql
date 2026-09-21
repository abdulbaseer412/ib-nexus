-- Create community_subjects table if not exists and seed standard IB subjects
CREATE TABLE IF NOT EXISTS public.community_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default IB subjects
INSERT INTO public.community_subjects (name) VALUES
  ('Biology'),
  ('Chemistry'),
  ('Physics'),
  ('Mathematics'),
  ('Computer Science'),
  ('Economics'),
  ('Business Management'),
  ('History'),
  ('Geography'),
  ('English'),
  ('Languages'),
  ('TOK'),
  ('Extended Essay'),
  ('Internal Assessment'),
  ('Study Tips'),
  ('Exam Preparation'),
  ('General IB')
ON CONFLICT (name) DO NOTHING;
