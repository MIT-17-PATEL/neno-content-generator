export interface SeoAnalysisResult {
  titleLength: number;
  titleStatus: "good" | "warning" | "error";
  descriptionLength: number;
  descriptionStatus: "good" | "warning" | "error";
  slug: string;
  wordCount: number;
  readingTimeMinutes: number;
  readabilityScore: number; // 0 - 100
  readabilityLevel: "Easy" | "Optimal Technical" | "Complex";
  headingCounts: { h1: number; h2: number; h3: number };
  keywordsAnalysis: Array<{
    keyword: string;
    count: number;
    foundInHeading: boolean;
    densityPercent: number;
  }>;
}

export function analyzeSeo(
  content: string,
  seoTitle: string,
  metaDescription: string,
  slug: string,
  targetKeywords: string[] = []
): SeoAnalysisResult {
  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Heading counts
  const h1Matches = content.match(/^#\s+.+$/gm) || [];
  const h2Matches = content.match(/^##\s+.+$/gm) || [];
  const h3Matches = content.match(/^###\s+.+$/gm) || [];

  // Readability calculation (approximate Flesch Reading Ease for technical content)
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 15;
  let readabilityScore = Math.round(100 - avgWordsPerSentence * 2.2);
  readabilityScore = Math.max(20, Math.min(95, readabilityScore));

  let readabilityLevel: "Easy" | "Optimal Technical" | "Complex" = "Optimal Technical";
  if (readabilityScore > 75) readabilityLevel = "Easy";
  else if (readabilityScore < 50) readabilityLevel = "Complex";

  // Title length status
  let titleStatus: "good" | "warning" | "error" = "good";
  if (seoTitle.length > 70) titleStatus = "error";
  else if (seoTitle.length > 60 || seoTitle.length < 25) titleStatus = "warning";

  // Description length status
  let descriptionStatus: "good" | "warning" | "error" = "good";
  if (metaDescription.length > 170) descriptionStatus = "error";
  else if (metaDescription.length > 160 || metaDescription.length < 50) descriptionStatus = "warning";

  // Keyword analysis
  const contentLower = content.toLowerCase();
  const headingsLower = [...h1Matches, ...h2Matches, ...h3Matches].join(" ").toLowerCase();

  const keywordsAnalysis = targetKeywords.map((kw) => {
    const kwLower = kw.toLowerCase().trim();
    if (!kwLower) return { keyword: kw, count: 0, foundInHeading: false, densityPercent: 0 };

    const regex = new RegExp(`\\b${kwLower}\\b`, "g");
    const matches = contentLower.match(regex) || [];
    const count = matches.length;
    const foundInHeading = headingsLower.includes(kwLower);
    const densityPercent = wordCount > 0 ? Number(((count / wordCount) * 100).toFixed(2)) : 0;

    return {
      keyword: kw,
      count,
      foundInHeading,
      densityPercent,
    };
  });

  return {
    titleLength: seoTitle.length,
    titleStatus,
    descriptionLength: metaDescription.length,
    descriptionStatus,
    slug,
    wordCount,
    readingTimeMinutes,
    readabilityScore,
    readabilityLevel,
    headingCounts: {
      h1: h1Matches.length,
      h2: h2Matches.length,
      h3: h3Matches.length,
    },
    keywordsAnalysis,
  };
}
