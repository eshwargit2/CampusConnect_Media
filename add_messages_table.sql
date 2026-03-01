-- ── Messages table ────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookup by participant
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- NOTE: We disable RLS since the backend uses the service role key
-- which bypasses RLS anyway. Enable only if you add user-facing Supabase client calls.
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
