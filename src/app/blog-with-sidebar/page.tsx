import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  Folder,
  Layers,
  ChevronRight,
  TrendingUp,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { ContentService, PublicBlogItem } from "@/services/content-service";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";

export const revalidate = 60; // ISR cache revalidation every 60s

export const metadata: Metadata = {
  title: "Research & Insights — AI Engineering, Architecture & Enterprise AI | Neno Technology",
  description:
    "In-depth engineering guides, architectural blueprints, and production insights on agentic AI, enterprise systems, and modern software architecture by Neno Technology.",
  alternates: {
    canonical: "https://www.nenotechnology.com/blog-with-sidebar",
  },
  openGraph: {
    title: "Research & Insights — AI Engineering, Architecture & Enterprise AI | Neno Technology",
    description:
      "In-depth engineering guides, architectural blueprints, and production insights on agentic AI, enterprise systems, and modern software architecture by Neno Technology.",
    url: "https://www.nenotechnology.com/blog-with-sidebar",
    siteName: "Neno Technology",
    images: [
      {
        url: "https://www.nenotechnology.com/assets/img/logo-light.png",
        width: 1200,
        height: 630,
        alt: "Neno Technology Research & Insights",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Research & Insights — AI Engineering, Architecture & Enterprise AI | Neno Technology",
    description:
      "In-depth engineering guides, architectural blueprints, and production insights on agentic AI, enterprise systems, and modern software architecture by Neno Technology.",
  },
};

interface PageProps {
  searchParams: {
    search?: string;
    category?: string;
    page?: string;
  };
}

export default async function BlogWithSidebarPage({ searchParams }: PageProps) {
  const search = searchParams?.search || "";
  const category = searchParams?.category || "all";
  const currentPage = parseInt(searchParams?.page || "1", 10) || 1;

  // Query ONLY published, non-deleted blogs from the production database
  const result = await ContentService.listPublicBlogs({
    search: search || undefined,
    category: category !== "all" ? category : undefined,
    page: currentPage,
    limit: 7, // 1 featured + 6 grid items
  });

  const { items, total, totalPages, categories, featuredPost } = result;

  // Fetch recent 4 posts for sidebar widget
  const recentResult = await ContentService.listPublicBlogs({ limit: 4 });
  const recentPosts = recentResult.items;

  const gridItems = featuredPost && items.length > 1 ? items.slice(1) : items;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative selection:bg-sky-500 selection:text-white">
      {/* Background Ambient Glow Orbs */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-10 right-[-5%] w-[600px] h-[600px] rounded-full bg-radial from-sky-500/15 via-sky-500/5 to-transparent blur-[130px]" />
        <div className="absolute top-[520px] left-[-8%] w-[650px] h-[650px] rounded-full bg-radial from-indigo-500/15 via-indigo-500/5 to-transparent blur-[140px]" />
        <div className="absolute top-[1200px] right-[4%] w-[520px] h-[520px] rounded-full bg-radial from-cyan-500/10 via-cyan-500/5 to-transparent blur-[130px]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header Banner */}
          <header className="text-center max-w-3xl mx-auto space-y-3.5 pt-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 font-mono text-xs font-bold uppercase tracking-widest shadow-lg shadow-sky-500/10">
              <Sparkles className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
              <span>Research &amp; Insights</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Engineering Insights &amp;{" "}
              <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                AI Architecture
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
              In-depth architectural blueprints, empirical latency benchmarks, and production-grade implementation
              guides curated by Neno Forward Deployed Engineers.
            </p>
          </header>

          {/* Filter & Search Bar */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            {/* Search Input Form */}
            <form method="GET" action="/blog-with-sidebar" className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search blueprints &amp; benchmarks..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
              />
              {category !== "all" && <input type="hidden" name="category" value={category} />}
            </form>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <Link
                href={`/blog-with-sidebar${search ? `?search=${encodeURIComponent(search)}` : ""}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  category === "all"
                    ? "bg-sky-500 text-white shadow-md shadow-sky-500/25"
                    : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800/80"
                }`}
              >
                All ({total})
              </Link>

              {categories.map((cat) => {
                const isActive = category.toLowerCase() === cat.name.toLowerCase();
                return (
                  <Link
                    key={cat.name}
                    href={`/blog-with-sidebar?category=${encodeURIComponent(cat.name)}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-sky-500 text-white shadow-md shadow-sky-500/25"
                        : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800/80"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="ml-1.5 text-[10px] opacity-75 font-mono">({cat.count})</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Main 2-Column Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Left Column: Articles List (8 cols) */}
            <div className="lg:col-span-8 space-y-8">
              {items.length === 0 ? (
                <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">No published articles found</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {search || category !== "all"
                      ? "No articles matched your active filters. Try searching for a different keyword or reset filters."
                      : "New research guides and architectural blueprints will be published here shortly."}
                  </p>
                  {(search || category !== "all") && (
                    <Link
                      href="/blog-with-sidebar"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 pt-2"
                    >
                      <span>Clear all filters</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {/* Top Featured Post Hero Card (Only on Page 1) */}
                  {featuredPost && currentPage === 1 && (
                    <article className="group relative rounded-2xl bg-slate-900/70 border border-slate-800/90 overflow-hidden shadow-2xl hover:border-sky-500/50 transition-all duration-300">
                      <Link href={`/blog/${featuredPost.slug}`} className="block">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                          {/* Image Container */}
                          <div className="md:col-span-6 relative aspect-[16/10] md:aspect-auto overflow-hidden bg-slate-950">
                            {featuredPost.thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={featuredPost.thumb}
                                alt={featuredPost.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full min-h-[220px] flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 text-slate-700">
                                <ImageIcon className="h-12 w-12" />
                              </div>
                            )}
                            <div className="absolute top-3.5 left-3.5">
                              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-500 text-white shadow-md uppercase tracking-wider font-mono">
                                Featured Blueprint
                              </span>
                            </div>
                          </div>

                          {/* Content Container */}
                          <div className="md:col-span-6 p-6 sm:p-7 flex flex-col justify-between space-y-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span className="text-sky-400 font-semibold">{featuredPost.category}</span>
                                <span>&bull;</span>
                                <span className="flex items-center gap-1 font-mono text-[11px]">
                                  <Clock className="h-3 w-3" />
                                  {featuredPost.readingTime}
                                </span>
                              </div>

                              <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-sky-400 transition-colors line-clamp-2">
                                {featuredPost.title}
                              </h2>

                              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                                {featuredPost.excerpt}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                              <span className="text-slate-400 font-medium">By {featuredPost.author}</span>
                              <span className="text-sky-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                <span>Read Blueprint</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </article>
                  )}

                  {/* Grid of Standard Blog Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {gridItems.map((post) => (
                      <article
                        key={post.id}
                        className="group flex flex-col justify-between rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-lg hover:border-slate-700 hover:bg-slate-900/90 transition-all duration-300"
                      >
                        <Link href={`/blog/${post.slug}`} className="flex flex-col h-full">
                          {/* Card Thumbnail */}
                          <div className="aspect-[16/10] relative overflow-hidden bg-slate-950">
                            {post.thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={post.thumb}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-950 text-slate-700">
                                <ImageIcon className="h-10 w-10" />
                              </div>
                            )}
                            <div className="absolute top-3 left-3">
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-slate-950/80 border border-slate-700 text-sky-400 backdrop-blur-md">
                                {post.category}
                              </span>
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-mono">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-slate-500" />
                                  {post.publishDate}
                                </span>
                                <span>&bull;</span>
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Clock className="h-3 w-3 text-slate-500" />
                                  {post.readingTime}
                                </span>
                              </div>

                              <h3 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors line-clamp-2 leading-snug">
                                {post.title}
                              </h3>

                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                {post.excerpt}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                              <span className="text-[11px] font-medium">{post.author}</span>
                              <span className="text-sky-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                <span>Read Article</span>
                                <ArrowRight className="h-3 w-3" />
                              </span>
                            </div>
                          </div>
                        </Link>
                      </article>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-6">
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        const isActive = pageNum === currentPage;
                        const queryParams = new URLSearchParams();
                        if (search) queryParams.set("search", search);
                        if (category !== "all") queryParams.set("category", category);
                        queryParams.set("page", String(pageNum));

                        return (
                          <Link
                            key={pageNum}
                            href={`/blog-with-sidebar?${queryParams.toString()}`}
                            className={`h-9 w-9 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                              isActive
                                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                            }`}
                          >
                            {pageNum}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right Column: Dynamic Sidebar (4 cols) */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Widget 1: Search Widget */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3 backdrop-blur-md">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-sky-400" />
                  <span>Search Research</span>
                </h3>
                <form method="GET" action="/blog-with-sidebar" className="relative">
                  <input
                    type="text"
                    name="search"
                    defaultValue={search}
                    placeholder="Search keywords..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-9 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>

              {/* Widget 2: Dynamic Categories List */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3.5 backdrop-blur-md">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Folder className="h-3.5 w-3.5 text-sky-400" />
                  <span>Categories</span>
                </h3>

                <div className="divide-y divide-slate-800/80">
                  <Link
                    href="/blog-with-sidebar"
                    className="py-2.5 flex items-center justify-between text-xs text-slate-300 hover:text-sky-400 transition-colors group"
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform">All Engineering Domains</span>
                    <span className="font-mono text-[11px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {total}
                    </span>
                  </Link>

                  {categories.map((cat) => (
                    <Link
                      key={cat.name}
                      href={`/blog-with-sidebar?category=${encodeURIComponent(cat.name)}`}
                      className="py-2.5 flex items-center justify-between text-xs text-slate-300 hover:text-sky-400 transition-colors group"
                    >
                      <span className="group-hover:translate-x-0.5 transition-transform">{cat.name}</span>
                      <span className="font-mono text-[11px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {cat.count}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Widget 3: Recent Published Articles */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 backdrop-blur-md">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
                  <span>Recent Research</span>
                </h3>

                <div className="space-y-3.5">
                  {recentPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="flex items-start gap-3 group"
                    >
                      <div className="h-14 w-14 rounded-lg bg-slate-950 border border-slate-800 shrink-0 overflow-hidden relative">
                        {post.thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.thumb}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-700">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-slate-200 group-hover:text-sky-400 transition-colors line-clamp-2 leading-snug">
                          {post.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {post.publishDate}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Widget 4: Book A Call Strategy CTA */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-3.5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Deploy Custom AI Squads
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Looking to architect production agentic workflows, custom RAG pipelines, or enterprise fine-tuning?
                </p>
                <a
                  href="https://www.nenotechnology.com/contact-us"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02]"
                >
                  <span>Book An Engineering Consultation</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
