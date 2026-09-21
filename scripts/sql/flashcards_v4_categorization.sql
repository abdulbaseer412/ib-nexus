-- Add is_ai_generated to ib_flashcard_decks
ALTER TABLE ib_flashcard_decks 
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

-- Make existing AI generated deck from demo script marked as AI
UPDATE ib_flashcard_decks 
SET is_ai_generated = true 
WHERE title LIKE '[AI]%';
