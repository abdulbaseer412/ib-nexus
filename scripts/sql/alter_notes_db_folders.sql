-- Upgrade IB Notes to support Folders and Priority Tiers

-- 1. Add folder structure columns
ALTER TABLE ib_notes
ADD COLUMN IF NOT EXISTS is_folder boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES ib_notes(id) ON DELETE CASCADE;

-- 2. Update priority defaults to new attractive terminology
-- Let's ensure the column exists first, in case the previous alter script was missed
ALTER TABLE ib_notes
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES ib_notes(id) ON DELETE CASCADE;
ADD COLUMN IF NOT EXISTS is_folder boolean DEFAULT false;
ADD COLUMN IF NOT EXISTS exam_importance text DEFAULT 'Mid-Level';

-- Update any existing rows to have the default if null or empty
UPDATE ib_notes 
SET exam_importance = 'Mid-Level' 
WHERE exam_importance IS NULL OR exam_importance = 'Medium' OR exam_importance = 'Core Concept';

-- Optional: Modify default for future inserts
ALTER TABLE ib_notes
ALTER COLUMN exam_importance SET DEFAULT 'Mid-Level';
