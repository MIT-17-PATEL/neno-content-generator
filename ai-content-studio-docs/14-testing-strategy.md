# AI Content Studio — Testing Strategy

## Unit Tests
Test:
- Slug generation
- Validation schemas
- Prompt builders
- Content transformations
- Permission checks

## Integration Tests
Test:
- Database CRUD
- Generation API
- Agent orchestration
- Research storage
- Media storage
- Export

## End-to-End Tests
Test:
1. Sign in.
2. Create workspace.
3. Generate blog.
4. Review research.
5. Edit article.
6. Save draft.
7. Generate image.
8. Export.
9. Approve content.

## Failure Tests
Simulate:
- AI timeout
- Research provider failure
- Database timeout
- Invalid AI JSON
- Image generation failure
- Duplicate generation request
- Unauthorized workspace access

## AI Evaluation
Maintain a small benchmark set and evaluate:
- factuality
- completeness
- style adherence
- SEO quality
- formatting
- hallucination rate
- source coverage
