# AI Content Studio — API Specification

## Authentication
All protected endpoints require authenticated user context.

## Content
### POST /api/content
Create a content item.

### GET /api/content
List workspace content.

### GET /api/content/:id
Get content and current version.

### PATCH /api/content/:id
Update metadata/status.

### DELETE /api/content/:id
Delete content where authorized.

## Generation
### POST /api/generation/blog
Start blog generation.

### POST /api/generation/case-study
Start case-study generation.

### GET /api/generation/:id
Get generation status.

### POST /api/generation/:id/retry
Retry a failed generation stage.

## Versions
### GET /api/content/:id/versions
List versions.

### POST /api/content/:id/revise
Generate a revision.

## Research
### GET /api/content/:id/sources
List sources.

## Media
### POST /api/media/upload
Upload an asset.

### POST /api/media/generate
Start image generation.

## Export
### POST /api/content/:id/export
Create an export.

## Security
All endpoints must validate:
- authenticated user
- workspace ownership/membership
- input schema
- allowed content type
- request size
- rate limits
