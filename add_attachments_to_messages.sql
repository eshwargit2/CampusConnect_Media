-- ── Add Attachment Columns to Messages Table ──────────────────────────
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New Query)
-- if the migration script is not able to execute it automatically.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT DEFAULT NULL;
