import { AgentContext, ResearchAgentOutput, StrategistAgentOutput } from "./types";
import { callAiStructured, isAiConfigured } from "@/lib/ai/ai-client";

export class StrategistAgent {
  static async execute(
    topic: string,
    research: ResearchAgentOutput,
    audience: string,
    context: AgentContext
  ): Promise<StrategistAgentOutput> {
    const brandName = context.brandContext?.brandName || "Enterprise";

    if (isAiConfigured()) {
      try {
        const res = await callAiStructured<StrategistAgentOutput>({
          systemPrompt: `You are the Content Strategist for ${brandName}. Your goal is to establish the article angle, structural outline, and section objectives for ${audience}.
Research: ${research.summary}
Key Facts: ${research.keyFacts.join("; ")}

Return JSON:
{
  "angle": "Strategic narrative hook",
  "outline": [
    { "heading": "Heading title", "goals": "Section goal", "keyPoints": ["Point 1", "Point 2"] }
  ],
  "recommendedExamples": ["Example 1", "Example 2"]
}`,
          userPrompt: `Create a content strategy for: "${topic}".`,
        });

        if (res?.angle && res?.outline) {
          return res;
        }
      } catch (err) {
        console.warn("Strategist Agent fallback notice:", err);
      }
    }

    // Heuristic Strategy
    return {
      angle: `Positioning ${topic} as a mission-critical architectural paradigm for ${audience}, emphasizing actionable blueprints, quantitative ROI, and fault-isolated scalability.`,
      outline: [
        {
          heading: "1. The Paradigm Shift: Core Challenges and Motivation",
          goals: "Establish urgency, historical failure modes, and operational constraints.",
          keyPoints: [
            "Evaluating latency vs throughput constraints in distributed systems.",
            "Identifying systemic vulnerabilities in tightly coupled monolithic services.",
            "Defining quantifiable reliability targets and business impact.",
          ],
        },
        {
          heading: "2. Architectural Blueprint & Key Primitives",
          goals: "Provide concrete, code-level architectural patterns and event models.",
          keyPoints: [
            "Event orchestration and decoupled state boundaries.",
            "Idempotency guarantees and transaction deduplication.",
            "Integration with distributed tracing and observability fabrics.",
          ],
        },
        {
          heading: "3. Benchmarks, Tradeoffs, and Failure Modes",
          goals: "Deliver objective data tables, latency metrics, and failure recovery protocols.",
          keyPoints: [
            "P99 latency variance under high concurrency.",
            "Consistency models and network partition mitigation.",
            "Autonomous circuit-breaking and backoff implementations.",
          ],
        },
        {
          heading: "4. Strategic Roadmap: Step-by-Step Implementation",
          goals: "Provide an engineering rollout plan with verification milestones.",
          keyPoints: [
            "Telemetry audit and baseline instrumentation.",
            "Progressive rollout with canary verification.",
            "Production hardening and automated rollback criteria.",
          ],
        },
      ],
      recommendedExamples: [
        "Distributed message queue deduplication in financial event processing",
        "Canary deployment verification with automated telemetry rollbacks",
      ],
    };
  }
}
