"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowLeft,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Layers,
  ArrowRight,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BlogGenerationOutput } from "@/validation/blog-schema";

const PIPELINE_STAGES = [
  "Initializing Generation Run & Brand Profile",
  "Research Agent: Retrieving Grounded Citations & Benchmarks",
  "Strategist Agent: Formulating Architecture Outline & Key Points",
  "Writer Agent: Generating Full-Length Technical Article",
  "SEO Agent: Optimizing Keywords, Meta Descriptions & Slugs",
  "QA & Image Agent: Verifying Brand Rules & Designing Visual Briefs",
];

export default function BlogGeneratorPage() {
  const router = useRouter();
  const { activeWorkspace } = useAuth();

  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [desiredLength, setDesiredLength] = useState<"short" | "medium" | "long">("medium");
  const [category, setCategory] = useState("Engineering");
  const [researchPreference, setResearchPreference] = useState(true);

  // Execution State
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [generationOutput, setGenerationOutput] = useState<BlogGenerationOutput | null>(null);
  const [createdContentId, setCreatedContentId] = useState<string | null>(null);
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

  const handleStartGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !topic.trim()) return;

    setIsGenerating(true);
    setCurrentStepIndex(0);
    setErrorMessage("");
    setGenerationOutput(null);

    // Progressive stage animation timer
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < PIPELINE_STAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 1200);

    try {
      const res = await fetch("/api/generation/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          topic,
          audience,
          tone,
          desiredLength,
          category,
          researchPreference,
        }),
      });

      clearInterval(interval);

      if (res.ok) {
        const data = await res.json();
        setCurrentStepIndex(PIPELINE_STAGES.length - 1);
        setGenerationOutput(data.result);
        setCreatedContentId(data.contentId);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Generation pipeline encountered an error");
      }
    } catch {
      clearInterval(interval);
      setErrorMessage("Network error during generation execution");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-studio-800/60 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/create"
            className="p-1.5 rounded-lg border border-studio-800 text-studio-400 hover:text-white hover:bg-studio-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Autonomous Blog Generator
            </h1>
            <p className="text-xs text-studio-400">
              Multi-agent pipeline for research-grounded technical articles in <strong>{activeWorkspace?.name}</strong>
            </p>
          </div>
        </div>

        <Badge variant="info">Multi-Agent Engine</Badge>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-300 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Generation Progress Display */}
      {isGenerating && (
        <Card className="p-8 border-brand-500/50 bg-studio-900/90 shadow-2xl">
          <div className="text-center space-y-4 max-w-lg mx-auto">
            <div className="h-14 w-14 rounded-2xl bg-brand-950 border border-brand-800 flex items-center justify-center text-brand-400 mx-auto shadow-lg shadow-brand-950">
              <Sparkles className="h-7 w-7 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Autonomous Agents at Work
              </h3>
              <p className="text-xs text-brand-400 font-medium mt-1">
                {PIPELINE_STAGES[currentStepIndex]}
              </p>
            </div>

            <div className="w-full bg-studio-950 rounded-full h-2 overflow-hidden border border-studio-800">
              <div
                className="bg-gradient-to-r from-brand-600 to-indigo-400 h-full transition-all duration-700 rounded-full"
                style={{
                  width: `${((currentStepIndex + 1) / PIPELINE_STAGES.length) * 100}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-6 gap-1 pt-2">
              {PIPELINE_STAGES.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-colors ${
                    idx <= currentStepIndex ? "bg-brand-500" : "bg-studio-800"
                  }`}
                />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Generation Complete Result Banner */}
      {generationOutput && createdContentId && (
        <Card className="border-emerald-800/80 bg-emerald-950/30 p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-900/60 border border-emerald-700 flex items-center justify-center text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Draft Successfully Generated & Saved
                </h3>
                <p className="text-xs text-emerald-300 mt-0.5">
                  Saved with Version 1 snapshot, SEO metadata, and research citations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link href={`/content/${createdContentId}`}>
                <Button variant="primary" size="md" className="gap-2 bg-emerald-600 hover:bg-emerald-500">
                  <Eye className="h-4 w-4" />
                  <span>Open in Editor</span>
                </Button>
              </Link>
              <Link href="/content">
                <Button variant="secondary" size="md">
                  View Content Library
                </Button>
              </Link>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-studio-950/80 border border-studio-800 text-xs space-y-2">
            <div>
              <span className="text-studio-500">Generated Title: </span>
              <strong className="text-white">{generationOutput.title}</strong>
            </div>
            <div>
              <span className="text-studio-500">SEO Keywords: </span>
              <span className="text-brand-300">
                {generationOutput.seo.keywords.join(", ")}
              </span>
            </div>
            <div>
              <span className="text-studio-500">Featured Visual Brief: </span>
              <span className="text-studio-300 italic">
                &ldquo;{generationOutput.featuredImage.brief}&rdquo;
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Main Generation Input Form */}
      {!isGenerating && (
        <form onSubmit={handleStartGeneration} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Specifications</CardTitle>
              <CardDescription>
                Define the primary topic, scope, and technical depth
              </CardDescription>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Article Topic / Working Title
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Designing Zero-Trust Architecture for Microservices in Kubernetes"
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-studio-300 mb-1.5">
                    Category / Vertical
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Cloud Infrastructure, DevOps, AI"
                    className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-studio-300 mb-1.5">
                    Target Word Count / Length
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDesiredLength("short")}
                      className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                        desiredLength === "short"
                          ? "bg-brand-600/20 border-brand-500 text-brand-300"
                          : "border-studio-800 text-studio-400 hover:bg-studio-800"
                      }`}
                    >
                      Short (~800w)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDesiredLength("medium")}
                      className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                        desiredLength === "medium"
                          ? "bg-brand-600/20 border-brand-500 text-brand-300"
                          : "border-studio-800 text-studio-400 hover:bg-studio-800"
                      }`}
                    >
                      Standard (~1.4k)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDesiredLength("long")}
                      className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                        desiredLength === "long"
                          ? "bg-brand-600/20 border-brand-500 text-brand-300"
                          : "border-studio-800 text-studio-400 hover:bg-studio-800"
                      }`}
                    >
                      Deep Dive (~2.2k)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audience & Tone (Workspace Brand Context)</CardTitle>
              <CardDescription>
                Auto-populated from active brand settings; adjust if needed for this specific post
              </CardDescription>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Target Reader Persona
                </label>
                <input
                  type="text"
                  required
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g., Enterprise Architects, CTOs, Senior Staff Engineers"
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Tone of Voice
                </label>
                <input
                  type="text"
                  required
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="e.g., Authoritative, technical, pragmatic"
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-studio-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-white block">
                  Grounding & Citation Research Agent
                </span>
                <span className="text-[11px] text-studio-400">
                  Retrieve and verify authoritative empirical sources and industry benchmarks
                </span>
              </div>
              <input
                type="checkbox"
                checked={researchPreference}
                onChange={(e) => setResearchPreference(e.target.checked)}
                className="h-4 w-4 rounded bg-studio-950 border-studio-800 text-brand-600 focus:ring-brand-500"
              />
            </div>
          </Card>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/create">
              <Button type="button" variant="ghost" size="md">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="gap-2 px-8"
              disabled={isGenerating || !topic.trim()}
            >
              <Sparkles className="h-4 w-4" />
              <span>Launch Autonomous Blog Generation</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
