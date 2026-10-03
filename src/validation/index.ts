import { z } from "zod";

export const brandSettingsSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  industry: z.string().min(1, "Industry is required"),
  audience: z.string().min(1, "Target audience is required"),
  tone: z.string().min(1, "Tone of voice is required"),
  styleGuidelines: z.string().optional(),
  preferredTerms: z.array(z.string()).default([]),
  prohibitedTerms: z.array(z.string()).default([]),
});

export const blogGenerationInputSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  audience: z.string().min(2, "Audience is required"),
  tone: z.string().min(2, "Tone is required"),
  desiredLength: z.enum(["short", "medium", "long"]).default("medium"),
  category: z.string().min(1, "Category is required"),
  researchPreference: z.boolean().default(true),
});

export const caseStudyInputSchema = z.object({
  clientIndustry: z.string().min(2, "Client / Industry is required"),
  businessChallenge: z.string().min(10, "Business challenge is required"),
  existingProcess: z.string().optional(),
  proposedSolution: z.string().min(10, "Proposed solution is required"),
  technology: z.string().min(2, "Technology stack is required"),
  resultsMetrics: z.string().min(5, "Results and metrics are required"),
  targetAudience: z.string().min(2, "Target audience is required"),
});
