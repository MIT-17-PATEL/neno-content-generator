import { AgentContext, SeoAgentOutput, WriterAgentOutput } from "./types";
import { generateSlug } from "@/services/content-service";

export class SeoAgent {
  static async execute(
    topic: string,
    category: string,
    writerOutput: WriterAgentOutput,
    context: AgentContext
  ): Promise<SeoAgentOutput> {
    const cleanSlug = generateSlug(topic);

    if (process.env.AI_PROVIDER_API_KEY) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.AI_PROVIDER_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are the SEO Optimization Agent.
Generate search-optimized metadata, meta descriptions (under 160 chars), high-intent keywords, and internal link suggestions.
Return JSON:
{
  "seoTitle": "Title under 60 chars",
  "metaDescription": "Description under 160 chars",
  "keywords": ["keyword 1", "keyword 2", "keyword 3"],
  "slug": "url-slug",
  "internalLinkSuggestions": ["Topic anchor 1", "Topic anchor 2"]
}`,
              },
              {
                role: "user",
                content: `Optimize SEO for article titled "${writerOutput.title}" in category "${category}".`,
              },
            ],
          }),
        });

        if (response.ok) {
          const res = await response.json();
          return JSON.parse(res.choices[0].message.content) as SeoAgentOutput;
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
