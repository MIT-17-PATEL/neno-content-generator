-- =========================================================
-- AI Content Studio — Database Migration: 005_auto_blog_weekly_plan.sql
-- "Posts per week" scheduling: schedule settings + the weekly plan of post slots.
-- Only adds columns to auto_blog_settings and creates auto_blog_plan; no other table is touched.
-- =========================================================

-- 'interval' (every N days, the existing behaviour) | 'weekly' (posts per week)
ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(16) NOT NULL DEFAULT 'interval';
ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS posts_per_week SMALLINT NOT NULL DEFAULT 3;
ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS random_count BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS posts_min SMALLINT NOT NULL DEFAULT 2;
ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS posts_max SMALLINT NOT NULL DEFAULT 4;
ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS window_start VARCHAR(5) NOT NULL DEFAULT '09:00';  -- Asia/Kolkata
ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS window_end VARCHAR(5) NOT NULL DEFAULT '19:00';
ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS allowed_days SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}'; -- ISO: 1 = Mon ... 7 = Sun

CREATE TABLE IF NOT EXISTS auto_blog_plan (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL,
    week_start TIMESTAMP WITH TIME ZONE NOT NULL,          -- Monday 00:00 Asia/Kolkata
    slot_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',          -- 'pending' | 'running' | 'done' | 'failed' | 'skipped'
    content_id VARCHAR(64),
    attempts SMALLINT NOT NULL DEFAULT 0,                   -- failed generations; retried up to 3 times
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auto_blog_plan_ws_week ON auto_blog_plan(workspace_id, week_start, slot_at);
