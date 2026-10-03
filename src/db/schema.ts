/**
 * AI Content Studio — Database Schema Definitions
 * Entities: users, workspaces, brand_settings, content_items, content_versions,
 * research_sources, generation_runs, media_assets, prompts, exports
 */

export interface DbUser {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbWorkspace {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbBrandSettings {
  id: string;
  workspace_id: string;
  brand_name: string;
  industry: string;
  audience: string;
  tone: string;
  style_guidelines?: string;
  prohibited_terms: string[];
  preferred_terms: string[];
  created_at: Date;
  updated_at: Date;
}

export interface DbContentItem {
  id: string;
  workspace_id: string;
  type: "blog" | "case-study";
  title: string;
  slug: string;
  status: "draft" | "generating" | "in_review" | "approved" | "exported";
  category: string;
  excerpt?: string;
  current_version_id?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbContentVersion {
  id: string;
  content_id: string;
  version_number: number;
  content: string;
  seo_metadata: Record<string, unknown>;
  generation_run_id?: string;
  created_by: string;
  created_at: Date;
}

export interface DbResearchSource {
  id: string;
  content_id: string;
  url: string;
  title: string;
  publisher?: string;
  retrieved_at: Date;
  notes?: string;
  relevance?: string;
}

export interface DbGenerationRun {
  id: string;
  content_id: string;
  run_type: string;
  status: "pending" | "running" | "completed" | "failed";
  model: string;
  prompt_version?: string;
  input_data: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  token_usage?: number;
  estimated_cost?: number;
  error?: string;
  started_at: Date;
  completed_at?: Date;
}

export interface DbMediaAsset {
  id: string;
  workspace_id: string;
  content_id?: string;
  type: string;
  storage_key: string;
  public_url: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface DbPrompt {
  id: string;
  name: string;
  version: string;
  template: string;
  active: boolean;
  created_at: Date;
}

export interface DbExport {
  id: string;
  content_id: string;
  format: "markdown" | "html" | "json";
  storage_key?: string;
  created_at: Date;
}
