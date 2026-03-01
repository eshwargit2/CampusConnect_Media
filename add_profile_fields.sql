-- Run this in Supabase SQL Editor to add profile fields

ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS link_instagram TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS link_twitter TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS link_linkedin TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS link_github TEXT DEFAULT '';

-- Done! New profile fields are ready.
