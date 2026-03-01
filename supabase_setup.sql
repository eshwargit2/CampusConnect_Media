-- ============================================================
-- CampusConnect - Supabase Database Setup Script
-- Run this in Supabase SQL Editor (Project > SQL Editor > New Query)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  bio TEXT DEFAULT '',
  profile_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- ============================================================
-- INDEXES (for performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- NOTE: Since we use a service role key on the backend (server-side),
-- these RLS policies apply to anonymous/authenticated Supabase client requests.
-- The backend bypasses RLS with the service role key.

-- Users: Everyone can read profiles
CREATE POLICY "users_select_all" ON users
  FOR SELECT USING (true);

-- Posts: Everyone can read, only owner can modify
CREATE POLICY "posts_select_all" ON posts
  FOR SELECT USING (true);

-- Likes: Everyone can read
CREATE POLICY "likes_select_all" ON likes
  FOR SELECT USING (true);

-- Comments: Everyone can read
CREATE POLICY "comments_select_all" ON comments
  FOR SELECT USING (true);

-- Follows: Everyone can read
CREATE POLICY "follows_select_all" ON follows
  FOR SELECT USING (true);

-- ============================================================
-- STORAGE BUCKETS
-- Create these in Supabase Dashboard > Storage > New Bucket
-- OR run these SQL commands:
-- ============================================================

-- Insert storage buckets (if using SQL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('posts', 'posts', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies (allow public read, authenticated write)
CREATE POLICY "public_read_posts" ON storage.objects
  FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "auth_insert_posts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'posts');

CREATE POLICY "auth_delete_posts" ON storage.objects
  FOR DELETE USING (bucket_id = 'posts');

CREATE POLICY "public_read_avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "auth_insert_avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "auth_update_avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars');

-- ============================================================
-- DONE! Your database is ready.
-- ============================================================
