# AI Content Studio — Technical Stack

## Frontend
- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui or an equivalent accessible component system
- Rich-text/Markdown editor

## Backend
- Next.js App Router API routes for MVP
- TypeScript
- Zod for request/response validation
- Background job layer when generation becomes long-running

## AI Layer
- LLM API for research synthesis, planning, writing, SEO, and QA
- Structured JSON outputs for agent-to-agent communication
- Prompt templates stored/versioned separately from application UI
- Optional model routing for different tasks

## Research
- Search/retrieval provider
- Source URL and title capture
- Source snippets/notes
- Citation/source association with generated claims where practical

## Database
PostgreSQL.

Core entities:
- users
- workspaces
- brand_settings
- content_items
- content_versions
- research_sources
- generation_runs
- prompts
- media_assets
- exports

## Storage
- AWS S3 for generated/uploaded media
- CDN delivery for images

## Authentication
- Managed authentication provider or secure NextAuth/Auth.js-style implementation
- Role-based access for owner/editor/reviewer

## Deployment
- Frontend/API: Vercel or AWS
- Database: managed PostgreSQL
- Object storage: S3
- CI/CD: GitHub Actions or platform-native deployments

## Observability
- Structured application logs
- AI generation run logs
- Error tracking
- Request IDs
- Cost/token monitoring
