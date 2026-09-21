-- 20250826000001_extend_planner_notes.sql
-- Add note_id to planner_tasks and planner_sessions

ALTER TABLE planner_tasks
  ADD COLUMN note_id uuid NULL REFERENCES ib_notes(id) ON DELETE SET NULL;

ALTER TABLE planner_sessions
  ADD COLUMN note_id uuid NULL REFERENCES ib_notes(id) ON DELETE SET NULL;
