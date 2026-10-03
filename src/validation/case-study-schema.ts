import { z } from "zod";

export const caseStudyOutputSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  slug: z.string().min(3, "Slug is required"),
  excerpt: z.string().min(10, "Excerpt is required"),
  clientIndustry: z.string(),
  overview: z.string().min(20, "Overview is required"),
  challenge: z.string().min(20, "Challenge section is required"),
  existingProcess: z.string().optional(),
  proposedSolution: z.string().min(20, "Proposed solution is required"),
  implementation: z.string().min(20, "Implementation section is required"),
  technology: z.array(z.string()).min(1, "At least one technology is required"),
  results: z.array(
    z.object({
      metric: z.string(),
      before: z.string(),
      after: z.string(),
      impact: z.string(),
    })
  ).min(1, "At least one result metric is required"),
  businessImpact: z.string().min(20, "Business impact is required"),
  conclusion: z.string().min(20, "Conclusion is required"),
  fullMarkdown: z.string().min(100, "Full markdown document is required"),
  seo: z.object({
    seoTitle: z.string().max(70),
    metaDescription: z.string().max(170),
    keywords: z.array(z.string()).min(1),
    slug: z.string(),
  }),
  featuredVisual: z.object({
    brief: z.string(),
    prompt: z.string(),
    altText: z.string(),
  }),
});

export type CaseStudyOutput = z.infer<typeof caseStudyOutputSchema>;
