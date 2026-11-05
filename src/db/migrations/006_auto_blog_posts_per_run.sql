-- =========================================================
-- AI Content Studio — Database Migration: 006_auto_blog_posts_per_run.sql
-- "Every N days" can make several posts per due day (a day plan in auto_blog_plan), plus a daily summary
-- and an image-quota marker. Requires 005 (auto_blog_plan). Only touches auto_blog_settings and auto_blog_plan.
-- =========================================================

ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS posts_per_run SMALLINT NOT NULL DEFAULT 1;            -- 1-10
ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS spread_mode VARCHAR(16) NOT NULL DEFAULT 'spread';     -- 'spread' | 'all_at_once'
ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS last_batch_at TIMESTAMP WITH TIME ZONE;               -- IST day the last batch was planned
ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS last_digest_batch_at TIMESTAMP WITH TIME ZONE;        -- batch the last summary email covered
ALTER TABLE auto_blog_settings ADD COLUMN IF NOT EXISTS image_limited_until TIMESTAMP WITH TIME ZONE;         -- Gemini image 429 seen: no AI photos until then

-- 'weekly' (posts-per-week slot) | 'batch' (every-N-days day plan); existing rows are weekly slots
ALTER TABLE auto_blog_plan ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'weekly';
ALTER TABLE auto_blog_plan ADD COLUMN IF NOT EXISTS batch_at TIMESTAMP WITH TIME ZONE;                        -- IST day start of the batch
CREATE INDEX IF NOT EXISTS idx_auto_blog_plan_kind ON auto_blog_plan(workspace_id, kind, status, slot_at);
