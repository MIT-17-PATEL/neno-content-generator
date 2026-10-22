-- =========================================================
-- AI Content Studio — Database Migration: 002_add_website_sync_fields.sql
-- Adds website sync status tracking to content_items
-- =========================================================

ALTER TABLE content_items ADD COLUMN IF NOT EXISTS website_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS website_sync_error TEXT;

CREATE INDEX IF NOT EXISTS idx_content_items_synced ON content_items(website_synced_at);
