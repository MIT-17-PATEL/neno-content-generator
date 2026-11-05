-- =========================================================
-- AI Content Studio — Database Migration: 004_auto_blog_live_trends.sql
-- Blog automation can take topics from live trends: topic source setting + trend provenance on topics.
-- Only adds columns to the auto_blog_* tables from 003; no other table is touched.
-- =========================================================

-- 'queue' | 'live' | 'queue_then_live'
ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS topic_source VARCHAR(24) NOT NULL DEFAULT 'queue_then_live';

-- For source = 'live' topics: the original trend headline and its source URLs (JSON array of strings)
ALTER TABLE auto_blog_topics ADD COLUMN IF NOT EXISTS trend_headline TEXT;
ALTER TABLE auto_blog_topics ADD COLUMN IF NOT EXISTS source_urls JSONB;
