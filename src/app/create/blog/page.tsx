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
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BlogGenerationOutput } from "@/validation/blog-schema";

const PIPELINE_STAGES = [
  "Initializing Generation Run & Brand Profile",
  "Research: Retrieving Grounded Citations & Benchmarks",
  "Strategy: Formulating Structure Outline & Key Points",
  "Writing: Drafting Full-Length Technical Article",
  "SEO: Optimizing Keywords & Meta Descriptions",
  "QA: Verifying Brand Rules & Formatting",
];

interface GeneratedBlogResult {
  contentId: string;
  result: BlogGenerationOutput;
  topic: string;
}

export default function BlogGeneratorPage() {
  const { activeWorkspace } = useAuth();

  // Mode: "single" | "batch"
  const [generationMode, setGenerationMode] = useState<"single" | "batch">("single");

  // Form State
  const [topic, setTopic] = useState("");
  const [batchTopicsText, setBatchTopicsText] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [desiredLength, setDesiredLength] = useState<"short" | "medium" | "long">("medium");
  const [category, setCategory] = useState("Engineering");
  const [researchPreference, setResearchPreference] = useState(true);

  // AI Image Generation Settings
  const [autoGenerateImage, setAutoGenerateImage] = useState(true);
  const [customImagePrompt, setCustomImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState<
    "dark_tech" | "isometric_3d" | "minimalist_vector" | "architectural_blueprint" | "editorial_photo"
  >("dark_tech");

  // Execution & Progress State
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  const [totalBatchCount, setTotalBatchCount] = useState(0);
  const [currentGeneratingTitle, setCurrentGeneratingTitle] = useState("");

  // Completed Results
  const [batchResults, setBatchResults] = useState<GeneratedBlogResult[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

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
          if (brand.industry && category === "Engineering") setCategory(brand.industry);
        }
      }
    } catch (err) {
      console.error("Failed to load brand defaults:", err);
    }
  }, [activeWorkspace, audience, tone, category]);

  useEffect(() => {
    loadBrandDefaults();
  }, [loadBrandDefaults]);

  // Extract parsed topics list
  const parsedTopics =
    generationMode === "batch"
      ? batchTopicsText
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean)
      : topic.trim()
      ? [topic.trim()]
      : [];

  const handleStartGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || parsedTopics.length === 0) return;

    setIsGenerating(true);
    setErrorMessage("");
    setBatchResults([]);
    setTotalBatchCount(parsedTopics.length);

    const completed: GeneratedBlogResult[] = [];

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < PIPELINE_STAGES.length - 1) return prev + 1;
        return 0;
      });
    }, 1400);

    try {
      for (let i = 0; i < parsedTopics.length; i++) {
        const currentTopic = parsedTopics[i];
        setActiveBatchIndex(i + 1);
        setCurrentGeneratingTitle(currentTopic);
        setCurrentStepIndex(0);

        try {
          const res = await fetch("/api/generation/blog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId: activeWorkspace.id,
              topic: currentTopic,
              audience: audience || "CTOs, Engineering Leaders, Tech Founders",
              tone: tone || "Authoritative, insightful, modern, highly articulate",
              desiredLength,
              category: category || "Enterprise AI & Cloud Engineering",
              researchPreference,
              autoGenerateImage,
              customImagePrompt: customImagePrompt.trim() || undefined,
              imageStyle,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            completed.push({
              contentId: data.contentId,
              result: data.result,
              topic: currentTopic,
            });
            setBatchResults([...completed]);
          } else {
            const errData = await res.json();
            console.error(`Error generating "${currentTopic}":`, errData);
          }
        } catch (err) {
          console.error(`Failed to generate topic "${currentTopic}":`, err);
        }
      }

      if (completed.length === 0) {
        setErrorMessage("Generation failed for all requested topics. Please check your network or API keys.");
      }
    } catch {
      setErrorMessage("Network error during generation execution");
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const handleLoadSampleBatch = () => {
    setBatchTopicsText(
      `Designing Zero-Trust Architecture for Microservices in Kubernetes\nAutonomous Multi-Agent Orchestration Patterns in High-Throughput Fintech\nEvent-Driven Microfrontends: Real-World Latency Benchmarks and ROI`
    );
  };

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

        {/* Mode Selector */}
        {!isGenerating && (
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
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Real-time Progress State */}
      {isGenerating && (
        <Card className="p-6 border border-orange-200 bg-orange-50/40 space-y-4">
          <div className="max-w-md mx-auto text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-orange-700 font-semibold text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
              <span>
                {totalBatchCount > 1
                  ? `Generating Article ${activeBatchIndex} of ${totalBatchCount}`
                  : "Generating Content"}
              </span>
            </div>

            <div className="text-xs font-medium text-slate-900 truncate px-4">
              &ldquo;{currentGeneratingTitle}&rdquo;
            </div>

            <p className="text-xs text-slate-600">
              {PIPELINE_STAGES[currentStepIndex]}
            </p>

            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-orange-500 h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${
                    totalBatchCount > 1
                      ? ((activeBatchIndex - 1 + (currentStepIndex + 1) / PIPELINE_STAGES.length) /
                          totalBatchCount) *
                        100
                      : ((currentStepIndex + 1) / PIPELINE_STAGES.length) * 100
                  }%`,
                }}
              />
            </div>
            {totalBatchCount > 1 && (
              <p className="text-[11px] text-slate-500">
                {batchResults.length} of {totalBatchCount} articles finished
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Generation Complete Output Banner */}
      {!isGenerating && batchResults.length > 0 && (
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

            <Link href="/content">
              <Button variant="outline" size="sm" className="text-xs h-8 bg-white border-slate-200">
                View in Content Library
              </Button>
            </Link>
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
      {!isGenerating && (
        <form onSubmit={handleStartGeneration} className="space-y-5">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {generationMode === "batch" ? "Batch Topics (Bulk Queue)" : "Article Topic"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {generationMode === "batch"
                    ? "Enter up to 10 topics (one per line). Each will be independently researched and generated."
                    : "Specify the primary topic and target category"}
                </p>
              </div>

              {generationMode === "batch" && (
                <button
                  type="button"
                  onClick={handleLoadSampleBatch}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Load Sample Topics</span>
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
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Topics List (One per line)
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {parsedTopics.length} topic{parsedTopics.length !== 1 ? "s" : ""} queued
                  </span>
                </div>
                <Textarea
                  required
                  rows={5}
                  value={batchTopicsText}
                  onChange={(e) => setBatchTopicsText(e.target.value)}
                  placeholder={`Designing Zero-Trust Architecture for Microservices in Kubernetes\nAutonomous Multi-Agent Orchestration Patterns in High-Throughput Fintech\nEvent-Driven Microfrontends: Real-World Latency Benchmarks and ROI`}
                  className="font-mono text-xs leading-relaxed"
                />
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
