export interface QaAnalysisIssue {
  id: string;
  type: "brand_rule" | "structure" | "unsupported_claim" | "repetition" | "seo" | "formatting";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  suggestion: string;
}

export interface QaAnalysisResult {
  score: number;
  passed: boolean;
  issues: QaAnalysisIssue[];
  metrics: {
    paragraphsCount: number;
    tablesCount: number;
    codeBlocksCount: number;
    bulletListsCount: number;
  };
}

export function analyzeQa(
  content: string,
  prohibitedTerms: string[] = [],
  preferredTerms: string[] = [],
  hasSources = false
): QaAnalysisResult {
  const issues: QaAnalysisIssue[] = [];
  const lower = content.toLowerCase();

  // 1. Prohibited Terms Check
  for (const term of prohibitedTerms) {
    if (lower.includes(term.toLowerCase())) {
      issues.push({
        id: `issue_brand_${term}`,
        type: "brand_rule",
        severity: "high",
        title: `Prohibited Term: "${term}"`,
        description: `Found prohibited brand vocabulary term "${term}" in draft text.`,
        suggestion: `Replace with approved terminology or remove buzzword.`,
      });
    }
  }

  // 2. Structural Checks
  const hasH1 = /^#\s+.+/m.test(content);
  const hasH2 = /^##\s+.+/m.test(content);

  if (!hasH1) {
    issues.push({
      id: "issue_struct_h1",
      type: "structure",
      severity: "medium",
      title: "Missing Main Title (H1)",
      description: "Document lacks a primary # H1 heading at the top.",
      suggestion: "Add a main title starting with #.",
    });
  }

  if (!hasH2) {
    issues.push({
      id: "issue_struct_h2",
      type: "structure",
      severity: "medium",
      title: "Missing Sub-sections (H2)",
      description: "Document lacks structured ## H2 section dividers.",
      suggestion: "Organize document into sequential ## numbered sections.",
    });
  }

  // 3. Absolute assertions without citations (Unsupported Claims)
  const absolutePatterns = [
    /\bproven\s+100%\b/i,
    /\bguaranteed\s+zero\s+latency\b/i,
    /\bnever\s+fails\b/i,
    /\bthe\s+only\s+solution\b/i,
  ];

  for (const pat of absolutePatterns) {
    if (pat.test(content)) {
      issues.push({
        id: `issue_claim_${pat.source.slice(0, 10)}`,
        type: "unsupported_claim",
        severity: "medium",
        title: "Unqualified Claim Detected",
        description: `Found unverified absolute assertion matching "${pat.source}".`,
        suggestion: "Temper claims with empirical benchmark bounds or citations.",
      });
    }
  }

  // 4. Citation coverage
  if (!hasSources) {
    issues.push({
      id: "issue_sources_missing",
      type: "unsupported_claim",
      severity: "low",
      title: "No Research Sources Attached",
      description: "No verified empirical citations are linked to this draft.",
      suggestion: "Attach authoritative industry sources in the Research tab.",
    });
  }

  // Formatting metrics
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const tablesCount = (content.match(/\|[\s\S]+?\|[\s\S]+?\|/g) || []).length > 0 ? 1 : 0;
  const codeBlocksCount = (content.match(/```[\s\S]*?```/g) || []).length;
  const bulletListsCount = (content.match(/^[\*\-]\s+.+/gm) || []).length;

  // Compute overall score
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "high") score -= 25;
    else if (issue.severity === "medium") score -= 10;
    else if (issue.severity === "low") score -= 5;
  }
  score = Math.max(0, score);

  return {
    score,
    passed: score >= 75 && !issues.some((i) => i.severity === "high"),
    issues,
    metrics: {
      paragraphsCount: paragraphs.length,
      tablesCount,
      codeBlocksCount,
      bulletListsCount,
    },
  };
}
