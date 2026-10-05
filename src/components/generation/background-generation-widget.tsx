"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
  Loader2,
  Layers,
  FileText,
} from "lucide-react";
import { useBackgroundGeneration } from "@/features/generation/background-generation-context";
import { Button } from "@/components/ui/button";

export function BackgroundGenerationWidget() {
  const pathname = usePathname();
  const {
    isGenerating,
    generationType,
    activeBatchIndex,
    totalBatchCount,
    currentGeneratingTitle,
    currentStepIndex,
    pipelineStages,
    isCompleted,
    hasUnreadCompletion,
    isWidgetMinimized,
    toggleWidgetMinimized,
    dismissCompletionNotification,
    blogResults,
    caseStudyResults,
  } = useBackgroundGeneration();

  // If user is already on the create page and generation is active, the in-page UI is handling the main view.
  // We only show the floating background widget when the user navigates AWAY to other pages (or when minimized/completed).
  const isOnActiveCreatePage =
    (generationType === "blog" && pathname === "/create/blog") ||
    (generationType === "case-study" && pathname === "/create/case-study");

  if (!isGenerating && !hasUnreadCompletion) {
    return null;
  }

  // If they are on the create page while it's generating, suppress the floating card to avoid duplicate view.
  if (isOnActiveCreatePage && !hasUnreadCompletion) {
    return null;
  }

  const targetLink = generationType === "case-study" ? "/create/case-study" : "/create/blog";
  const completedCount = generationType === "case-study" ? caseStudyResults.length : blogResults.length;
  const currentStageName = pipelineStages[currentStepIndex] || "Processing with AI Engine...";
  const progressPercent = totalBatchCount > 0 ? Math.round(((completedCount) / totalBatchCount) * 100) : 0;

  // 1. Completed State Floating Banner
  if (!isGenerating && hasUnreadCompletion) {
    return (
      <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-slate-900 border border-emerald-500/50 text-white rounded-xl shadow-2xl p-4 space-y-3 backdrop-blur-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">
                  {generationType === "case-study" ? "Case Studies Generated" : "Blog Posts Generated"}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {completedCount} of {totalBatchCount} articles saved to database
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissCompletionNotification}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Link href="/content" className="flex-1" onClick={dismissCompletionNotification}>
              <Button variant="primary" size="sm" className="w-full text-xs h-7 gap-1 bg-emerald-600 hover:bg-emerald-500 text-white">
                <span>View in Library</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
            <Link href={targetLink} onClick={dismissCompletionNotification}>
              <Button variant="outline" size="sm" className="text-xs h-7 bg-slate-800 border-slate-700 text-slate-200 hover:text-white">
                Open Generator
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Generating State Minimized Pill
  if (isWidgetMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          type="button"
          onClick={toggleWidgetMinimized}
          className="flex items-center gap-2.5 bg-slate-900 border border-orange-500/60 shadow-2xl px-3.5 py-2 rounded-full text-white hover:bg-slate-800 transition-all cursor-pointer group"
        >
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </div>
          <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
            Generating {activeBatchIndex} of {totalBatchCount} ({progressPercent}%)
          </span>
          <ChevronUp className="h-3.5 w-3.5 text-slate-400 group-hover:text-white" />
        </button>
      </div>
    );
  }

  // 3. Generating State Expanded Floating Card
  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900/95 border border-slate-700/80 text-white rounded-xl shadow-2xl p-4 space-y-3.5 backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>Background Generation Active</span>
                <span className="text-[10px] font-mono font-normal text-orange-400 bg-orange-950/60 border border-orange-800/40 px-1.5 py-0.2 rounded">
                  {completedCount} / {totalBatchCount} Done
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleWidgetMinimized}
              title="Minimize"
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Current Active Item & Stage */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Item {activeBatchIndex} of {totalBatchCount}</span>
            <span className="text-orange-400 font-mono font-medium">{progressPercent}%</span>
          </div>

          <p className="text-xs font-semibold text-slate-100 line-clamp-1 italic">
            &ldquo;{currentGeneratingTitle || "Autonomous Technical Article"}&rdquo;
          </p>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-orange-400 shrink-0" />
            <span className="truncate">{currentStageName}</span>
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-2">
            <div
              className="bg-orange-500 h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.max(8, ((activeBatchIndex - 1 + 0.5) / Math.max(1, totalBatchCount)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-[10px] text-slate-500">
            Safe to browse any page &bull; generating in background
          </span>

          <Link href={targetLink}>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5 bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 gap-1"
            >
              <span>Full View</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
