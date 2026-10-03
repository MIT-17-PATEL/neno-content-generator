# AI Content Studio — Agent Design

## Research Agent
Input:
- Topic
- Audience
- Workspace brand context

Output:
- Research summary
- Key facts
- Source list
- Open questions

## Content Strategist
Input:
- Research
- Topic
- Audience
- Desired length

Output:
- Article angle
- Outline
- Section goals
- Recommended examples

## Writer Agent
Input:
- Outline
- Research
- Brand voice

Output:
- Draft content

## SEO Agent
Output:
- SEO title
- Meta description
- Keywords
- Slug
- Internal-link suggestions

## Image Agent
Output:
- Image brief
- Generation prompt
- Alt text

## QA Agent
Checks:
- Structure
- Readability
- Duplicate/repeated sections
- Unsupported claims
- Source coverage
- Brand rules
- SEO requirements
- Formatting

## Orchestrator
The orchestrator:
1. Creates generation run.
2. Executes stages.
3. Saves intermediate outputs.
4. Handles retries.
5. Stops safely on hard failures.
6. Produces a final draft.
7. Marks the content for human review.

## Human-in-the-Loop
AI should not automatically publish content in MVP.
