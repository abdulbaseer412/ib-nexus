-- Migration: Extend flashcards schema with origin, AI metadata, and source linking

-- 1. Add origin column to decks (enum)
ALTER TABLE public.ib_flashcard_decks
  ADD COLUMN origin TEXT NOT NULL DEFAULT 'manual';

-- 2. Add AI metadata JSONB column
ALTER TABLE public.ib_flashcard_decks
  ADD COLUMN ai_metadata JSONB;

-- 3. Deprecate is_ai_generated flag on cards (keep for backward compatibility)
-- No action needed; we'll continue using it but prefer origin.

-- 4. Create linking table for multiple source notes per card
CREATE TABLE IF NOT EXISTS public.ib_flashcard_sources (
  card_id uuid REFERENCES public.ib_flashcards(id) ON DELETE CASCADE NOT NULL,
  note_id uuid REFERENCES public.ib_notes(id) ON DELETE SET NULL NOT NULL,
  PRIMARY KEY (card_id, note_id)
);

-- 5. Ensure RLS for new table
ALTER TABLE public.ib_flashcard_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own flashcard sources" ON public.ib_flashcard_sources
  FOR ALL USING (auth.uid() = (SELECT user_id FROM public.ib_flashcards WHERE id = card_id));

-- 6. Add origin column to flashcards (enum) for future use
ALTER TABLE public.ib_flashcards
  ADD COLUMN origin TEXT NOT NULL DEFAULT 'manual';

-- 7. Backfill origin for existing cards based on is_ai_generated flag
UPDATE public.ib_flashcards
  SET origin = CASE WHEN is_ai_generated THEN 'ai_from_note' ELSE 'manual' END;

-- 8. Backfill origin for existing decks based on existing data (default is manual)
-- If you have a way to detect AI decks, migrate accordingly in a later script.

-- Note: Keep is_ai_generated column for legacy compatibility; can be dropped in a future migration.
