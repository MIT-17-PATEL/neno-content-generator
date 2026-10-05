"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, ListFilter, Clock, Calendar, User, Share2, ArrowLeft, Bookmark } from "lucide-react";
import { ExportFormatter } from "@/lib/export/export-formatter";
import { Badge } from "@/components/ui/badge";

export interface BlogReaderProps {
  title: string;
  category?: string;
  author?: string;
  publishDate?: string;
  readingTime?: string;
  shortDescription?: string;
  featuredImage?: string;
  content: string;
  onBack?: () => void;
  className?: string;
}

interface TocItem {
  id: string;
  title: string;
  number: string;
}

export function BlogReader({
  title,
  category = "AI Architecture",
  author = "Mit Patel",
  publishDate,
  readingTime,
  shortDescription,
  featuredImage,
  content,
  onBack,
  className = "",
}: BlogReaderProps) {
  const [tocOpen, setTocOpen] = useState(true);

  // Extract pure ## headings for the "On This Page" table of contents
  const tocItems: TocItem[] = useMemo(() => {
    if (!content) return [];
    const lines = content.split("\n");
    const headings: TocItem[] = [];
    let counter = 1;

    for (const line of lines) {
      const match = line.match(/^##\s+(.+)$/);
      if (match) {
        let rawHeading = match[1].trim();

        // Skip if heading is an image markdown or contains data:image
        if (rawHeading.startsWith("![") || rawHeading.includes("data:image/")) {
          continue;
        }

        // Clean any stray formatting or bold/links in the heading title
        rawHeading = rawHeading
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
          .replace(/[*_`]/g, "")
          .replace(/<[^>]+>/g, "")
          .trim();

        if (rawHeading.length > 0) {
          const id = rawHeading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          headings.push({
            id,
            title: rawHeading,
            number: String(counter).padStart(2, "0"),
          });
          counter++;
        }
      }
    }

    return headings;
  }, [content]);

  // Clean and render markdown body
  const cleanMarkdown = useMemo(() => {
    return ExportFormatter.formatCleanArticleMarkdown(content, title);
  }, [content, title]);

  const renderedHtml = useMemo(() => {
    return ExportFormatter.markdownToHtmlBody(cleanMarkdown);
  }, [cleanMarkdown]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const formattedDate = publishDate || new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const estimatedReadingTime = readingTime || `${Math.max(1, Math.ceil((content.split(/\s+/).length || 200) / 200))} min read`;

  // Filter out any broken or invalid data URI that shouldn't be rendered as hero
  const hasValidFeaturedImage =
    featuredImage &&
    (featuredImage.startsWith("http") ||
      featuredImage.startsWith("/") ||
      (featuredImage.startsWith("data:image") && featuredImage.length < 500000));

  return (
    <div className={`w-full bg-[#0a0d14] text-slate-100 min-h-screen font-sans selection:bg-orange-500/30 selection:text-orange-200 ${className}`}>
      {/* Article Container (Optimal Reading Width: 760px - 820px) */}
      <article className="max-w-[780px] mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-8">
        
        {/* Top Back Navigation (if provided) */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="group flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to articles</span>
          </button>
        )}

        {/* 1. Header Section: Category Badge */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {category}
            </span>
          </div>

          {/* 2. Article Headline */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-[1.25] text-balance">
            {title || "Untitled Article"}
          </h1>

          {/* 3. Short Introduction / Dek */}
          {shortDescription && (
            <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed text-balance pt-1">
              {shortDescription}
            </p>
          )}

          {/* 4. Article Metadata Row: Author · Published Date · Reading Time */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400 border-b border-slate-800/80 pb-6">
            <div className="flex items-center gap-1.5 font-medium text-slate-200">
              <User className="h-3.5 w-3.5 text-orange-400" />
              <span>{author}</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>{formattedDate}</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{estimatedReadingTime}</span>
            </div>
          </div>
        </div>

        {/* 5. Featured Image Banner (Clean 16:9 Aspect Ratio) */}
        {hasValidFeaturedImage && (
          <div className="space-y-2 pt-2">
            <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featuredImage}
                alt={title || "Featured article visual"}
                className="w-full max-h-[460px] object-cover object-center transition-opacity duration-300"
                loading="eager"
              />
            </div>
            <p className="text-[11px] text-center text-slate-500 tracking-wide">
              AI Content Studio • Featured Asset (Editorial Visual)
            </p>
          </div>
        )}

        {/* 6. "ON THIS PAGE" Table of Contents (Compact, Clean, Numbered, Collapsible) */}
        {tocItems.length > 0 && (
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 backdrop-blur-md overflow-hidden transition-all my-8 shadow-sm">
            <button
              type="button"
              onClick={() => setTocOpen(!tocOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-orange-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  On This Page
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                  {tocItems.length} sections
                </span>
              </div>
              {tocOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {tocOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 divide-y divide-slate-800/40">
                <ul className="space-y-1.5 pt-2">
                  {tocItems.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => scrollToSection(item.id)}
                        className="group w-full flex items-baseline gap-3 text-left py-1 text-xs text-slate-400 hover:text-orange-400 transition-colors"
                      >
                        <span className="font-mono text-[11px] text-orange-500/80 font-bold shrink-0">
                          {item.number}
                        </span>
                        <span className="truncate group-hover:underline underline-offset-4 decoration-orange-500/40">
                          {item.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 7. Article Content Body */}
        <div
          className="editorial-prose prose-invert max-w-none text-slate-300 leading-relaxed space-y-6 pt-2"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />

        {/* 8. Footer Editorial Sign-off */}
        <div className="pt-12 border-t border-slate-800/80 mt-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <span className="text-slate-300 font-semibold block">{author}</span>
            <span className="text-slate-500">Autonomous Engineering & AI Research</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-[11px]">
              Published with AI Content Studio
            </span>
          </div>
        </div>

      </article>
    </div>
  );
}
