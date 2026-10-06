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
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CaseStudyOutput } from "@/validation/case-study-schema";
import {
  useBackgroundGeneration,
  PIPELINE_STAGES_CASE_STUDY,
} from "@/features/generation/background-generation-context";

export default function CaseStudyGeneratorPage() {
  const { activeWorkspace } = useAuth();
  const {
    isGenerating,
    generationType,
    activeBatchIndex,
    totalBatchCount,
    currentGeneratingTitle: currentGeneratingScenario,
    currentStepIndex,
    pipelineStages,
    errorMessage: bgErrorMessage,
    caseStudyResults: batchResults,
    startCaseStudyBatchGeneration,
    clearGenerationResults,
  } = useBackgroundGeneration();

  const isCurrentCaseStudyGenerating = isGenerating && generationType === "case-study";

  // Mode: "single" | "batch"
  const [generationMode, setGenerationMode] = useState<"single" | "batch">("single");

  // Single Form State
  const [clientIndustry, setClientIndustry] = useState("Fintech & Payment Infrastructure");
  const [businessChallenge, setBusinessChallenge] = useState("");
  const [existingProcess, setExistingProcess] = useState("");
  const [proposedSolution, setProposedSolution] = useState("");
  const [technology, setTechnology] = useState("Kubernetes, Kafka, Go, PostgreSQL");
  const [resultsMetrics, setResultsMetrics] = useState("Reduced P99 latency by 92.5%, increased throughput to 26,000 RPS");
  const [targetAudience, setTargetAudience] = useState("CTOs, VP of Engineering, Enterprise Architects");

  // Batch Form State
  const [batchCount, setBatchCount] = useState<number>(3);
  const [batchScenariosText, setBatchScenariosText] = useState(
    `Financial Services & Lending | Severe P99 latency spikes during flash transactions | Re-architected state mutations into an event-driven stream | Kafka, Go, Kubernetes | Reduced P99 latency by 92.5%\nHealthcare Telemetry & IoT | Real-time sensor synchronization failures | Edge-computed streaming event mesh | Rust, WebSockets, TimescaleDB | 99.999% uptime\nSupply Chain & Logistics | Non-deterministic route optimization | Multi-agent reasoning graph | Python, Ray, PostgreSQL | 34% fuel efficiency gain`
  );

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

  // Curated scenarios catalog for auto-generating up to 10 tailored enterprise case studies
  const CURATED_SCENARIOS = [
    "Financial Services & Lending | Severe P99 latency spikes during flash transactions | Re-architected state mutations into an event-driven stream | Kafka, Go, Kubernetes | Reduced P99 latency by 92.5%",
    "Healthcare Telemetry & IoT | Real-time sensor synchronization failures | Edge-computed streaming event mesh | Rust, WebSockets, TimescaleDB | 99.999% uptime",
    "Supply Chain & Logistics | Non-deterministic route optimization | Multi-agent reasoning graph | Python, Ray, PostgreSQL | 34% fuel efficiency gain",
    "Tier-1 Insurance Carrier | 18-day medical claims backlog with disputes | Autonomous multi-agent swarms for claims adjudication | Multi-Agent Swarms, Private RAG, HIPAA VPC | 10x faster processing, $1.4M saved",
    "Smart Manufacturing | 140+ hours annual unexpected downtime | Edge AI acoustic and vibration anomaly detectors | TensorRT, MQTT, Edge AI | 82% downtime reduction, $2.6M saved",
    "B2B SaaS Platform | Customer churn due to reactive account reviews | ML-driven predictive user churn and retention engine | Python, XGBoost, PostgreSQL, MLflow | 32% churn reduction, $1.2M ARR saved",
    "Industrial Quality Assurance | Micro-defects during high-speed PCB fabrication | High-resolution computer vision edge inference system | PyTorch, YOLOv10, Docker, CUDA | 99.8% defect detection accuracy",
    "Cross-Border Banking | 3-week compliance bottleneck on wire transfers | Real-time AML transaction monitoring and sanction screening AI | Go, Apache Flink, Milvus Vector DB | 94% false positive reduction",
    "Enterprise Cybersecurity | 40,000 daily SOC alerts causing analyst fatigue | Autonomous agentic tier-1 incident response & threat containment | Agent Swarms, LangGraph, Python | 88% automated containment, 3.4m MTTR",
    "Global Telecommunications | 22-minute average support wait times during outages | Omni-channel conversational AI with live network telemetry | WebSockets, Claude 3.5, Redis | 62% call deflection, 4.8/5 CSAT",
  ];

  const handleGenerateScenarios = (count: number) => {
    const targetCount = Math.max(1, Math.min(10, count));
    setBatchCount(targetCount);
    const selected = CURATED_SCENARIOS.slice(0, targetCount);
    setBatchScenariosText(selected.join("\n"));
  };

  // Parse batch scenarios list (capped at maximum 10)
  const parsedBatchItems =
    generationMode === "batch"
      ? batchScenariosText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 10)
          .map((line) => {
            const parts = line.split("|").map((p) => p.trim());
            return {
              industry: parts[0] || clientIndustry,
              challenge: parts[1] || businessChallenge || "High latency and non-deterministic operational failure modes.",
              solution: parts[2] || proposedSolution || "Autonomous event-driven microservices architecture with fault isolation.",
              tech: parts[3] || technology || "Kubernetes, Kafka, Go, PostgreSQL",
              metrics: parts[4] || resultsMetrics || "Reduced P99 latency by 92.5%, increased throughput to 26,000 RPS",
            };
          })
      : [
          {
            industry: clientIndustry,
            challenge: businessChallenge || "Legacy monolithic bottlenecks and slow transaction turnaround.",
            solution: proposedSolution || "Autonomous event-driven microservices with verifiable telemetry.",
            tech: technology,
            metrics: resultsMetrics,
          },
        ];

  const handleStartGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || parsedBatchItems.length === 0) return;

    setErrorMessage("");
    await startCaseStudyBatchGeneration({
      workspaceId: activeWorkspace.id,
      items: parsedBatchItems,
      clientIndustry,
      targetAudience,
      autoGenerateImage: false,
    });
  };

  const handleLoadSampleBatch = () => {
    setBatchScenariosText(
      `Financial Services & Lending | Severe P99 latency spikes during flash transactions | Re-architected state mutations into an event-driven stream with autonomous circuit breakers | Kafka, Go, Kubernetes | Reduced P99 latency by 92.5%, increased throughput to 26,000 RPS\nHealthcare Telemetry & Medical Devices | Real-time sensor synchronization failures and delayed alerting | Edge-computed streaming event mesh with guaranteed delivery | Rust, WebSockets, TimescaleDB | 99.999% uptime and zero missed alerts across 1.2M devices\nAutonomous Supply Chain & Logistics | Non-deterministic route optimization under peak global shipping | Multi-agent reasoning graph with continuous telemetry feedback | Python, Ray, PostgreSQL | 34% fuel efficiency gain, 4.2x routing dispatch velocity`
    );
  };

  const activeErrorMessage = errorMessage || bgErrorMessage;
  const stages = pipelineStages && pipelineStages.length > 0 ? pipelineStages : PIPELINE_STAGES_CASE_STUDY;

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
              Create Case Studies
            </h1>
            <p className="text-xs text-slate-500">
              Formulate structured problem-solution-results proof points individually or in batches
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        {!isCurrentCaseStudyGenerating && (
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
              <span>Single Case Study</span>
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

      {activeErrorMessage && (
        <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{activeErrorMessage}</span>
        </div>
      )}

      {/* Progress State */}
      {isCurrentCaseStudyGenerating && (
        <Card className="p-6 border border-orange-200 bg-orange-50/40 space-y-4">
          <div className="max-w-md mx-auto text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-orange-700 font-semibold text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
              <span>
                {totalBatchCount > 1
                  ? `Synthesizing Case Study ${activeBatchIndex} of ${totalBatchCount}`
                  : "Generating Case Study Architecture"}
              </span>
            </div>

            <div className="text-xs font-bold text-slate-900 truncate px-4">
              &ldquo;{currentGeneratingScenario}&rdquo;
            </div>

            <p className="text-xs text-slate-600 font-medium">
              {stages[currentStepIndex]}
            </p>

            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
              <div
                className="bg-orange-500 h-full transition-all duration-500 rounded-full"
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
                {batchResults.length} of {totalBatchCount} case studies completed
              </span>
              <span className="text-orange-700 font-medium">
                Runs continuously in background if you leave page
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Generated Result Output Banner */}
      {!isCurrentCaseStudyGenerating && batchResults.length > 0 && (
        <Card className="border border-emerald-200 bg-emerald-50/40 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/60 pb-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {batchResults.length === 1
                    ? "Case Study Generated & Saved"
                    : `Batch Completed: ${batchResults.length} Case Studies Generated`}
                </h3>
                <p className="text-xs text-slate-500">
                  Formulated with quantifiable ROI benchmarks, architecture diagrams, and website schema.
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
              return (
                <div
                  key={item.contentId}
                  className="p-4 rounded-lg bg-white border border-slate-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-all shadow-sm"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-orange-100/80 border border-orange-200/80 flex items-center justify-center shrink-0 text-orange-600">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-slate-400 font-semibold">
                          0{idx + 1}
                        </span>
                        <span className="font-semibold text-slate-900 truncate">
                          {item.result.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-200 bg-slate-50 text-slate-700">
                          {item.result.clientIndustry || "Enterprise"}
                        </Badge>
                      </div>
                      <p className="text-slate-500 text-[11px] line-clamp-1">
                        {item.result.description || item.result.overview || item.result.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Link href={`/case-studies/${item.contentId}/edit`}>
                      <Button variant="primary" size="sm" className="gap-1.5 text-xs h-8">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Open in CMS</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Main Form */}
      {!isCurrentCaseStudyGenerating && (
        <form onSubmit={handleStartGeneration} className="space-y-5">
          {generationMode === "single" ? (
            <>
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
                      placeholder="e.g., Fintech & Payment Infrastructure"
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
                      placeholder="e.g., CTOs, VP of Engineering, Enterprise Architects"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Core Business & Technical Challenge
                  </label>
                  <Textarea
                    rows={3}
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
                      value={technology}
                      onChange={(e) => setTechnology(e.target.value)}
                      placeholder="e.g., Kubernetes, Kafka, Go, PostgreSQL"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Quantified Results & Impact
                    </label>
                    <Input
                      value={resultsMetrics}
                      onChange={(e) => setResultsMetrics(e.target.value)}
                      placeholder="e.g., Reduced P99 latency by 92.5%, increased throughput to 26,000 RPS"
                    />
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Batch Case Studies (Bulk Queue)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose how many customer stories to generate in one batch (up to 10), or customize lines below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateScenarios(batchCount || 5)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-md border border-orange-200 transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Auto-Generate {batchCount || 5} Scenarios</span>
                </button>
              </div>

              {/* Batch Size Selection */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-orange-600" />
                    <span>Bulk Batch Size (Up to 10 Case Studies)</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {parsedBatchItems.length} of 10 slots used
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium mr-1">Quick Select:</span>
                  {[2, 3, 5, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleGenerateScenarios(num)}
                      className={`h-7 px-3 text-xs font-semibold rounded-md border transition-all ${
                        batchCount === num && parsedBatchItems.length === num
                          ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-300 hover:border-orange-400 hover:text-orange-600"
                      }`}
                    >
                      {num} Case Studies {num === 10 ? "(Max)" : ""}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Scenarios Queue (Format: <span className="font-mono text-slate-500 font-normal">Industry | Challenge | Solution | Tech Stack | Results</span> &bull; Max 10)
                  </label>
                  <span className={`text-[11px] font-semibold ${parsedBatchItems.length >= 10 ? "text-amber-700 font-mono" : "text-slate-500"}`}>
                    {parsedBatchItems.length} / 10 Scenarios Queued
                  </span>
                </div>
                <Textarea
                  required
                  rows={6}
                  value={batchScenariosText}
                  onChange={(e) => {
                    setBatchScenariosText(e.target.value);
                    const lines = e.target.value.split("\n").filter((l) => l.trim().length > 0);
                    setBatchCount(Math.min(10, lines.length || 1));
                  }}
                  placeholder={`Financial Services & Lending | Severe P99 latency spikes during flash transactions | Re-architected state mutations into an event-driven stream | Kafka, Go, Kubernetes | Reduced P99 latency by 92.5%\nHealthcare Telemetry & IoT | Real-time sensor synchronization failures | Edge-computed streaming event mesh | Rust, WebSockets, TimescaleDB | 99.999% uptime\nSupply Chain & Logistics | Non-deterministic route optimization | Multi-agent reasoning graph | Python, Ray, PostgreSQL | 34% fuel efficiency gain`}
                  className="font-mono text-xs leading-relaxed bg-white"
                />
                {batchScenariosText.split("\n").filter((l) => l.trim().length > 0).length > 10 && (
                  <p className="text-[11px] text-amber-700 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Only the first 10 scenarios will be processed in this batch run.</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Target Reader Persona
                  </label>
                  <Input
                    required
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., CTOs, VP of Engineering, Enterprise Architects"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Default Fallback Tech Stack
                  </label>
                  <Input
                    value={technology}
                    onChange={(e) => setTechnology(e.target.value)}
                    placeholder="e.g., Kubernetes, Kafka, Go, PostgreSQL"
                  />
                </div>
              </div>
            </Card>
          )}

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
              disabled={isGenerating || parsedBatchItems.length === 0}
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {generationMode === "batch"
                  ? `Generate ${parsedBatchItems.length} Case Stud${parsedBatchItems.length !== 1 ? "ies" : "y"}`
                  : "Generate Case Study"}
              </span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
