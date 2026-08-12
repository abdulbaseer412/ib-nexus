-- IB Nexus Notes & Flashcards Schema Setup

-- 1. Create the Notes Table
CREATE TABLE IF NOT EXISTS ib_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text,
  subject text NOT NULL,
  topic text,
  level text,
  tags text[] DEFAULT '{}',
  is_favorite boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_opened_at timestamptz DEFAULT now()
);

-- 2. Create the Flashcards Table (Basic schema for integration)
CREATE TABLE IF NOT EXISTS ib_flashcards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note_id uuid REFERENCES ib_notes(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  subject text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Set up Row Level Security (RLS) for Notes
ALTER TABLE ib_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes" 
  ON ib_notes FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes" 
  ON ib_notes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
  ON ib_notes FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
  ON ib_notes FOR DELETE 
  USING (auth.uid() = user_id);

-- 4. Set up Row Level Security (RLS) for Flashcards
ALTER TABLE ib_flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flashcards" 
  ON ib_flashcards FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcards" 
  ON ib_flashcards FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards" 
  ON ib_flashcards FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards" 
  ON ib_flashcards FOR DELETE 
  USING (auth.uid() = user_id);
