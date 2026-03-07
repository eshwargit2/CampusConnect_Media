-- Run this in Supabase SQL Editor
-- Step 1: Add the is_verified column (defaults to FALSE for new users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Step 2: Mark ALL existing users as verified so they aren't locked out
UPDATE users 
SET is_verified = TRUE 
WHERE is_verified IS NULL OR is_verified = FALSE;

-- Step 3: Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'is_verified';
