"use client";

import { Bell, Search, Plus, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { useBackgroundGeneration } from "@/features/generation/background-generation-context";

export function Header() {
  const { user, activeWorkspace } = useAuth();
  const pathname = usePathname();
  const {
    isGenerating,
    generationType,
    activeBatchIndex,
    totalBatchCount,
    hasUnreadCompletion,
    blogResults,
    caseStudyResults,
  } = useBackgroundGeneration();

  const getPageTitle = (path: string) => {
    if (path === "/") return "Dashboard";
    if (path.startsWith("/blog")) return "Blog Management";
    if (path.startsWith("/case-studies")) return "Case Studies Management";
    if (path.startsWith("/create")) return "Create Content";
    if (path.startsWith("/content")) return "Content Library";
    if (path.startsWith("/trash")) return "Trash / Recycle Bin";
    if (path.startsWith("/research")) return "Research Workspace";
    if (path.startsWith("/media")) return "Media Library";
    if (path.startsWith("/templates")) return "Templates";
    if (path.startsWith("/settings")) return "Settings";
    return "AI Content Studio";
  };

  const getInitials = (name?: string) => {
    if (!name) return "AI";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const targetLink = generationType === "case-study" ? "/create/case-study" : "/create/blog";
  const completedCount = generationType === "case-study" ? caseStudyResults.length : blogResults.length;

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Breadcrumb / Section Name */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">Workspace</span>
        <span className="text-xs text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-900">{getPageTitle(pathname)}</span>
      </div>

      {/* Center: Search input & Background Status Indicator */}
      <div className="flex items-center gap-3">
        {isGenerating && (
          <Link
            href={targetLink}
            className="flex items-center gap-2 px-3 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-full text-xs font-semibold shadow-xs transition-colors"
          >
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-600"></span>
            </div>
            <span>Generating {activeBatchIndex} of {totalBatchCount} in background</span>
          </Link>
        )}

        {!isGenerating && hasUnreadCompletion && (
          <Link
            href="/content"
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-full text-xs font-semibold shadow-xs transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{completedCount} items generated</span>
          </Link>
        )}

        <div className="relative w-72 max-w-sm hidden lg:flex">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeWorkspace?.name || "content"}...`}
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 transition-colors"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        <Link href="/create">
          <Button variant="primary" size="sm" className="gap-1.5 h-8 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" />
            <span>Create Content</span>
          </Button>
        </Link>
        <button
          type="button"
          aria-label="Notifications"
          className="h-8 w-8 rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div
          title={user?.email || "User"}
          className="h-8 w-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-xs font-bold text-orange-700 select-none"
        >
          {getInitials(user?.name)}
        </div>
      </div>
    </header>
  );
}
