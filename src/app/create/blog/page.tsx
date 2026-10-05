"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Sparkles,
  Layers,
  FileText,
  Plus,
  Image as ImageIcon,
  Zap,
  TrendingUp,
  RefreshCw,
  Globe,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BlogGenerationOutput } from "@/validation/blog-schema";
import { AISignalGame, ContentStudioTip } from "@/components/content/ai-signal-game";
import {
  useBackgroundGeneration,
  PIPELINE_STAGES_BLOG,
} from "@/features/generation/background-generation-context";

export default function BlogGeneratorPage() {
  const { activeWorkspace } = useAuth();
  const {
    isGenerating,
    generationType,
    activeBatchIndex,
    totalBatchCount,
    currentGeneratingTitle,
    currentStepIndex,
    pipelineStages,
    errorMessage: bgErrorMessage,
    blogResults: batchResults,
    startBlogBatchGeneration,
    clearGenerationResults,
  } = useBackgroundGeneration();

  const isCurrentBlogGenerating = isGenerating && generationType === "blog";

  // Mode: "single" | "batch"
  const [generationMode, setGenerationMode] = useState<"single" | "batch">("single");

  // Form State
  const [topic, setTopic] = useState("");
  const [batchCount, setBatchCount] = useState<number>(3);
  const [batchTopicsText, setBatchTopicsText] = useState(
    `Designing Zero-Trust Architecture for Microservices in Kubernetes\nAutonomous Multi-Agent Orchestration Patterns in High-Throughput Fintech\nEvent-Driven Microfrontends: Real-World Latency Benchmarks and ROI`
  );
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [desiredLength, setDesiredLength] = useState<"short" | "medium" | "long">("medium");
  const [category, setCategory] = useState("Enterprise AI & Cloud Engineering");
  const [researchPreference, setResearchPreference] = useState(true);

  // AI Image Generation Settings
  const [autoGenerateImage, setAutoGenerateImage] = useState(true);
  const [customImagePrompt, setCustomImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState<
    "dark_tech" | "isometric_3d" | "minimalist_vector" | "architectural_blueprint" | "editorial_photo"
  >("dark_tech");

  const [errorMessage, setErrorMessage] = useState("");
  const [showGamePreview, setShowGamePreview] = useState(false);
  const [isFetchingTopics, setIsFetchingTopics] = useState(false);
  const [trendingSource, setTrendingSource] = useState<string | null>(null);

  const loadBrandDefaults = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/brand`);
      if (res.ok) {
        const data = await res.json();
        const brand = data.brand;
        if (brand) {
          if (brand.audience && !audience) setAudience(brand.audience);
          if (brand.tone && !tone) setTone(brand.tone);
          if (brand.industry && category === "Enterprise AI & Cloud Engineering") setCategory(brand.industry);
        }
      }
    } catch (err) {
      console.error("Failed to load brand defaults:", err);
    }
  }, [activeWorkspace, audience, tone, category]);

  useEffect(() => {
    loadBrandDefaults();
  }, [loadBrandDefaults]);

  // Fallback curated tech topics if offline
  const FALLBACK_IDEAS = [
    "Designing Zero-Trust Architecture for Microservices in Kubernetes",
    "Autonomous Multi-Agent Orchestration Patterns in High-Throughput Fintech",
    "Event-Driven Microfrontends: Real-World Latency Benchmarks and ROI",
    "Real-Time Vector Search & Semantic Caching: Slashing LLM Latency by 80%",
    "Deterministic Guardrails & Telemetry for Production Enterprise LLMs",
    "Hybrid Cloud FinOps: Optimizing GPU Compute Allocation and Cloud Spend",
    "Continuous Observability: Distributed Tracing in Microfrontends and Edge Services",
    "Graph RAG vs. Vector RAG: Choosing the Right Knowledge Retrieval Architecture",
    "Low-Latency Streaming Audio Pipelines for Enterprise Voice AI Agents",
    "Automated Model Governance & Compliance in Regulated Enterprise AI",
  ];

  // Fetch real-time trending topics from live tech feeds & AI synthesis
  const handleFetchTrendingTopics = async (count: number = 5, isSingle: boolean = false) => {
    const targetCount = Math.max(1, Math.min(10, count));
    setIsFetchingTopics(true);
    try {
      const res = await fetch("/api/topics/trending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          count: isSingle ? 1 : targetCount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.topics && Array.isArray(data.topics) && data.topics.length > 0) {
          if (isSingle) {
            setTopic(data.topics[0]);
          } else {
            setBatchCount(data.topics.length);
            setBatchTopicsText(data.topics.join("\n"));
          }
          setTrendingSource(
            data.source === "live_internet_trending"
              ? "Live Internet Tech Discussions"
              : data.source === "live_ai_synthesis"
              ? "AI Tech Radar Synthesis"
              : "Dynamic Knowledge Bank"
          );
          return;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch live trending topics from endpoint, using dynamic shuffle fallback:", err);
    } finally {
      setIsFetchingTopics(false);
    }

    // Dynamic shuffle fallback
    const shuffled = [...FALLBACK_IDEAS].sort(() => 0.5 - Math.random());
    if (isSingle) {
      setTopic(shuffled[0]);
    } else {
      setBatchCount(targetCount);
      setBatchTopicsText(shuffled.slice(0, targetCount).join("\n"));
    }
    setTrendingSource("Dynamic Knowledge Bank");
  };

  const handleGenerateTopicIdeas = (count: number) => {
    handleFetchTrendingTopics(count, false);
  };

  // Extract parsed topics list (capped at maximum 10)
  const parsedTopics =
    generationMode === "batch"
      ? batchTopicsText
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 10)
      : topic.trim()
      ? [topic.trim()]
      : [];

  const handleStartGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || parsedTopics.length === 0) return;

    setErrorMessage("");
    await startBlogBatchGeneration({
      workspaceId: activeWorkspace.id,
      topics: parsedTopics,
      audience: audience || "CTOs, Engineering Leaders, Tech Founders",
      tone: tone || "Authoritative, insightful, modern, highly articulate",
      desiredLength,
      category: category || "Enterprise AI & Cloud Engineering",
      researchPreference,
      autoGenerateImage,
      customImagePrompt: customImagePrompt.trim() || undefined,
      imageStyle,
    });
  };

  const activeErrorMessage = errorMessage || bgErrorMessage;
  const stages = pipelineStages && pipelineStages.length > 0 ? pipelineStages : PIPELINE_STAGES_BLOG;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/create"
            className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Create Blog Posts
            </h1>
            <p className="text-xs text-slate-500">
              Generate single technical articles or orchestrate multiple batch posts at once
            </p>
          </div>
        </div>

        {/* Mode Selector & AI Signal Preview */}
        {!isCurrentBlogGenerating && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowGamePreview(!showGamePreview)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                showGamePreview
                  ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-orange-500" />
              <span>{showGamePreview ? "Close AI Signal" : "Play AI Signal"}</span>
            </button>

            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setGenerationMode("single")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  generationMode === "single"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Single Article</span>
              </button>
              <button
                type="button"
                onClick={() => setGenerationMode("batch")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  generationMode === "batch"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="h-3.5 w-3.5 text-orange-600" />
                <span>Batch Generator</span>
                <Badge variant="outline" className="text-[10px] py-0 px-1 border-orange-200 text-orange-700 bg-orange-50">
                  Bulk
                </Badge>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Signal Interactive Area (when toggled on or during generation) */}
      {!isCurrentBlogGenerating && showGamePreview && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-200">
          <AISignalGame />
          <ContentStudioTip />
        </div>
      )}

      {activeErrorMessage && (
        <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{activeErrorMessage}</span>
        </div>
      )}

      {/* Real-time Progress State with Interactive AI Signal Waiting Experience */}
      {isCurrentBlogGenerating && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* 1. Generation Status Card */}
          <Card className="p-6 border border-orange-200 bg-orange-50/40 shadow-sm space-y-4">
            <div className="max-w-md mx-auto text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-orange-700 font-semibold text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                <span>
                  {totalBatchCount > 1
                    ? `Generating Article ${activeBatchIndex} of ${totalBatchCount}`
                    : "Generating Article"}
                </span>
              </div>

              <div className="text-sm font-bold text-slate-900 truncate px-4">
                &ldquo;{currentGeneratingTitle}&rdquo;
              </div>

              <p className="text-xs text-slate-600 font-medium">
                {stages[currentStepIndex]}
              </p>

              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-full transition-all duration-500 rounded-full shadow-sm"
                  style={{
                    width: `${
                      totalBatchCount > 1
                        ? ((activeBatchIndex - 1 + (currentStepIndex + 1) / stages.length) /
                            totalBatchCount) *
                          100
                        : ((currentStepIndex + 1) / stages.length) * 100
                    }%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
                <span>
                  {batchResults.length} of {totalBatchCount} articles finished
                </span>
                <span className="text-orange-700 font-medium">
                  Runs continuously in background if you leave page
                </span>
              </div>
            </div>
          </Card>

          {/* 2. Interactive "AI Signal" Mini Experience */}
          <AISignalGame />

          {/* 3. Rotating Content Studio Tips */}
          <ContentStudioTip />
        </div>
      )}

      {/* Generation Complete Output Banner */}
      {!isCurrentBlogGenerating && batchResults.length > 0 && (
        <Card className="border border-emerald-200 bg-emerald-50/40 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/60 pb-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {batchResults.length === 1
                    ? "Article Generated & Saved as Draft"
                    : `Batch Completed: ${batchResults.length} Articles Generated`}
                </h3>
                <p className="text-xs text-slate-500">
                  All articles formatted with SEO metadata, citations, and website schema.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearGenerationResults}
                className="text-xs h-8 bg-white border-slate-200 text-slate-600"
              >
                Start New Run
              </Button>
              <Link href="/content">
                <Button variant="primary" size="sm" className="text-xs h-8">
                  View in Content Library
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {batchResults.map((item, idx) => {
              const imgUrl =
                item.result.featuredImage?.url ||
                item.result.featuredImage?.brief;
              const hasValidImage = imgUrl && (imgUrl.startsWith("http") || imgUrl.startsWith("data:"));

              return (
                <div
                  key={item.contentId}
                  className="p-4 rounded-lg bg-white border border-slate-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-all shadow-sm"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {hasValidImage ? (
                      <div className="w-20 h-14 rounded-md overflow-hidden bg-slate-900 shrink-0 border border-slate-200 shadow-sm relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt={item.result.featuredImage?.altText || item.result.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-slate-400 font-semibold">
                          0{idx + 1}
                        </span>
                        <span className="font-semibold text-slate-900 truncate">
                          {item.result.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-200 bg-slate-50 text-slate-700">
                          {item.result.category || "AI Architecture"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-orange-200 bg-orange-50 text-orange-700">
                          {item.result.readingTime || "5 min read"}
                        </Badge>
                      </div>
                      <p className="text-slate-500 text-[11px] line-clamp-1">
                        {item.result.shortDescription || item.result.excerpt}
                      </p>
                      {hasValidImage && (
                        <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Hero visual auto-generated & embedded
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Link href={`/blog/${item.contentId}/edit`}>
                      <Button variant="primary" size="sm" className="gap-1.5 text-xs h-8">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Open in Blog CMS</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Main Generation Form */}
      {!isCurrentBlogGenerating && (
        <form onSubmit={handleStartGeneration} className="space-y-5">
          <Card className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>{generationMode === "batch" ? "Batch Topics (Bulk Queue)" : "Article Topic"}</span>
                  {trendingSource && (
                    <Badge variant="outline" className="text-[10px] py-0 px-2 border-orange-200 bg-orange-50 text-orange-700 font-medium flex items-center gap-1">
                      <Globe className="h-2.5 w-2.5" />
                      <span>{trendingSource}</span>
                    </Badge>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {generationMode === "batch"
                    ? "Choose how many articles to generate in one run (up to 10), or pull live tech trends below."
                    : "Specify the primary topic or pull the latest breakthrough from the tech world"}
                </p>
              </div>

              {generationMode === "batch" ? (
                <button
                  type="button"
                  disabled={isFetchingTopics}
                  onClick={() => handleFetchTrendingTopics(batchCount || 5, false)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 px-3 py-1.5 rounded-md border border-orange-200 transition-colors shadow-sm"
                >
                  {isFetchingTopics ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-orange-600" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5 text-orange-600" />
                  )}
                  <span>{isFetchingTopics ? "Fetching Live Tech Trends..." : `Pull ${batchCount || 5} Live Trends`}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isFetchingTopics}
                  onClick={() => handleFetchTrendingTopics(1, true)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 px-3 py-1.5 rounded-md border border-orange-200 transition-colors shadow-sm"
                >
                  {isFetchingTopics ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-orange-600" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-orange-600" />
                  )}
                  <span>{isFetchingTopics ? "Synthesizing..." : "⚡ Suggest Live Tech Trend"}</span>
                </button>
              )}
            </div>

            {generationMode === "single" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Topic / Working Title
                </label>
                <Input
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Designing Zero-Trust Architecture for Microservices in Kubernetes"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Batch Size Selection */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-orange-600" />
                      <span>Bulk Batch Size (Up to 10 Articles)</span>
                    </label>
                    <span className="text-[11px] font-mono text-slate-500">
                      {parsedTopics.length} of 10 slots used
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium mr-1">Quick Select &amp; Live Trend Fill:</span>
                    {[2, 3, 5, 8, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        disabled={isFetchingTopics}
                        onClick={() => handleFetchTrendingTopics(num, false)}
                        className={`h-7 px-3 text-xs font-semibold rounded-md border transition-all ${
                          batchCount === num && parsedTopics.length === num
                            ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-300 hover:border-orange-400 hover:text-orange-600"
                        }`}
                      >
                        {num} Articles {num === 10 ? "(Max)" : ""}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Topics Queue (1 topic per line &bull; Max 10)
                    </label>
                    <span className={`text-[11px] font-semibold ${parsedTopics.length >= 10 ? "text-amber-700 font-mono" : "text-slate-500"}`}>
                      {parsedTopics.length} / 10 Articles Queued
                    </span>
                  </div>
                  <Textarea
                    required
                    rows={6}
                    value={batchTopicsText}
                    onChange={(e) => {
                      setBatchTopicsText(e.target.value);
                      const lines = e.target.value.split("\n").filter((l) => l.trim().length > 0);
                      setBatchCount(Math.min(10, lines.length || 1));
                    }}
                    placeholder={`Designing Zero-Trust Architecture for Microservices in Kubernetes\nAutonomous Multi-Agent Orchestration Patterns in High-Throughput Fintech\nEvent-Driven Microfrontends: Real-World Latency Benchmarks and ROI\nReal-Time Vector Search & Semantic Caching: Slashing LLM Latency by 80%\nDeterministic Guardrails & Telemetry for Production Enterprise LLMs`}
                    className="font-mono text-xs leading-relaxed bg-white"
                  />
                  {batchTopicsText.split("\n").filter((l) => l.trim().length > 0).length > 10 && (
                    <p className="text-[11px] text-amber-700 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>Only the first 10 topics will be processed in this batch run.</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category
                </label>
                <Input
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Enterprise AI & Cloud Engineering"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Length per Article
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "short", label: "Short (~800w)" },
                    { key: "medium", label: "Medium (~1.4k)" },
                    { key: "long", label: "Deep (~2.2k)" },
                  ].map((len) => (
                    <button
                      key={len.key}
                      type="button"
                      onClick={() => setDesiredLength(len.key as "short" | "medium" | "long")}
                      className={`py-1.5 px-2 rounded-md border text-xs font-medium transition-colors ${
                        desiredLength === len.key
                          ? "bg-orange-50 border-orange-500 text-orange-700 font-semibold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {len.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* AI Featured Hero Image Configuration */}
          <Card className="p-5 space-y-4 border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-orange-100/70 text-orange-600">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    AI Featured Hero Image & Visuals
                  </h3>
                  <p className="text-xs text-slate-500">
                    Auto-generate a 16:9 high-resolution hero image directly from the topic and embed it into the blog
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoGenImageToggle"
                  checked={autoGenerateImage}
                  onChange={(e) => setAutoGenerateImage(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="autoGenImageToggle" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                  Enable Auto-Image
                </label>
              </div>
            </div>

            {autoGenerateImage && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Visual Style Preset
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {[
                      { key: "dark_tech", label: "Dark Tech", desc: "Slate & Cyan Glow" },
                      { key: "isometric_3d", label: "Isometric 3D", desc: "Floating Glass Nodes" },
                      { key: "minimalist_vector", label: "Minimalist", desc: "Swiss Editorial Vector" },
                      { key: "architectural_blueprint", label: "Blueprint", desc: "CAD Engineering Wire" },
                      { key: "editorial_photo", label: "Editorial", desc: "Corporate Hasselblad" },
                    ].map((st) => (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() =>
                          setImageStyle(
                            st.key as
                              | "dark_tech"
                              | "isometric_3d"
                              | "minimalist_vector"
                              | "architectural_blueprint"
                              | "editorial_photo"
                          )
                        }
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          imageStyle === st.key
                            ? "bg-orange-50/80 border-orange-500 ring-1 ring-orange-500/20 shadow-sm"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className={`text-xs font-semibold ${imageStyle === st.key ? "text-orange-950" : "text-slate-800"}`}>
                          {st.label}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                          {st.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Custom Image Prompt <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      If blank, AI crafts rich prompt from topic & category
                    </span>
                  </div>
                  <Textarea
                    rows={2}
                    value={customImagePrompt}
                    onChange={(e) => setCustomImagePrompt(e.target.value)}
                    placeholder="e.g. Minimalist 3D isometric cloud cluster with floating obsidian nodes, luminous emerald conduits, volumetric lighting, Octane render 8k"
                    className="text-xs resize-none"
                  />
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Audience & Tone</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target audience persona and editorial voice applied to generation
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Reader Persona
                </label>
                <Input
                  required
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g., CTOs, Engineering Leaders, VP of Product, Tech Founders"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tone of Voice
                </label>
                <Input
                  required
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="e.g., Authoritative, insightful, modern, highly articulate"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  Grounding & Source Verification
                </span>
                <span className="text-xs text-slate-500">
                  Retrieve verified citations from research repository
                </span>
              </div>
              <input
                type="checkbox"
                checked={researchPreference}
                onChange={(e) => setResearchPreference(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
            </div>
          </Card>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Link href="/create">
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="default"
              className="gap-2 font-semibold h-9"
              disabled={isGenerating || parsedTopics.length === 0}
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {generationMode === "batch"
                  ? `Generate ${parsedTopics.length} Blog Post${parsedTopics.length !== 1 ? "s" : ""}`
                  : "Generate Blog Post"}
              </span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
