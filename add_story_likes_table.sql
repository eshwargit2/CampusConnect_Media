-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS story_likes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (story_id, user_id)   -- one like per user per story
);

CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_user_id  ON story_likes(user_id);
