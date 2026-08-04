-- ============================================================
-- CampusConnect - Multiple Image & Document Upload Setup
-- Run this in Supabase SQL Editor (Project > SQL Editor > New Query)
-- ============================================================

-- Add image_urls column to posts table if it does not exist
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}'::text[];

-- Migrate existing posts where image_urls is empty but image_url is populated
UPDATE posts 
SET image_urls = ARRAY[image_url] 
WHERE (image_urls IS NULL OR cardinality(image_urls) = 0) AND image_url IS NOT NULL AND image_url <> '';

-- Update allowed mime types on posts storage bucket to support PDF and PPT/Office docs
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/webm',
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
]
WHERE id = 'posts';

