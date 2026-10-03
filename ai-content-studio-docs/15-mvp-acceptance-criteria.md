# AI Content Studio — MVP Acceptance Criteria

## Blog
- User can enter a topic and generate a complete draft.
- Draft contains title, slug, excerpt, body, and SEO metadata.
- User can edit the content.
- User can save multiple versions.
- Research sources are visible.
- User can generate a featured-image prompt.
- Draft is not automatically published.

## Case Study
- User can enter structured project/client information.
- System generates a consistent case-study structure.
- User can edit and save the result.

## Workspace
- Brand settings influence generated content.
- Workspace data is isolated between users/workspaces.

## Reliability
- Failed generation can be retried.
- Partial results are retained where possible.
- Duplicate submissions do not create duplicate content.

## Security
- Unauthenticated users cannot access private content.
- Users cannot access another workspace's content.
- API keys remain server-side.

## Export
- Markdown export works.
- HTML export works.
- JSON export works.

## Quality
- AI output passes schema validation.
- QA stage reports identified issues.
- Human approval is required before publishing.
