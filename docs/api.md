# AI Content Studio — API Specification

## Conventions
- Base URL: `/api`
- Content Type: `application/json`
- Security: All non-public endpoints require session/bearer authentication and enforce workspace membership.

## Core Endpoints
### Authentication & Workspace
- `GET /api/workspaces` — List workspaces for the authenticated user
- `POST /api/workspaces` — Create a workspace
- `GET /api/workspaces/:id/brand` — Get brand voice settings
- `PUT /api/workspaces/:id/brand` — Update brand voice settings

### Content Management
- `GET /api/content` — List workspace content with filters (status, type, search)
- `POST /api/content` — Create empty content draft
- `GET /api/content/:id` — Get content item with current version and research
- `PATCH /api/content/:id` — Update status, category, or title
- `DELETE /api/content/:id` — Soft-delete or remove content

### Generation Pipeline
- `POST /api/generation/blog` — Trigger multi-agent blog pipeline
- `POST /api/generation/case-study` — Trigger B2B case study pipeline
- `GET /api/generation/:runId` — Poll status of background run
- `POST /api/generation/:runId/retry` — Retry a specific failed agent step

### Versions, Research & Media
- `GET /api/content/:id/versions` — Get version history
- `POST /api/content/:id/version` — Save manual user edits as a new version
- `GET /api/content/:id/sources` — List attached citations
- `POST /api/media/generate` — Generate visual asset with AI
- `POST /api/content/:id/export` — Generate formatted bundle (Markdown / HTML / JSON)
