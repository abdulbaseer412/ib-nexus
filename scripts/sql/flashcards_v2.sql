-- Flashcards V2 Database Migration

DROP TABLE IF EXISTS public.ib_flashcard_decks CASCADE;
DROP TABLE IF EXISTS public.ib_flashcards CASCADE;
DROP TABLE IF EXISTS public.ib_flashcard_reviews CASCADE;

-- 1. Create Decks Table
CREATE TABLE public.ib_flashcard_decks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  subject text,
  topic text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_reviewed_at timestamptz
);

-- 2. Drop existing rudimentary flashcards table and recreate with Spaced Repetition fields
DROP TABLE IF EXISTS public.ib_flashcards CASCADE;

CREATE TABLE public.ib_flashcards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deck_id uuid REFERENCES public.ib_flashcard_decks(id) ON DELETE CASCADE,
  note_id uuid REFERENCES public.ib_notes(id) ON DELETE SET NULL,
  
  front text NOT NULL,
  back text NOT NULL,
  card_type text DEFAULT 'Basic', -- Basic, Cloze, Concept, Compare, Apply
  
  subject text,
  topic text,
  tags text[] DEFAULT '{}',
  
  -- SM-2 Algorithm Fields
  next_review_at timestamptz DEFAULT now(),
  interval_days real DEFAULT 0,
  ease_factor real DEFAULT 2.5,
  repetitions integer DEFAULT 0,
  lapses integer DEFAULT 0,
  last_reviewed_at timestamptz,
  is_suspended boolean DEFAULT false,
  
  -- AI & Priority Scheduling
  is_ai_generated boolean DEFAULT false,
  priority_date timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create Reviews History Table
CREATE TABLE IF NOT EXISTS public.ib_flashcard_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_id uuid REFERENCES public.ib_flashcards(id) ON DELETE CASCADE NOT NULL,
  
  rating text NOT NULL, -- Again, Hard, Good, Easy
  review_duration_ms integer,
  
  previous_interval real,
  new_interval real,
  previous_ease real,
  new_ease real,
  
  reviewed_at timestamptz DEFAULT now()
);

-- 4. Row Level Security

ALTER TABLE public.ib_flashcard_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own decks" ON public.ib_flashcard_decks FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.ib_flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own flashcards" ON public.ib_flashcards FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.ib_flashcard_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reviews" ON public.ib_flashcard_reviews FOR ALL USING (auth.uid() = user_id);
