import { ContentItem, ContentVersion, ExportFormat, ExportFormattedResult } from "@/types";

export interface ExportFormatterOptions {
  item: ContentItem;
  version: ContentVersion;
  format: ExportFormat;
  includeFrontmatter?: boolean;
  standaloneHtml?: boolean;
  authorName?: string;
  brandName?: string;
}

export class ExportFormatter {
  static format(options: ExportFormatterOptions): ExportFormattedResult {
    const { item, version, format } = options;
    const words = version.content.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
    const now = new Date().toISOString();
    const slug = item.slug || "document";

    let content = "";
    let filename = "";
    let mimeType = "";

    switch (format) {
      case "markdown": {
        filename = `${slug}.md`;
        mimeType = "text/markdown; charset=utf-8";
        content = this.generateMarkdown(options, wordCount, readingTimeMinutes);
        break;
      }
      case "html": {
        filename = `${slug}.html`;
        mimeType = "text/html; charset=utf-8";
        content = this.generateHtml(options, wordCount, readingTimeMinutes);
        break;
      }
      case "json": {
        filename = `${slug}.json`;
        mimeType = "application/json; charset=utf-8";
        content = this.generateJson(options, wordCount, readingTimeMinutes, now);
        break;
      }
    }

    return {
      format,
      filename,
      mimeType,
      content,
      metadata: {
        title: item.title,
        slug,
        wordCount,
        readingTimeMinutes,
        exportedAt: now,
        versionNumber: version.versionNumber,
      },
    };
  }

  private static generateMarkdown(
    options: ExportFormatterOptions,
    wordCount: number,
    readingTimeMinutes: number
  ): string {
    const { item, version, includeFrontmatter = true, authorName = "Content Team", brandName = "Enterprise" } = options;
    const keywords = (version.seoMetadata?.keywords || []) as string[];

    if (!includeFrontmatter) {
      return version.content;
    }

    const dateObj = new Date(item.createdAt || Date.now());
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    const formattedPublishDate = `${year}-${month}-${day}`;

    const frontmatter = `---
title: "${item.title.replace(/"/g, '\\"')}"
slug: "${item.slug}"
category: "${item.category}"
author: "${authorName}"
publishDate: "${formattedPublishDate}"
readingTime: "${readingTimeMinutes} min read"
status: "${item.status === "approved" || item.status === "exported" ? "Published" : "Draft"}"
shortDescription: "${(item.excerpt || "").replace(/"/g, '\\"')}"
buttonText: "Read article"
buttonLink: "/blog-single/${item.slug}"
type: "${item.type}"
brand: "${brandName}"
wordCount: ${wordCount}
version: ${version.versionNumber}
seo:
  title: "${(version.seoMetadata?.seoTitle || item.title).replace(/"/g, '\\"')}"
  description: "${(version.seoMetadata?.metaDescription || item.excerpt || "").replace(/"/g, '\\"')}"
  keywords:
${keywords.map((kw) => `    - "${kw}"`).join("\n")}
---

`;

    return frontmatter + version.content.trim();
  }

