import { createSuite, assert, assertEquals, assertIncludes } from "./test-utils";
import { ExportFormatter } from "../src/lib/export/export-formatter";
import { ContentItem, ContentVersion } from "../src/types";

export const { suite, test } = createSuite("Multi-Format Export Engine");

const mockItem: ContentItem = {
  id: "cnt_test_001",
  workspaceId: "ws_default_neno",
  title: "Building Autonomous Cloud Infrastructure",
  slug: "building-autonomous-cloud-infrastructure",
  type: "blog",
  status: "exported",
  category: "Cloud Engineering",
  excerpt: "A guide on autonomous infrastructure with Kubernetes.",
  currentVersionId: "ver_test_002",
  createdBy: "usr_test_mit",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
};

const mockVersion: ContentVersion = {
  id: "ver_test_002",
  contentId: "cnt_test_001",
  versionNumber: 2,
  createdBy: "usr_test_mit",
  content: `# Building Autonomous Cloud Infrastructure

## 1. Declarative Control Planes
Kubernetes reconciles actual state against desired state autonomously.

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resilient-service
\`\`\`

## 2. Key Findings
- Zero downtime deployments
- Sub-second failover recovery`,
  seoMetadata: {
    seoTitle: "Building Autonomous Cloud Infrastructure | Neno Technology",
    metaDescription: "A guide on autonomous infrastructure with Kubernetes.",
    keywords: ["autonomous cloud", "kubernetes", "cloud engineering"],
  },
  createdAt: "2026-10-02T00:00:00.000Z",
};

test("should format structured Markdown with YAML frontmatter", () => {
  const result = ExportFormatter.format({
    item: mockItem,
    version: mockVersion,
    format: "markdown",
    brandName: "Neno Technology",
    authorName: "Mit Patel",
  });

  assertEquals(result.format, "markdown");
  assertEquals(result.filename, "building-autonomous-cloud-infrastructure.md");
  assertIncludes(result.content, "---");
  assertIncludes(result.content, 'title: "Building Autonomous Cloud Infrastructure"');
  assertIncludes(result.content, 'brand: "Neno Technology"');
  assertIncludes(result.content, 'author: "Mit Patel"');
  assertIncludes(result.content, '- "autonomous cloud"');
  assertIncludes(result.content, "## 1. Declarative Control Planes");
});

test("should format standalone HTML5 document with OpenGraph tags", () => {
  const result = ExportFormatter.format({
    item: mockItem,
    version: mockVersion,
    format: "html",
    brandName: "Neno Technology",
    standaloneHtml: true,
  });

  assertEquals(result.format, "html");
  assertEquals(result.filename, "building-autonomous-cloud-infrastructure.html");
  assertIncludes(result.content, "<!DOCTYPE html>");
  assertIncludes(result.content, '<meta property="og:title"');
  assertIncludes(result.content, '<pre><code class="language-yaml">');
  assertIncludes(result.content, "<h2>1. Declarative Control Planes</h2>");
  assertIncludes(result.content, "<li>Zero downtime deployments</li>");
});

test("should format Headless CMS Schema 2.0 JSON", () => {
  const result = ExportFormatter.format({
    item: mockItem,
    version: mockVersion,
    format: "json",
    brandName: "Neno Technology",
    authorName: "Mit Patel",
  });

  assertEquals(result.format, "json");
  assertEquals(result.filename, "building-autonomous-cloud-infrastructure.json");

  const parsed = JSON.parse(result.content);
  assertEquals(parsed.schema_version, "2.0");
  assertEquals(parsed.id, mockItem.id);
  assertEquals(parsed.slug, mockItem.slug);
  assertEquals(parsed.publishing.brand, "Neno Technology");
  assert(parsed.analytics.word_count > 10, "Word count should be positive");
  assert(parsed.content.raw_markdown.length > 20, "Markdown body should be present");
});
