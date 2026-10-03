"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  CheckCircle,
  ArrowRight,
  Copy,
} from "lucide-react";

interface PromptTemplate {
  id: string;
  name: string;
  category: "blog" | "case-study" | "technical" | "executive";
  targetEngine: "Claude 3.5 Sonnet" | "GPT-4o" | "DeepSeek R1 Heuristic";
  description: string;
  tone: string;
  structureSteps: string[];
  systemInstruction: string;
  createLink: string;
}

const TEMPLATES: PromptTemplate[] = [
  {
    id: "tpl_arch_deep_dive",
    name: "Architectural Deep Dive",
    category: "technical",
    targetEngine: "Claude 3.5 Sonnet",
    description: "Multi-layered technical breakdown of scalable cloud topologies, distributed state machines, and microservice resilience.",
    tone: "Authoritative, empirical, engineering-led",
    structureSteps: ["Problem Landscape", "System Topology", "Code Implementation", "Empirical Benchmarks", "Trade-off Matrix"],
    systemInstruction: "You are a Principal Cloud Infrastructure Architect. Formulate precise technical architecture analyses with code samples and trade-offs.",
    createLink: "/create/blog",
  },
  {
    id: "tpl_customer_transformation",
    name: "Enterprise Transformation Case Study",
    category: "case-study",
    targetEngine: "GPT-4o",
    description: "Challenge-Solution-Impact framework engineered for executive decision makers with quantitative KPI matrices.",
    tone: "Executive, metrics-driven, strategic",
    structureSteps: ["Customer Profile", "Core Bottlenecks", "Engineered Architecture", "Measurable Business Impact", "Future Horizon"],
    systemInstruction: "You are a Chief Technology Strategy Officer. Write crisp, metric-dense case studies focusing on ROI, latency reductions, and team leverage.",
    createLink: "/create/case-study",
  },
  {
    id: "tpl_seo_cluster_pillar",
    name: "Topic Cluster Pillar Page",
    category: "blog",
    targetEngine: "Claude 3.5 Sonnet",
    description: "3,000+ word comprehensive domain authority cornerstone article designed for high-ranking SERP positions.",
    tone: "Educational, exhaustive, clear hierarchy",
    structureSteps: ["Core Definition", "Foundational Pillars", "Implementation Walkthrough", "Common Anti-patterns", "FAQ & SERP Answers"],
    systemInstruction: "You are a Senior Technical SEO Strategist. Create structured pillar content with rich semantic subheadings, schema markup cues, and natural keyword density.",
    createLink: "/create/blog",
  },
  {
    id: "tpl_incident_postmortem",
    name: "Resilient Incident Post-Mortem",
    category: "technical",
    targetEngine: "Claude 3.5 Sonnet",
    description: "Blameless engineering post-mortem format detailing timeline, root cause analysis, and preventative guardrails.",
    tone: "Objective, blameless, systematic",
    structureSteps: ["Executive Summary", "Incident Timeline", "Root Cause Analysis (5 Whys)", "Resolution Mechanics", "Action Items & Circuit Breakers"],
    systemInstruction: "You are a Principal Site Reliability Engineer. Document complex system anomalies with clear root cause analyses and remediation items.",
    createLink: "/create/blog",
  },
  {
    id: "tpl_executive_brief",
    name: "Executive Technology Brief",
    category: "executive",
    targetEngine: "GPT-4o",
    description: "High-density synthesis of emerging AI/Cloud developments for CTOs, VPs of Product, and board members.",
    tone: "Concise, strategic, high-level",
    structureSteps: ["Bottom Line Up Front (BLUF)", "Market Signals", "Technical Feasibility", "Strategic Recommendations"],
    systemInstruction: "You are a Technology Advisor to Fortune 500 boards. Summarize deep-tech advancements into actionable commercial insights.",
    createLink: "/create/blog",
  },
];

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = selectedCategory === "all"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Content Templates
            </h1>
            <Badge variant="outline" className="text-[11px] font-normal text-slate-600 bg-slate-100">
              Blueprints
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Curated frameworks and structural blueprints for high-quality technical and executive content.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          {["all", "technical", "case-study", "blog", "executive"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                selectedCategory === cat
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {cat === "all" ? "All Templates" : cat.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((tpl) => (
          <Card key={tpl.id} className="bg-white border-slate-200 flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all duration-200">
            <div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono text-slate-600 bg-slate-50 border-slate-200">
                    {tpl.category}
                  </Badge>
                  <span className="text-[11px] text-orange-600 font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {tpl.targetEngine}
                  </span>
                </div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  {tpl.name}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                  {tpl.description}
                </CardDescription>
              </CardHeader>

              <div className="px-6 space-y-3">
                <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Tone & Voice
                  </span>
                  <p className="text-xs text-slate-700 font-medium">{tpl.tone}</p>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Structural Flow
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tpl.structureSteps.map((step, idx) => (
                      <span
                        key={step}
                        className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-normal"
                      >
                        {idx + 1}. {step}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pt-4 border-t border-slate-100 mt-5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleCopy(tpl.id, tpl.systemInstruction)}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors"
                title="Copy System Prompt"
              >
                {copiedId === tpl.id ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>

              <Link href={tpl.createLink}>
                <Button size="sm" className="gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white font-medium">
                  <span>Use Template</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