  public static cleanCategoryName(rawCategory?: string): string {
    if (!rawCategory) return "AI Architecture";
    const trimmed = rawCategory.trim();
    const parts = trimmed.split(/[,|/•]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0 && parts[0].length > 0) {
      const first = parts[0];
      if (first === first.toUpperCase() && first.length > 3) {
        return first
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase())
          .replace(/\bAi\b/g, "AI")
          .replace(/\bMl\b/g, "ML");
      }
      return first;
    }
    return trimmed;
  }

  public static formatCleanArticleMarkdown(rawContent: string, title?: string): string {
    let clean = (rawContent || "").trim();

    // 1. Strip raw HTML tags if any were embedded, converting them to clean markdown
    clean = clean
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "") // strip H1 (redundant with hero title)
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n\n## $1\n\n")
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n\n### $1\n\n")
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n\n#### $1\n\n")
      .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
      .replace(/<b>(.*?)<\/b>/gi, "**$1**")
      .replace(/<em>(.*?)<\/em>/gi, "*$1*")
      .replace(/<i>(.*?)<\/i>/gi, "*$1*")
      .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, quote) => `\n\n> ${quote.replace(/<p>/gi, "").replace(/<\/p>/gi, "\n> ").trim()}\n\n`)
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
      .replace(/<\/?ul[^>]*>/gi, "\n")
      .replace(/<\/?ol[^>]*>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<p[^>]*>/gi, "\n\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<div[^>]*>/gi, "\n")
      .replace(/<\/div>/gi, "\n");

    // 2. Remove any remaining stray HTML tags
    clean = clean.replace(/<[^>]+>/g, "");

    // 3. Remove leading duplicated Title (e.g., # Title)
    clean = clean.replace(/^#\s+[^\n]+\n+/, "");
    if (title) {
      const normalizedTitle = title.trim().toLowerCase();
      const lines = clean.split("\n");
      if (lines.length > 0 && lines[0].trim().toLowerCase() === normalizedTitle) {
        clean = lines.slice(1).join("\n").trim();
      }
    }

    // 4. Normalize lists and sub-items
    clean = clean.replace(/([^\n])\n(-|\*|\d+\.) /g, "$1\n\n$2 ");

    // 5. Ensure proper heading spacing
    clean = clean.replace(/\n*(#{2,4}\s+[^\n]+)\n*/g, "\n\n$1\n\n");

    // 6. Normalize multiple consecutive blank lines
    clean = clean.replace(/\n{3,}/g, "\n\n").trim();

    return clean;
  }

  public static markdownToHtmlBody(markdown: string): string {
    let html = markdown;

    // Escape HTML special chars inside code blocks first
    const codeBlocks: string[] = [];
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const escapedCode = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
      codeBlocks.push(
        `<pre><code class="language-${lang || "text"}">${escapedCode.trim()}</code></pre>`
      );
      return placeholder;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, (_, code) => {
      const escaped = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<code>${escaped}</code>`;
    });

    // Headers
    html = html.replace(/^### (.*$)/gim, (_, text) => `<h3>${text.trim()}</h3>`);
    html = html.replace(/^## (.*$)/gim, (_, text) => `<h2>${text.trim()}</h2>`);
    html = html.replace(/^# (.*$)/gim, (_, text) => `<h1>${text.trim()}</h1>`);

    // Bold & Italics
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, "<blockquote><p>$1</p></blockquote>");

    // Horizontal Rules
    html = html.replace(/^---$/gim, "<hr />");

    // Unordered lists
    html = html.replace(/^\- (.*$)/gim, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");

    // Tables
    html = html.replace(/\|(.+)\|/g, (match) => {
      if (match.includes("---")) return ""; // header separator
      const cells = match
        .split("|")
        .filter((c) => c.trim().length > 0)
        .map((c) => `<td>${c.trim()}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    });
    html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<div class="table-container"><table><tbody>$&</tbody></table></div>');

    // Paragraphs (lines separated by double newlines)
    const blocks = html.split(/\n\s*\n/);
    const formattedBlocks = blocks.map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h1") ||
        trimmed.startsWith("<h2") ||
        trimmed.startsWith("<h3") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<div class=\"table") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("___CODE_BLOCK_")
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
    });

    html = formattedBlocks.filter(Boolean).join("\n\n");

    // Restore Code Blocks
    codeBlocks.forEach((codeHtml, idx) => {
      html = html.replace(`___CODE_BLOCK_${idx}___`, codeHtml);
    });

    return html;
  }

  private static generateHtml(
    options: ExportFormatterOptions,
    wordCount: number,
    readingTimeMinutes: number
  ): string {
    const { item, version, standaloneHtml = true, brandName = "Enterprise" } = options;
    const bodyHtml = this.markdownToHtmlBody(version.content);

    if (!standaloneHtml) {
      return `<article class="ai-content-studio-document blog-content-bold">\n${bodyHtml}\n</article>`;
    }

    const title = version.seoMetadata?.seoTitle || item.title;
    const description = version.seoMetadata?.metaDescription || item.excerpt || "";
    const keywords = (version.seoMetadata?.keywords || []).join(", ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="keywords" content="${keywords}" />
  <meta name="author" content="${brandName}" />

  <!-- Open Graph -->
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="article" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />

  <style>
    :root {
      --bg-color: #0b0f17;
      --card-bg: #111827;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --border-color: #1f2937;
      --accent: #6366f1;
      --code-bg: #030712;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg-color: #ffffff;
        --card-bg: #f9fafb;
        --text-main: #111827;
        --text-muted: #4b5563;
        --border-color: #e5e7eb;
        --accent: #4f46e5;
        --code-bg: #f3f4f6;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-main);
      line-height: 1.75;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 820px;
      margin: 0 auto;
    }
    .header-meta {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 24px;
      margin-bottom: 36px;
    }
    .meta-tag {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      margin-bottom: 8px;
    }
    h1 { font-size: 2.25rem; font-weight: 800; line-height: 1.25; margin: 0 0 16px 0; }
    h2 { font-size: 1.5rem; font-weight: 700; margin: 40px 0 16px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
    h3 { font-size: 1.2rem; font-weight: 600; margin: 24px 0 12px 0; }
    p { margin: 0 0 20px 0; color: var(--text-main); font-size: 1.05rem; }
    ul, ol { margin: 0 0 20px 24px; }
    li { margin-bottom: 8px; }
    blockquote {
      border-left: 4px solid var(--accent);
      margin: 24px 0;
      padding: 8px 20px;
      background: var(--card-bg);
      border-radius: 0 8px 8px 0;
    }
    pre {
      background: var(--code-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.9rem;
      margin: 24px 0;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: var(--card-bg);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.88em;
    }
    .table-container {
      overflow-x: auto;
      margin: 24px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }
    th, td {
      border: 1px solid var(--border-color);
      padding: 10px 14px;
      text-align: left;
    }
    th { background: var(--card-bg); font-weight: 600; }
    hr { border: none; border-top: 1px solid var(--border-color); margin: 40px 0; }
    .stats {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .blog-content-bold {
      font-weight: 700;
    }
    .blog-content-bold h1,
    .blog-content-bold h2,
    .blog-content-bold h3,
    .blog-content-bold p,
    .blog-content-bold li,
    .blog-content-bold blockquote,
    .blog-content-bold td,
    .blog-content-bold th {
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-meta">
      <span class="meta-tag">${item.category} • ${item.type.toUpperCase()}</span>
      <div class="stats">
        Published by ${brandName} • ${wordCount} words • ${readingTimeMinutes} min read
      </div>
    </div>
    
    <main>
      <div class="blog-content-bold">${bodyHtml}</div>
    </main>
  </div>
</body>
</html>`;
  }

  private static generateJson(
    options: ExportFormatterOptions,
    wordCount: number,
    readingTimeMinutes: number,
    now: string
  ): string {
    const { item, version, brandName = "Neno Technology", authorName = "Mit Patel" } = options;
    const dateObj = new Date(item.createdAt || Date.now());
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    const formattedPublishDate = `${year}-${month}-${day}`;

    const isCaseStudy = item.type === "case-study";
    const renderedHtml = this.markdownToHtmlBody(version.content);

    const payload = {
      // 1:1 Website Form Compatible Schema (Blog & Case Study)
      title: item.title,
      slug: item.slug,
      category: item.category || (isCaseStudy ? "Enterprise AI & Cloud" : "Agentic AI"),
      author: authorName,
      publishDate: formattedPublishDate,
      status: item.status === "approved" || item.status === "exported" ? "Published" : "Draft",
      shortDescription: item.excerpt || "",
      content: renderedHtml,
      readingTime: `${readingTimeMinutes} min read`,
      thumb: version.seoMetadata?.featuredImageBrief || "",
      thumbFull: version.seoMetadata?.featuredImageBrief || "",
      buttonText: "Read Article",
      buttonLink: `/blog-single/${item.slug}`,

      // Case Study specific website fields
      ...(isCaseStudy
        ? {
            clientOwner: `Global ${item.category || "Enterprise"} Platform`,
            tags: `NENO DEPLOYMENT, AGENTIC AI SYSTEMS, ${(item.category || "ENTERPRISE").toUpperCase()}`,
            description: item.excerpt || "",
            challengeText: "Operational latency, non-deterministic system failure modes, and heavy manual triage.",
            solutionText: `Autonomous agent architecture engineered by ${brandName} with verified telemetry and fault isolation.`,
            techStack: "Neno Platform, Gemini 2.5 Flash, TypeScript, PostgreSQL",
            impactMetrics: [
              { value: "68%", label: "Cost Reduction" },
              { value: "4.2x", label: "Operational Velocity" },
              { value: "99.4%", label: "Accuracy Rate" },
            ],
            ctaButtonText: "Discuss Similar Project",
            ctaButtonLink: "/contact-us",
          }
        : {
            // Blog specific website fields
            featuredImage: version.seoMetadata?.featuredImageBrief || "",
            blogContent: version.content,
          }),

      // Extended metadata & Headless CMS contract
      schema_version: "2.0",
      id: item.id,
      type: item.type,
      content_formats: {
        raw_markdown: version.content,
        html_rendered: renderedHtml,
      },
      seo: {
        seo_title: version.seoMetadata?.seoTitle || item.title,
        meta_description: version.seoMetadata?.metaDescription || item.excerpt || "",
        keywords: version.seoMetadata?.keywords || [],
        slug: item.slug,
      },
      analytics: {
        word_count: wordCount,
        character_count: version.content.length,
        reading_time_minutes: readingTimeMinutes,
      },
      publishing: {
        brand: brandName,
        author: authorName,
        version_number: version.versionNumber,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        exported_at: now,
      },
    };

    return JSON.stringify(payload, null, 2);
  }
}
