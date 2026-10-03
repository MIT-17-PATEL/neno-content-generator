import { z } from "zod";

export const blogGenerationOutputSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  slug: z.string().min(3, "Slug is required"),
  excerpt: z.string().min(10, "Excerpt must be at least 10 characters"),
  outline: z.array(
    z.object({
      heading: z.string(),
      description: z.string(),
      keyPoints: z.array(z.string()),
    })
  ),
  article: z.string().min(100, "Article content must be at least 100 characters"),
  seo: z.object({
    seoTitle: z
      .string()
      .transform((val) => (val.length > 70 ? val.slice(0, 67) + "..." : val)),
    metaDescription: z
      .string()
      .transform((val) => (val.length > 165 ? val.slice(0, 162) + "..." : val)),
    keywords: z.array(z.string()).min(1, "At least one keyword is required"),
    slug: z.string(),
  }),
  featuredImage: z.object({
    brief: z.string(),
    prompt: z.string(),
    altText: z.string(),
  }),
  sources: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      publisher: z.string().optional(),
      notes: z.string().optional(),
    })
  ).default([]),
});

export type BlogGenerationOutput = z.infer<typeof blogGenerationOutputSchema>;
