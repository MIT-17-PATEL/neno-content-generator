# AI Content Studio — Database Architecture

## Technology
- **Engine**: PostgreSQL
- **Schema Access**: Server-side query layer with workspace tenant scoping

## Core Tables
1. `users`: System users and credentials.
2. `workspaces`: Tenant boundary.
3. `brand_settings`: Audience, tone, industry, preferred & prohibited vocabulary.
4. `content_items`: High-level content metadata (title, slug, status, category, current version).
5. `content_versions`: Immutable historical snapshots of draft text and SEO metadata.
6. `research_sources`: Grounding citations, URLs, publisher details, notes.
7. `generation_runs`: Complete execution history with prompt version, token usage, model name, and raw I/O.
8. `media_assets`: S3 storage keys and URLs for generated or uploaded graphics.
9. `prompts`: Versioned prompt templates.
10. `exports`: Record of generated markdown/HTML/JSON exports.

## Constraints & Indexes
- Foreign key cascading on workspace deletions.
- Unique constraint on `(workspace_id, slug)` for content items.
- Indexes on `(workspace_id, status)`, `(workspace_id, updated_at)`, `(content_id, version_number)`.
