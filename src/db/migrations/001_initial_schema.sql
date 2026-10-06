-- =========================================================
-- AI Content Studio — Database Migration: 001_initial_schema.sql
-- =========================================================

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. WORKSPACES
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(64) PRIMARY KEY,
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);

-- WORKSPACE MEMBERS (Authorization & Multi-Tenancy)
CREATE TABLE IF NOT EXISTS workspace_members (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'editor', -- 'owner', 'admin', 'editor', 'viewer'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON workspace_members(workspace_id);

-- 3. BRAND SETTINGS
CREATE TABLE IF NOT EXISTS brand_settings (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
    brand_name VARCHAR(255) NOT NULL,
    industry VARCHAR(255) NOT NULL,
    audience VARCHAR(255) NOT NULL,
    tone VARCHAR(255) NOT NULL,
    style_guidelines TEXT,
    preferred_terms JSONB DEFAULT '[]'::jsonb,
    prohibited_terms JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brand_settings_ws ON brand_settings(workspace_id);

-- 4. CONTENT ITEMS
CREATE TABLE IF NOT EXISTS content_items (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL, -- 'blog', 'case-study'
    title VARCHAR(512) NOT NULL,
    slug VARCHAR(512) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft', -- 'draft', 'generating', 'in_review', 'approved', 'exported'
    category VARCHAR(128) NOT NULL DEFAULT 'General',
    excerpt TEXT,
    current_version_id VARCHAR(64),
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by VARCHAR(64),
    permanent_delete_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (workspace_id, slug)
);

-- Ensure columns exist if table was already created
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(64);
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS permanent_delete_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_content_items_ws ON content_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(type);
CREATE INDEX IF NOT EXISTS idx_content_items_updated ON content_items(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_items_deleted ON content_items(deleted_at);

-- 5. CONTENT VERSIONS
CREATE TABLE IF NOT EXISTS content_versions (
    id VARCHAR(64) PRIMARY KEY,
    content_id VARCHAR(64) NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    seo_metadata JSONB DEFAULT '{}'::jsonb,
    generation_run_id VARCHAR(64),
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (content_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_content_versions_content ON content_versions(content_id);

-- 6. RESEARCH SOURCES
CREATE TABLE IF NOT EXISTS research_sources (
    id VARCHAR(64) PRIMARY KEY,
    content_id VARCHAR(64) REFERENCES content_items(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    title VARCHAR(512) NOT NULL,
    publisher VARCHAR(255),
    retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    relevance VARCHAR(64)
);

ALTER TABLE research_sources ALTER COLUMN content_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_research_sources_content ON research_sources(content_id);

-- 7. GENERATION RUNS
CREATE TABLE IF NOT EXISTS generation_runs (
    id VARCHAR(64) PRIMARY KEY,
    content_id VARCHAR(64) REFERENCES content_items(id) ON DELETE SET NULL,
    run_type VARCHAR(64) NOT NULL, -- 'blog_full', 'case_study', 'rewrite', 'seo'
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    model VARCHAR(128) NOT NULL,
    prompt_version VARCHAR(64),
    input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    token_usage INTEGER DEFAULT 0,
    estimated_cost NUMERIC(10, 6) DEFAULT 0,
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE generation_runs ALTER COLUMN content_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generation_runs_content ON generation_runs(content_id);
CREATE INDEX IF NOT EXISTS idx_generation_runs_status ON generation_runs(status);

-- 8. MEDIA ASSETS
CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    content_id VARCHAR(64) REFERENCES content_items(id) ON DELETE SET NULL,
    type VARCHAR(64) NOT NULL, -- 'featured_image', 'inline_diagram', 'attachment'
    storage_key VARCHAR(512) NOT NULL,
    public_url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_assets_ws ON media_assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_content ON media_assets(content_id);

-- 9. PROMPTS
CREATE TABLE IF NOT EXISTS prompts (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    version VARCHAR(32) NOT NULL,
    template TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, version)
);

CREATE INDEX IF NOT EXISTS idx_prompts_active ON prompts(active);

-- 10. EXPORTS
CREATE TABLE IF NOT EXISTS exports (
    id VARCHAR(64) PRIMARY KEY,
    content_id VARCHAR(64) NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    format VARCHAR(32) NOT NULL, -- 'markdown', 'html', 'json'
    storage_key VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exports_content ON exports(content_id);
