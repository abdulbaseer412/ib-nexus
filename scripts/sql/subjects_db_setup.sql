-- IB Subjects Table Setup & Initial Seed Data

CREATE TABLE IF NOT EXISTS public.ib_subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (program, category, name)
);

ALTER TABLE public.ib_subjects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view ib_subjects' AND tablename = 'ib_subjects'
  ) THEN
    CREATE POLICY "Anyone can view ib_subjects" ON public.ib_subjects FOR SELECT USING (true);
  END IF;
END
$$;

-- Seed DP & MYP Subjects
INSERT INTO public.ib_subjects (program, category, name) VALUES
  -- DP Subjects
  ('dp', 'Group 1 & 2: Languages', 'English A Lit'),
  ('dp', 'Group 1 & 2: Languages', 'English A Lang & Lit'),
  ('dp', 'Group 1 & 2: Languages', 'Spanish B'),
  ('dp', 'Group 1 & 2: Languages', 'French B'),
  ('dp', 'Group 1 & 2: Languages', 'Mandarin B'),
  ('dp', 'Group 1 & 2: Languages', 'German B'),
  ('dp', 'Group 1 & 2: Languages', 'German ab initio'),
  ('dp', 'Group 3: Individuals & Societies', 'History'),
  ('dp', 'Group 3: Individuals & Societies', 'Geography'),
  ('dp', 'Group 3: Individuals & Societies', 'Economics'),
  ('dp', 'Group 3: Individuals & Societies', 'Business Management'),
  ('dp', 'Group 3: Individuals & Societies', 'Psychology'),
  ('dp', 'Group 3: Individuals & Societies', 'Global Politics'),
  ('dp', 'Group 4: Sciences', 'Biology'),
  ('dp', 'Group 4: Sciences', 'Chemistry'),
  ('dp', 'Group 4: Sciences', 'Physics'),
  ('dp', 'Group 4: Sciences', 'Computer Science'),
  ('dp', 'Group 4: Sciences', 'ESS'),
  ('dp', 'Group 5: Mathematics', 'Mathematics AA'),
  ('dp', 'Group 5: Mathematics', 'Mathematics AI'),
  -- MYP Subjects
  ('myp', 'Language and Literature', 'English Lang & Lit'),
  ('myp', 'Language and Literature', 'Spanish Lang & Lit'),
  ('myp', 'Language and Literature', 'German Lang & Lit'),
  ('myp', 'Language Acquisition', 'French'),
  ('myp', 'Language Acquisition', 'Spanish'),
  ('myp', 'Language Acquisition', 'Mandarin'),
  ('myp', 'Language Acquisition', 'German'),
  ('myp', 'Individuals and Societies', 'History'),
  ('myp', 'Individuals and Societies', 'Geography'),
  ('myp', 'Individuals and Societies', 'Integrated Humanities'),
  ('myp', 'Sciences', 'Biology'),
  ('myp', 'Sciences', 'Chemistry'),
  ('myp', 'Sciences', 'Physics'),
  ('myp', 'Sciences', 'Integrated Sciences'),
  ('myp', 'Mathematics', 'Mathematics (Standard)'),
  ('myp', 'Mathematics', 'Mathematics (Extended)'),
  ('myp', 'Arts', 'Visual Arts'),
  ('myp', 'Arts', 'Music'),
  ('myp', 'Arts', 'Drama'),
  ('myp', 'Design', 'Design'),
  ('myp', 'Physical and Health Education', 'PHE')
ON CONFLICT (program, category, name) DO NOTHING;
