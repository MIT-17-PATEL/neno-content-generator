export type ContentType = "blog" | "case-study";

export type ContentStatus =
  | "draft"
  | "generating"
  | "in_review"
  | "approved"
  | "exported";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandSettings {
  id: string;
  workspaceId: string;
  brandName: string;
  industry: string;
  audience: string;
  tone: string;
  styleGuidelines?: string;
  preferredTerms: string[];
  prohibitedTerms: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentItem {
  id: string;
  workspaceId: string;
  type: ContentType;
  title: string;
  slug: string;
  status: ContentStatus;
  category: string;
  excerpt?: string;
  currentVersionId?: string;
  createdBy: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  permanentDeleteAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentVersion {
  id: string;
  contentId: string;
  versionNumber: number;
  content: string;
  seoMetadata: {
    seoTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    slug?: string;
    featuredImageBrief?: string;
    featuredImagePrompt?: string;
    coverImage?: string;
    ogImage?: string;
    featuredImageUrl?: string;
    canonicalUrl?: string;
    author?: string;
    tags?: string[];
  };
  generationRunId?: string;
  createdBy: string;
  createdAt: string;
}

export type MediaType = "featured_image" | "inline_diagram" | "infographic" | "attachment";
export type ImageAspectRatio = "16:9" | "1:1" | "4:3" | "9:16";
export type ImageStylePreset =
  | "dark_tech"
  | "minimalist_vector"
  | "architectural_blueprint"
  | "editorial_photo"
  | "isometric_3d";

export interface MediaAsset {
  id: string;
  workspaceId: string;
  contentId?: string;
  type: MediaType;
  title: string;
  prompt?: string;
  altText?: string;
  aspectRatio?: ImageAspectRatio;
  style?: ImageStylePreset;
  storageKey: string;
  publicUrl: string;
  fileSize?: number;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type ExportFormat = "markdown" | "html" | "json";

export interface ExportRecord {
  id: string;
  contentId: string;
  format: ExportFormat;
  storageKey?: string;
  createdAt: string;
}

export interface ExportFormattedResult {
  format: ExportFormat;
  filename: string;
  mimeType: string;
  content: string;
  metadata: {
    title: string;
    slug: string;
    wordCount: number;
    readingTimeMinutes: number;
    exportedAt: string;
    versionNumber: number;
  };
}

export type AuditAction =
  | "AUTH_LOGIN"
  | "AUTH_SIGNUP"
  | "AUTH_SIGNOUT"
  | "CONTENT_CREATE"
  | "CONTENT_UPDATE"
  | "CONTENT_DELETE"
  | "CONTENT_STATUS_CHANGE"
  | "GENERATION_START"
  | "GENERATION_COMPLETE"
  | "GENERATION_RETRY"
  | "MEDIA_UPLOAD"
  | "MEDIA_GENERATE"
  | "MEDIA_DELETE"
  | "EXPORT_TRIGGER"
  | "SETTINGS_UPDATE";

export interface AuditEvent {
  id: string;
  workspaceId?: string;
  userId?: string;
  userEmail?: string;
  action: AuditAction;
  resourceId?: string;
  resourceType?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}
