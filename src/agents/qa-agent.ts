import {
  AgentContext,
  QaAgentOutput,
  QaIssue,
  ResearchAgentOutput,
  StrategistAgentOutput,
  WriterAgentOutput,
  SeoAgentOutput,
} from "./types";

export class QaAgent {
  static async execute(
    topic: string,
    writerOutput: WriterAgentOutput,
    seoOutput: SeoAgentOutput,
    researchOutput: ResearchAgentOutput,
    strategyOutput: StrategistAgentOutput,
    context: AgentContext
  ): Promise<QaAgentOutput> {
    const issues: QaIssue[] = [];
    const prohibitedTerms = context.brandContext?.prohibitedTerms || [];
    const preferredTerms = context.brandContext?.preferredTerms || [];
    const text = writerOutput.content.toLowerCase();

    // 1. Check prohibited terms
    for (const term of prohibitedTerms) {
      if (text.includes(term.toLowerCase())) {
        issues.push({
          type: "brand_rule",
          severity: "high",
          message: `Prohibited brand term detected: "${term}"`,
          suggestion: `Remove or replace "${term}" with approved technical terminology.`,
        });
      }
    }

    // 2. Check structure & headings
    if (!writerOutput.content.includes("## 1.") || !writerOutput.content.includes("## 2.")) {
      issues.push({
        type: "structure",
        severity: "medium",
        message: "Article structure lacks numbered section headings for clarity.",
        suggestion: "Ensure sequential ## heading conventions.",
      });
    }

    // 3. Check SEO title length
    if (seoOutput.seoTitle.length > 70) {
      issues.push({
        type: "seo",
        severity: "medium",
        message: `SEO title is ${seoOutput.seoTitle.length} characters (recommended: <65 characters).`,
        suggestion: "Shorten SEO title to prevent search engine truncation.",
      });
    }

    // 4. Check meta description length
    if (seoOutput.metaDescription.length > 170) {
      issues.push({
        type: "seo",
        severity: "low",
        message: `Meta description is ${seoOutput.metaDescription.length} characters (recommended: <160 characters).`,
        suggestion: "Trim meta description for optimal search snippet display.",
      });
    }

    // 5. Check research grounding
    if (researchOutput.sources.length === 0) {
      issues.push({
        type: "unsupported_claim",
        severity: "medium",
        message: "No empirical research sources are attached to support claims.",
        suggestion: "Attach at least one authoritative peer-reviewed or industry citation.",
      });
    }

    // Calculate score
    let score = 100;
    for (const issue of issues) {
      if (issue.severity === "high") score -= 25;
      else if (issue.severity === "medium") score -= 10;
      else if (issue.severity === "low") score -= 5;
    }
    score = Math.max(0, score);

    return {
      passed: score >= 75 && !issues.some((i) => i.severity === "high"),
      score,
      issues,
    };
  }
}
