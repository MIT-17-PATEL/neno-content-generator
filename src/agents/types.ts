export interface AgentContext {
  workspaceId: string;
  brandContext?: {
    brandName: string;
    industry: string;
    audience: string;
    tone: string;
    prohibitedTerms: string[];
    preferredTerms: string[];
  };
}

export interface ResearchAgentOutput {
  summary: string;
  keyFacts: string[];
  sources: Array<{
    url: string;
    title: string;
    publisher?: string;
    notes?: string;
  }>;
  openQuestions?: string[];
}

export interface StrategistAgentOutput {
  angle: string;
  outline: Array<{
    heading: string;
    goals: string;
    keyPoints: string[];
  }>;
  recommendedExamples?: string[];
}

export interface WriterAgentOutput {
  title: string;
  excerpt: string;
  content: string;
}

export interface SeoAgentOutput {
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  slug: string;
  internalLinkSuggestions: string[];
}

export interface ImageAgentOutput {
  imageBrief: string;
  generationPrompt: string;
  altText: string;
}

export interface QaIssue {
  type: "structure" | "readability" | "repetition" | "unsupported_claim" | "brand_rule" | "seo" | "formatting";
  severity: "low" | "medium" | "high";
  message: string;
  suggestion?: string;
}

export interface QaAgentOutput {
  passed: boolean;
  score: number;
  issues: QaIssue[];
}
