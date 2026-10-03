import { AgentContext, SeoAgentOutput, WriterAgentOutput } from "./types";
import { generateSlug } from "@/services/content-service";
import { callAiStructured, isAiConfigured } from "@/lib/ai/ai-client";

export class SeoAgent {
  static async execute(
    topic: string,
    category: string,
    writerOutput: WriterAgentOutput,
    context: AgentContext
  ): Promise<SeoAgentOutput> {
    const cleanSlug = generateSlug(topic);

    if (isAiConfigured()) {
      try {
        const res = await callAiStructured<SeoAgentOutput>({
          systemPrompt: `You are the SEO Optimization Agent.
Generate search-optimized metadata, meta descriptions (under 160 chars), high-intent keywords, and internal link suggestions.
Return JSON:
{
  "seoTitle": "Title under 60 chars",
  "metaDescription": "Description under 160 chars",
  "keywords": ["keyword 1", "keyword 2", "keyword 3"],
  "slug": "url-slug",
  "internalLinkSuggestions": ["Topic anchor 1", "Topic anchor 2"]
}`,
          userPrompt: `Optimize SEO for article titled "${writerOutput.title}" in category "${category}".`,
        });

        if (res?.seoTitle && res?.metaDescription) {
          return res;
        }
      } catch (err) {
        console.warn("SEO Agent fallback notice:", err);
      }
    }

    // Heuristic SEO Output
    return {
      seoTitle: `${topic} — Architecture & Implementation Guide`,
      metaDescription: `Discover the architectural patterns, latency benchmarks, and implementation strategies for ${topic}. Comprehensive guide for engineering teams.`,
      keywords: [
        topic.toLowerCase(),
        `${category.toLowerCase()} architecture`,
        "distributed systems",
        "scalability benchmarks",
        "fault isolation",
      ],
      slug: cleanSlug,
      internalLinkSuggestions: [
        "Distributed Transaction Logging in Microservices",
        "Observability and Telemetry in Cloud Architectures",
      ],
    };
  }
}
