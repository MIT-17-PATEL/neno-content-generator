# AI Content Studio — Database Design

## users
- id
- email
- name
- created_at
- updated_at

## workspaces
- id
- owner_id
- name
- description
- created_at
- updated_at

## brand_settings
- id
- workspace_id
- brand_name
- industry
- audience
- tone
- style_guidelines
- prohibited_terms
- preferred_terms
- created_at
- updated_at

## content_items
- id
- workspace_id
- type
- title
- slug
- status
- category
- excerpt
- current_version_id
- created_by
- created_at
- updated_at

## content_versions
- id
- content_id
- version_number
- content
- seo_metadata
- generation_run_id
- created_by
- created_at

## research_sources
- id
- content_id
- url
- title
- publisher
- retrieved_at
- notes
- relevance

## generation_runs
- id
- content_id
- run_type
- status
- model
- prompt_version
- input_data
- output_data
- token_usage
- estimated_cost
- error
- started_at
- completed_at

## media_assets
- id
- workspace_id
- content_id
- type
- storage_key
- public_url
- metadata
- created_at

## prompts
- id
- name
- version
- template
- active
- created_at

## exports
- id
- content_id
- format
- storage_key
- created_at

## Recommended Constraints
- Unique workspace slug/name where required
- Unique content slug within a workspace
- Foreign keys on ownership relationships
- Index content by workspace_id, status, type, updated_at
