import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ContentService } from "@/services/content-service";
import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { BlogReader } from "@/components/blog/blog-reader";
import { ChevronRight, Calendar, Clock, ArrowLeft, Sparkles, Layers, ArrowUpRight } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const blog = await ContentService.getPublicBlogBySlugOrId(id);

  if (!blog || (blog.status !== "approved" && blog.status !== "exported")) {
    return {
      title: "Article Not Found | Neno Technology",
      description: "The requested research paper or technical article could not be found.",
    };
  }

  const title = blog.seoTitle || blog.title;
  const description = blog.metaDescription || blog.excerpt || `Read ${blog.title} on Neno Technology Engineering Insights.`;
  const canonicalUrl = `https://www.nenotechnology.com/blog/${blog.slug || blog.id}`;

  return {
    title: `${title} | Neno Technology Engineering Insights`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} | Neno Technology`,
      description,
      url: canonicalUrl,
      siteName: "Neno Technology",
      images: blog.thumb
        ? [
            {
              url: blog.thumb,
              width: 1200,
              height: 630,
              alt: blog.title,
            },
          ]
        : [],
      type: "article",
      publishedTime: blog.publishDate || new Date(blog.created_at).toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Neno Technology`,
      description,
      images: blog.thumb ? [blog.thumb] : [],
    },
  };
}

export default async function PublicBlogDetailPage({ params }: Props) {
  const { id } = await params;
  const blog = await ContentService.getPublicBlogBySlugOrId(id);

  // Security check: strictly require published status and non-deleted
  if (!blog || (blog.status !== "approved" && blog.status !== "exported")) {
    notFound();
  }

  // Fetch recent research for sidebar
  const recentData = await ContentService.listPublicBlogs({ limit: 5 });
  const relatedBlogs = recentData.items.filter((b) => b.id !== blog.id).slice(0, 4);

  const formattedDate = blog.publishDate || new Date(blog.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-cyan-500/20 selection:text-cyan-300 relative overflow-x-hidden">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-sky-500/8 rounded-full blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <PublicHeader />

      <main className="relative z-10 flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 py-3 px-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-400">
            <Link href="https://www.nenotechnology.com" className="hover:text-cyan-400 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <Link href="/blog-with-sidebar" className="hover:text-cyan-400 transition-colors">
              Blog & Insights
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-200 font-medium truncate max-w-[280px] sm:max-w-md">
              {blog.title}
            </span>
          </nav>

          <Link
            href="/blog-with-sidebar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to all articles
          </Link>
        </div>

        {/* Hero Section */}
        <header className="mb-12">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              {blog.category || "Engineering Architecture"}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {formattedDate}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {blog.readingTime || "7 min read"}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight sm:leading-tight mb-6">
            {blog.title}
          </h1>

          {blog.excerpt && (
            <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-4xl mb-6">
              {blog.excerpt}
            </p>
          )}

          <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-cyan-500/20">
                {blog.author ? blog.author.charAt(0).toUpperCase() : "N"}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{blog.author || "Mit Patel"}</div>
                <div className="text-xs text-slate-400">Founding Engineer & Principal Architect</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/60 font-mono">
                Slug: /blog/{blog.slug}
              </span>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {blog.thumb && (
          <div className="mb-12 rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900 shadow-2xl relative aspect-[21/9] max-h-[520px]">
            <img
              src={blog.thumb}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b14]/60 via-transparent to-transparent pointer-events-none" />
          </div>
        )}

        {/* Main Content & Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Article Body */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-6 sm:p-8 md:p-10 shadow-xl">
              <BlogReader
                title={blog.title}
                category={blog.category}
                author={blog.author}
                publishDate={formattedDate}
                readingTime={blog.readingTime}
                shortDescription={blog.excerpt}
                content={blog.content || `# ${blog.title}\n\n${blog.excerpt}`}
                className="prose-invert"
              />
            </div>

            {/* Author Bio Box */}
            <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-cyan-950/20 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shrink-0 ring-4 ring-cyan-500/20 shadow-lg">
                {blog.author ? blog.author.charAt(0).toUpperCase() : "N"}
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wider font-semibold text-cyan-400 mb-1">
                  Written by
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5">{blog.author || "Mit Patel"}</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Principal Architect at Neno Technology. Specializing in high-throughput cloud systems, distributed LLM orchestration, and next-generation enterprise frontend architecture.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            {/* CTA Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/30 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500" />
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center mb-4 text-cyan-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Build Production AI with Neno</h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-5">
                  Looking to engineer high-throughput LLM pipelines, distributed agent workflows, or resilient microfrontends?
                </p>
                <a
                  href="https://www.nenotechnology.com/contact"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 transition-all"
                >
                  Schedule an Architecture Review
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Related/Recent Research */}
            {relatedBlogs.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Related Research
                </h4>
                <div className="space-y-4">
                  {relatedBlogs.map((item) => (
                    <Link
                      key={item.id}
                      href={`/blog/${item.slug || item.id}`}
                      className="group block p-3 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800/60 hover:border-cyan-500/40 transition-all"
                    >
                      <div className="text-[11px] font-medium text-cyan-400 mb-1">
                        {item.category || "Engineering"}
                      </div>
                      <h5 className="text-xs font-semibold text-slate-200 group-hover:text-white line-clamp-2 leading-snug">
                        {item.title}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2">
                        <span>{item.readingTime || "6 min read"}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
