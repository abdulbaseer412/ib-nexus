-- Add advanced IB-specific metadata to Notes
ALTER TABLE ib_notes
ADD COLUMN IF NOT EXISTS exam_importance text DEFAULT 'Medium',
ADD COLUMN IF NOT EXISTS revision_readiness integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS folder text;
