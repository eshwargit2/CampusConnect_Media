-- Run this script in your Supabase Dashboard SQL Editor
-- 1. Go to your Supabase project (mfapbcqfdoqwbpyedirv)
-- 2. Click on "SQL Editor" on the left sidebar
-- 3. Paste and RUN the following commands:

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hide_likes BOOLEAN DEFAULT false;

-- After running this successfully, reload your website and try changing the profile settings again!
