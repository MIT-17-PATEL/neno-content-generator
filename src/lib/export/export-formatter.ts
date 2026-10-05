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
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
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

    // 2. Remove any remaining stray unsafe HTML tags
    clean = clean.replace(/<[^>]+>/g, "");

    // 3. Strip any leading markdown images at the very beginning of the article (since the hero banner handles the featured image)
    clean = clean.replace(/^\s*!\[[^\]]*\]\([^\)]+\)\s*/i, "");
    clean = clean.replace(/^\s*-\s*!\[[^\]]*\]\([^\)]+\)\s*/i, "");

    // 4. Remove any raw data:image/svg+xml or data:image/png lines that were dumped into text
    clean = clean.replace(/^.*data:image\/[a-zA-Z0-9+]+;[^\n]*$/gm, "");

    // 5. Remove leading duplicated Title (e.g., # Title)
    clean = clean.replace(/^#\s+[^\n]+\n+/, "");
    if (title) {
      const normalizedTitle = title.trim().toLowerCase();
      const lines = clean.split("\n");
      if (lines.length > 0 && lines[0].trim().toLowerCase() === normalizedTitle) {
        clean = lines.slice(1).join("\n").trim();
      }
    }

    // 6. Normalize list items
    clean = clean.replace(/([^\n])\n(-|\*|\d+\.) /g, "$1\n\n$2 ");

    // 7. Ensure proper heading spacing
    clean = clean.replace(/\n*(#{2,4}\s+[^\n]+)\n*/g, "\n\n$1\n\n");

    // 8. Normalize multiple consecutive blank lines
    clean = clean.replace(/\n{3,}/g, "\n\n").trim();

    return clean;
  }

  public static sanitizeHtml(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/javascript\s*:/gi, "blocked:")
      .replace(/on\w+\s*=\s*(['"]).*?\1/gi, "");
  }

  public static markdownToHtmlBody(markdown: string): string {
    if (!markdown) return "";

    let html = markdown;

    // 1. Strip raw dangerous data URI lines if they appear as naked text
    html = html.replace(/data:image\/(?:svg\+xml|png|jpeg|webp);[a-zA-Z0-9+,;%=\-_~./\s]+/gi, (match) => {
      // If within markdown image or src, leave alone if under 2000 chars, otherwise remove naked data strings
      if (match.length > 300) return "";
      return match;
    });

    // 2. Escape HTML special chars inside code blocks first
    const codeBlocks: string[] = [];
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const escapedCode = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
      codeBlocks.push(
        `<pre class="editorial-code-block my-6 overflow-x-auto rounded-xl bg-slate-950 p-4 border border-slate-800 text-slate-100 font-mono text-xs leading-relaxed"><code class="language-${lang || "text"}">${escapedCode.trim()}</code></pre>`
      );
      return placeholder;
    });

    // 3. Inline code
    html = html.replace(/`([^`\n]+)`/g, (_, code) => {
      const escaped = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<code class="px-1.5 py-0.5 rounded bg-slate-800 text-orange-400 font-mono text-[0.9em] border border-slate-700/60">${escaped}</code>`;
    });

    // 4. Markdown Images: ![alt](url) -> Semantic figure tag
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
      const trimmedUrl = url.trim();
      // If data URI is overly huge, suppress or render clean placeholder
      if (trimmedUrl.startsWith("data:") && trimmedUrl.length > 1000) {
        return `<figure class="my-6 rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 p-4 text-center text-xs text-slate-400">
          <div class="font-semibold text-slate-300 mb-1">${alt || "Technical Architecture Diagram"}</div>
          <span class="text-[11px] text-slate-500">Asset rendered in high-resolution vector format</span>
        </figure>`;
      }
      return `<figure class="my-8 text-center">
        <img src="${trimmedUrl}" alt="${alt || "Article Visual"}" class="w-full max-h-[480px] object-cover rounded-xl border border-slate-800/80 shadow-md mx-auto" loading="lazy" />
        ${alt ? `<figcaption class="text-xs text-slate-400 mt-2 italic">${alt}</figcaption>` : ""}
      </figure>`;
    });

    // 5. Markdown Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const safeUrl = url.trim().replace(/^javascript:/i, "");
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-orange-500 hover:text-orange-400 underline underline-offset-4 decoration-orange-500/40 hover:decoration-orange-400 transition-colors font-medium">${text}</a>`;
    });

    // 6. Section Headings with slug anchors
    html = html.replace(/^### (.*$)/gim, (_, text) => {
      const cleanText = text.trim();
      const id = cleanText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return `<h3 id="${id}" class="text-lg font-bold text-slate-100 mt-8 mb-3 tracking-tight flex items-center gap-2">${cleanText}</h3>`;
    });

    html = html.replace(/^## (.*$)/gim, (_, text) => {
      const cleanText = text.trim();
      const id = cleanText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return `<h2 id="${id}" class="text-xl md:text-2xl font-extrabold text-slate-50 mt-12 mb-4 tracking-tight pt-4 border-t border-slate-800/80">${cleanText}</h2>`;
    });

    html = html.replace(/^# (.*$)/gim, (_, text) => {
      const cleanText = text.trim();
      return `<h1 class="text-2xl md:text-3xl font-extrabold text-slate-50 mt-8 mb-4 tracking-tight">${cleanText}</h1>`;
    });

    // 7. Bold & Italics
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-100">$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-200">$1</em>');

    // 8. Blockquotes / Executive Callouts
    html = html.replace(/^\> (.*$)/gim, '<blockquote class="my-6 border-l-4 border-orange-500 pl-4 py-2 italic text-slate-300 bg-slate-900/40 rounded-r-lg"><p class="m-0">$1</p></blockquote>');

    // 9. Horizontal Rules
    html = html.replace(/^---$/gim, '<hr class="my-8 border-slate-800" />');

    // 10. Unordered & Ordered Lists
    html = html.replace(/^[\*\-] (.*$)/gim, '<li class="text-slate-300 my-1 leading-relaxed pl-1">$1</li>');
    html = html.replace(/^\d+\.\s+(.*$)/gim, '<li class="text-slate-300 my-1 leading-relaxed pl-1">$1</li>');
    html = html.replace(/(<li class="text-slate-300 my-1 leading-relaxed pl-1">.*<\/li>\n?)+/g, '<ul class="my-5 pl-6 list-disc space-y-1.5 marker:text-orange-500">$&</ul>');

    // 11. Tables
    html = html.replace(/\|(.+)\|/g, (match) => {
      if (match.includes("---")) return ""; // header separator
      const cells = match
        .split("|")
        .filter((c) => c.trim().length > 0)
        .map((c) => `<td class="border border-slate-800 px-4 py-2.5 text-xs text-slate-300">${c.trim()}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    });
    html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<div class="overflow-x-auto my-6 rounded-xl border border-slate-800 bg-slate-900/60"><table class="w-full border-collapse text-left"><tbody>$&</tbody></table></div>');

    // 12. Paragraphs (lines separated by double newlines)
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
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<div") ||
        trimmed.startsWith("<figure") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("___CODE_BLOCK_")
      ) {
        return trimmed;
      }
      return `<p class="my-4 text-slate-300 text-[16px] md:text-[17px] leading-[1.8] font-normal tracking-[0.01em]">${trimmed.replace(/\n/g, "<br />")}</p>`;
    });

    html = formattedBlocks.filter(Boolean).join("\n\n");

    // 13. Restore Code Blocks
    codeBlocks.forEach((codeHtml, idx) => {
      html = html.replace(`___CODE_BLOCK_${idx}___`, codeHtml);
    });

    // 14. Final security sanitization
    return this.sanitizeHtml(html);
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
