import { createSuite, assert, assertEquals } from "./test-utils";
import { analyzeSeo } from "../src/lib/analysis/seo-analyzer";
import { analyzeQa } from "../src/lib/analysis/qa-analyzer";

export const { suite, test } = createSuite("SEO & QA Analysis Engines");

test("should accurately calculate SEO metrics and heading counts", () => {
  const sampleContent = `# Modern Microservices Architecture

## 1. High Availability Clusters
Modern microservices enable autonomous scaling and resilient execution. We configure Kubernetes workloads for maximum fault tolerance.

## 2. Distributed Tracing & Observability
Observability provides end-to-end telemetry across microservices.

### 2.1 Prometheus Metrics
Prometheus scrapes operational data at regular intervals.`;

  const result = analyzeSeo(
    sampleContent,
    "Modern Microservices Architecture in Enterprise Cloud", // 53 chars -> good/optimal
    "A comprehensive technical deep-dive into autonomous microservices scaling, distributed tracing, and resilience patterns.", // 122 chars -> good
    "modern-microservices-architecture",
    ["microservices", "kubernetes", "observability"]
  );

  assertEquals(result.headingCounts.h1, 1);
  assertEquals(result.headingCounts.h2, 2);
  assertEquals(result.headingCounts.h3, 1);
  assert(result.wordCount > 30, "Word count should exceed 30");
  assertEquals(result.titleStatus, "good");
  assertEquals(result.descriptionStatus, "good");

  const kwMicro = result.keywordsAnalysis.find((k) => k.keyword === "microservices");
  assert(kwMicro !== undefined, "Keyword microservices should be found");
  assertEquals(kwMicro?.foundInHeading, true);
  assert((kwMicro?.count || 0) >= 2, "Keyword should occur at least 2 times");
});

test("should detect prohibited brand terms and calculate QA score reduction", () => {
  const flawedContent = `This revolutionary new platform is a true game-changer that is guaranteed zero latency.`;
  const prohibited = ["game-changer", "revolutionary", "synergy"];

  const qaResult = analyzeQa(flawedContent, prohibited, ["scalable"], false);

  assertEquals(qaResult.passed, false);
  assert(qaResult.issues.some((i) => i.id === "issue_brand_game-changer"));
  assert(qaResult.issues.some((i) => i.id === "issue_brand_revolutionary"));
  assert(qaResult.issues.some((i) => i.type === "unsupported_claim"));
  assert(qaResult.score < 60, "Score should be heavily penalized for high severity issues");
});

test("should pass high quality content with citations and clean structure", () => {
  const highQualityDoc = `# Scalable Kubernetes Operations

## Overview
Our engineering teams deploy containerized workloads across multi-region clusters.

## Benchmark Analysis
Empirical benchmarks demonstrate 45% reduction in compute overhead according to industry standard metrics.`;

  const qaResult = analyzeQa(highQualityDoc, ["game-changer"], ["scalable"], true);

  assertEquals(qaResult.passed, true);
  assertEquals(qaResult.issues.filter((i) => i.severity === "high").length, 0);
  assert(qaResult.score >= 85, "High quality content should score >= 85");
});
