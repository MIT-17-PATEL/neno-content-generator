-- =========================================================
-- AI Content Studio — Database Migration: 003_auto_blog.sql
-- Scheduled blog automation: settings (+ run lock), topic queue, run history
-- =========================================================

CREATE TABLE IF NOT EXISTS auto_blog_settings (
    workspace_id VARCHAR(64) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    interval_days INTEGER NOT NULL DEFAULT 3,
    preferred_time VARCHAR(5) NOT NULL DEFAULT '10:00',
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    mode VARCHAR(16) NOT NULL DEFAULT 'draft',              -- 'draft' | 'publish'
    cover_preference VARCHAR(16) NOT NULL DEFAULT 'auto',   -- 'auto' | 'diagram' | 'stock' | 'photo'
    notify_email VARCHAR(255),
    use_suggested BOOLEAN NOT NULL DEFAULT FALSE,
    last_post_at TIMESTAMP WITH TIME ZONE,
    last_category VARCHAR(128),
    locked_at TIMESTAMP WITH TIME ZONE,                     -- run lock; stale after 30 minutes
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auto_blog_topics (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    category VARCHAR(128) NOT NULL,
    notes TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'queued',           -- 'queued' | 'suggested' | 'used'
    source VARCHAR(16) NOT NULL DEFAULT 'manual',           -- 'manual' | 'llm' | 'live_trends' (never auto-used)
    position INTEGER NOT NULL DEFAULT 0,
    content_id VARCHAR(64),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auto_blog_topics_ws ON auto_blog_topics(workspace_id, status, position);

CREATE TABLE IF NOT EXISTS auto_blog_runs (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL,
    trigger VARCHAR(16) NOT NULL,                           -- 'scheduled' | 'manual'
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_ms INTEGER NOT NULL,
    mode VARCHAR(16),
    status VARCHAR(16) NOT NULL,                            -- 'published' | 'draft' | 'skipped' | 'failed'
    topic TEXT,
    content_id VARCHAR(64),
    title TEXT,
    reason TEXT,
    error TEXT
);
CREATE INDEX IF NOT EXISTS idx_auto_blog_runs_ws ON auto_blog_runs(workspace_id, started_at DESC);
