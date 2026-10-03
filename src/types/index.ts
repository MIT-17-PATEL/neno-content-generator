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
