import { z } from "zod";

export const caseStudyOutputSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  slug: z.string().min(3, "Slug is required"),
  category: z.string().optional(),
  clientOwner: z.string().optional(),
  publishDate: z.string().optional(),
  status: z.string().optional().default("Draft"),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  description: z.string().optional(),
  excerpt: z.string().min(10, "Excerpt is required"),
  clientIndustry: z.string(),
  overview: z.string().min(20, "Overview is required"),
  challengeText: z.string().optional(),
  challenge: z.string().min(20, "Challenge section is required"),
  existingProcess: z.string().optional(),
  solutionText: z.string().optional(),
  proposedSolution: z.string().min(20, "Proposed solution is required"),
  implementation: z.string().min(20, "Implementation section is required"),
  techStack: z.union([z.string(), z.array(z.string())]).optional(),
  technology: z.array(z.string()).min(1, "At least one technology is required"),
  impactMetrics: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    )
    .optional(),
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
  ctaButtonText: z.string().optional().default("Discuss Similar Project"),
  ctaButtonLink: z.string().optional().default("/contact-us"),
  fullMarkdown: z.string().min(100, "Full markdown document is required"),
  seo: z.object({
    seoTitle: z
      .string()
      .transform((val) => (val.length > 70 ? val.slice(0, 67) + "..." : val)),
    metaDescription: z
      .string()
      .transform((val) => (val.length > 165 ? val.slice(0, 162) + "..." : val)),
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
