"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BlogGenerationOutput } from "@/validation/blog-schema";

const PIPELINE_STAGES = [
  "Initializing Generation Run & Brand Profile",
  "Research: Retrieving Grounded Citations & Benchmarks",
  "Strategy: Formulating Structure Outline & Key Points",
  "Writing: Drafting Full-Length Technical Article",
  "SEO: Optimizing Keywords & Meta Descriptions",
  "QA: Verifying Brand Rules & Formatting",
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
              Create Blog Post
            </h1>
            <p className="text-xs text-slate-500">
              Configure parameters for research-grounded technical articles
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Progress State */}
      {isGenerating && (
        <Card className="p-6 border border-orange-200 bg-orange-50/40">
          <div className="max-w-md mx-auto text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-orange-700 font-semibold text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
              <span>Generating Content</span>
            </div>
            <p className="text-xs text-slate-600">
              {PIPELINE_STAGES[currentStepIndex]}
            </p>

            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-orange-500 h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${((currentStepIndex + 1) / PIPELINE_STAGES.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Generation Complete Output Banner */}
      {generationOutput && createdContentId && (
        <Card className="border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Article Generated & Saved as Draft
                </h3>
                <p className="text-xs text-slate-500">
                  Version 1 snapshot created with SEO metadata and citations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/content/${createdContentId}`}>
                <Button variant="primary" size="sm" className="gap-1.5 text-xs h-8">
                  <Eye className="h-3.5 w-3.5" />
                  <span>Open in Editor</span>
                </Button>
              </Link>
              <Link href="/content">
                <Button variant="outline" size="sm" className="text-xs h-8">
                  Content Library
                </Button>
              </Link>
            </div>
          </div>

          <div className="p-3 rounded-md bg-white border border-slate-200 text-xs space-y-1">
            <div className="font-semibold text-slate-900">{generationOutput.title}</div>
            <div className="text-slate-500 text-[11px]">
              Keywords: {generationOutput.seo.keywords.join(", ")}
            </div>
          </div>
        </Card>
      )}

      {/* Main Generation Form */}
      {!isGenerating && (
        <form onSubmit={handleStartGeneration} className="space-y-5">
          <Card className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Article Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Specify the primary topic and target category
              </p>
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category
                </label>
                <Input
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Cloud Infrastructure, DevOps"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Length
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

          <Card className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Audience & Tone</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target audience persona and editorial voice
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
                  placeholder="e.g., Enterprise Architects, CTOs"
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
                  placeholder="e.g., Authoritative, technical, pragmatic"
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
                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
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
              disabled={isGenerating || !topic.trim()}
            >
              <span>Generate Blog Post</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
