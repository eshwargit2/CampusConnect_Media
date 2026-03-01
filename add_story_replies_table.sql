-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS story_replies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id    UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_replies_story_id ON story_replies(story_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_sender_id ON story_replies(sender_id);
