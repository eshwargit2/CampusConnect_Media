-- Run this script in your Supabase Dashboard SQL Editor
-- This adds the "status" column to the follows table so we can support "pending" follow requests!

ALTER TABLE follows ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'accepted';

-- Update any existing follows to 'accepted' so old follows don't break
UPDATE follows SET status = 'accepted' WHERE status IS NULL;
