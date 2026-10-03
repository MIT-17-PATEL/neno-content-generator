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
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CaseStudyOutput } from "@/validation/case-study-schema";

export default function CaseStudyGeneratorPage() {
  const router = useRouter();
  const { activeWorkspace } = useAuth();

  const [clientIndustry, setClientIndustry] = useState("Fintech & Payment Infrastructure");
  const [businessChallenge, setBusinessChallenge] = useState("");
  const [existingProcess, setExistingProcess] = useState("");
  const [proposedSolution, setProposedSolution] = useState("");
  const [technology, setTechnology] = useState("Kubernetes, Kafka, Go, PostgreSQL");
  const [resultsMetrics, setResultsMetrics] = useState("Reduced P99 latency by 92.5%, increased throughput to 26,000 RPS");
  const [targetAudience, setTargetAudience] = useState("CTOs, VP of Engineering, Enterprise Architects");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationOutput, setGenerationOutput] = useState<CaseStudyOutput | null>(null);
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
          if (brand.audience && targetAudience === "CTOs, VP of Engineering, Enterprise Architects") {
            setTargetAudience(brand.audience);
          }
          if (brand.industry && clientIndustry === "Fintech & Payment Infrastructure") {
            setClientIndustry(brand.industry);
          }
        }
      }
    } catch (err) {
      console.error("Brand defaults load error:", err);
    }
  }, [activeWorkspace, targetAudience, clientIndustry]);

  useEffect(() => {
    loadBrandDefaults();
  }, [loadBrandDefaults]);

  const handleStartGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;

    setIsGenerating(true);
    setErrorMessage("");
    setGenerationOutput(null);

    try {
      const res = await fetch("/api/generation/case-study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          clientIndustry,
          businessChallenge,
          existingProcess,
          proposedSolution,
          technology,
          resultsMetrics,
          targetAudience,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGenerationOutput(data.result);
        setCreatedContentId(data.contentId);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Case study generation failed");
      }
    } catch {
      setErrorMessage("Network error during case study execution");
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
              Create Case Study
            </h1>
            <p className="text-xs text-slate-500">
              Formulate structured problem-solution-results proof points
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

      {/* Generated Result Banner */}
      {generationOutput && createdContentId && (
        <Card className="border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Case Study Generated & Saved
                </h3>
                <p className="text-xs text-slate-500">
                  Saved with ROI metric tables and Version 1 snapshot.
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
            <div className="text-emerald-700 font-medium text-[11px]">
              Impact: {resultsMetrics}
            </div>
          </div>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleStartGeneration} className="space-y-5">
        <Card className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Client & Problem Context</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Client industry, target persona, and business challenge
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Client / Industry
              </label>
              <Input
                required
                value={clientIndustry}
                onChange={(e) => setClientIndustry(e.target.value)}
                placeholder="e.g., Global Fintech & Card Issuing Infrastructure"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Reader Persona
              </label>
              <Input
                required
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., CTOs, VP of Engineering"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Core Business & Technical Challenge
            </label>
            <Textarea
              rows={3}
              required
              value={businessChallenge}
              onChange={(e) => setBusinessChallenge(e.target.value)}
              placeholder="e.g., Severe P99 latency spikes during flash transactions, causing payment drop-offs."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Legacy Process (Optional)
            </label>
            <Input
              value={existingProcess}
              onChange={(e) => setExistingProcess(e.target.value)}
              placeholder="e.g., Tightly coupled monolithic database with synchronous HTTP calls."
            />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Solution & ROI Metrics</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Architectural transformation and quantified benchmark impact
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Proposed Solution & Architecture
            </label>
            <Textarea
              rows={3}
              required
              value={proposedSolution}
              onChange={(e) => setProposedSolution(e.target.value)}
              placeholder="e.g., Re-architected state mutations into an event-driven stream with autonomous circuit breakers."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Technology Stack
              </label>
              <Input
                required
                value={technology}
                onChange={(e) => setTechnology(e.target.value)}
                placeholder="e.g., Rust, Kafka, Kubernetes, PostgreSQL"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quantified Results & Impact
              </label>
              <Input
                required
                value={resultsMetrics}
                onChange={(e) => setResultsMetrics(e.target.value)}
                placeholder="e.g., -92.5% P99 latency, 26k RPS throughput"
              />
            </div>
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
            disabled={isGenerating || !businessChallenge.trim() || !proposedSolution.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <span>Generate Case Study</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
