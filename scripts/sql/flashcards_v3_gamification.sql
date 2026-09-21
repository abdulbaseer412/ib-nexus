-- Flashcards V3 Gamification & Streaks Migration

-- 1. Create Profiles Table for Streaks & Preferences
CREATE TABLE IF NOT EXISTS public.ib_flashcard_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_streak integer DEFAULT 0,
  best_streak integer DEFAULT 0,
  last_active_date date,
  ai_generation_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ib_flashcard_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profiles" ON public.ib_flashcard_profiles FOR ALL USING (auth.uid() = user_id);

-- 2. Add Status column to Flashcards
ALTER TABLE public.ib_flashcards 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'New'; 
-- 'New', 'Read', 'Mastered'
