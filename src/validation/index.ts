import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters"),
  description: z.string().optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters").optional(),
  description: z.string().optional(),
});

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
  customImagePrompt: z.string().optional(),
  imageStyle: z
    .enum([
      "dark_tech",
      "isometric_3d",
      "minimalist_vector",
      "architectural_blueprint",
      "editorial_photo",
    ])
    .optional(),
  autoGenerateImage: z.boolean().optional().default(true),
});

export const caseStudyInputSchema = z.object({
  clientIndustry: z.string().min(2, "Client / Industry is required"),
  businessChallenge: z.string().min(10, "Business challenge is required"),
  existingProcess: z.string().optional(),
  proposedSolution: z.string().min(10, "Proposed solution is required"),
  technology: z.string().min(2, "Technology stack is required"),
  resultsMetrics: z.string().min(5, "Results and metrics are required"),
  targetAudience: z.string().min(2, "Target audience is required"),
  customImagePrompt: z.string().optional(),
  imageStyle: z
    .enum([
      "dark_tech",
      "isometric_3d",
      "minimalist_vector",
      "architectural_blueprint",
      "editorial_photo",
    ])
    .optional(),
  autoGenerateImage: z.boolean().optional().default(true),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type BrandSettingsInput = z.infer<typeof brandSettingsSchema>;
