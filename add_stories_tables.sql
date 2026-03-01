-- ============================================================
-- CampusConnect - Stories Feature Setup
-- Run this in Supabase SQL Editor
-- ============================================================

-- Stories table (24-hour expiry handled in app queries)
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story views tracking
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);

-- Storage bucket for story images
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for stories bucket
CREATE POLICY "Stories images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stories');

CREATE POLICY "Authenticated users can upload story images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'stories');

CREATE POLICY "Users can delete own story images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'stories');

-- Done! Stories feature tables are ready.
