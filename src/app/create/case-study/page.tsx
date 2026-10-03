"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowLeft,
  TrendingUp,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  // State
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
              B2B Case Study Generator
            </h1>
            <p className="text-xs text-studio-400">
              Transform technical transformations and ROI metrics into high-conversion proof points
            </p>
          </div>
        </div>

        <Badge variant="success">Case Study Engine</Badge>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-300 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Generated Result Banner */}
      {generationOutput && createdContentId && (
        <Card className="border-emerald-800/80 bg-emerald-950/30 p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-900/60 border border-emerald-700 flex items-center justify-center text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Case Study Successfully Generated & Saved
                </h3>
                <p className="text-xs text-emerald-300 mt-0.5">
                  Saved with full ROI metric tables, technical architecture breakdown, and Version 1 snapshot.
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
              <span className="text-studio-500">Title: </span>
              <strong className="text-white">{generationOutput.title}</strong>
            </div>
            <div>
              <span className="text-studio-500">Quantified Impact: </span>
              <span className="text-emerald-300 font-semibold">{resultsMetrics}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Generation Form */}
      <form onSubmit={handleStartGeneration} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client & Problem Context</CardTitle>
            <CardDescription>
              Specify the client industry and the core operational bottlenecks
            </CardDescription>
          </CardHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Client / Industry Vertical
                </label>
                <input
                  type="text"
                  required
                  value={clientIndustry}
                  onChange={(e) => setClientIndustry(e.target.value)}
                  placeholder="e.g., Global Fintech & Card Issuing Infrastructure"
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Target Reader Persona
                </label>
                <input
                  type="text"
                  required
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., CTOs, Enterprise Decision Makers"
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-studio-300 mb-1.5">
                Core Business & Technical Challenge
              </label>
              <textarea
                rows={3}
                required
                value={businessChallenge}
                onChange={(e) => setBusinessChallenge(e.target.value)}
                placeholder="e.g., Severe P99 latency spikes during flash transactions, causing 4.2% payment drop-offs and failing enterprise SLAs."
                className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-studio-300 mb-1.5">
                Legacy Architecture & Existing Process (Optional)
              </label>
              <input
                type="text"
                value={existingProcess}
                onChange={(e) => setExistingProcess(e.target.value)}
                placeholder="e.g., Tightly coupled monolithic MySQL database with synchronous HTTP calls between services."
                className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Solution & Quantifiable ROI Metrics</CardTitle>
            <CardDescription>
              Detail the architectural transformation, tech stack, and empirical results
            </CardDescription>
          </CardHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-studio-300 mb-1.5">
                Proposed Solution & Architecture
              </label>
              <textarea
                rows={3}
                required
                value={proposedSolution}
                onChange={(e) => setProposedSolution(e.target.value)}
                placeholder="e.g., Re-architecting state mutations into an event-driven stream with autonomous circuit breakers and idempotency ledgers."
                className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Technology Stack
                </label>
                <input
                  type="text"
                  required
                  value={technology}
                  onChange={(e) => setTechnology(e.target.value)}
                  placeholder="e.g., Rust, Kafka, Kubernetes, AWS, PostgreSQL"
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Quantified Results & Metrics
                </label>
                <input
                  type="text"
                  required
                  value={resultsMetrics}
                  onChange={(e) => setResultsMetrics(e.target.value)}
                  placeholder="e.g., -92.5% P99 latency, 26k RPS throughput, zero Severity-1 outages"
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
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
            className="gap-2 px-8 bg-emerald-600 hover:bg-emerald-500"
            disabled={isGenerating || !businessChallenge.trim() || !proposedSolution.trim()}
          >
            <Sparkles className="h-4 w-4" />
            <span>{isGenerating ? "Generating Case Study..." : "Generate B2B Case Study"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
