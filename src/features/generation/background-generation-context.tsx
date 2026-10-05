"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { BlogGenerationOutput } from "@/validation/blog-schema";
import { CaseStudyOutput } from "@/validation/case-study-schema";

export const PIPELINE_STAGES_BLOG = [
  "Initializing Generation Run & Brand Profile",
  "Research: Retrieving Grounded Citations & Benchmarks",
  "Strategy: Formulating Structure Outline & Key Points",
  "Writing: Drafting Full-Length Technical Article",
  "SEO: Optimizing Keywords & Meta Descriptions",
  "QA: Verifying Brand Rules & Formatting",
];

export const PIPELINE_STAGES_CASE_STUDY = [
  "Analyzing Enterprise Scenario & Client Context",
  "Structuring Problem, Intervention & Architecture",
  "Quantifying Business Impact & Latency Metrics",
  "Synthesizing Technical Executive Summary",
  "Designing Visual Architecture Blueprint",
  "Finalizing Schema & Publishing Artifacts",
];

export interface GeneratedBlogResult {
  contentId: string;
  result: BlogGenerationOutput;
  topic: string;
}

export interface GeneratedCaseStudyResult {
  contentId: string;
  result: CaseStudyOutput;
  title: string;
}

export interface BlogBatchParams {
  workspaceId: string;
  topics: string[];
  audience?: string;
  tone?: string;
  desiredLength?: "short" | "medium" | "long";
  category?: string;
  researchPreference?: boolean;
  autoGenerateImage?: boolean;
  customImagePrompt?: string;
  imageStyle?: "dark_tech" | "isometric_3d" | "minimalist_vector" | "architectural_blueprint" | "editorial_photo";
}

export interface CaseStudyItemParam {
  industry: string;
  challenge: string;
  solution: string;
  tech: string;
  metrics: string;
}

export interface CaseStudyBatchParams {
  workspaceId: string;
  items: CaseStudyItemParam[];
  clientIndustry?: string;
  targetAudience?: string;
  autoGenerateImage?: boolean;
  customImagePrompt?: string;
  imageStyle?: "dark_tech" | "isometric_3d" | "minimalist_vector" | "architectural_blueprint" | "editorial_photo";
}

interface BackgroundGenerationContextValue {
  isGenerating: boolean;
  generationType: "blog" | "case-study" | null;
  activeBatchIndex: number;
  totalBatchCount: number;
  currentGeneratingTitle: string;
  currentStepIndex: number;
  pipelineStages: string[];
  errorMessage: string;
  isCompleted: boolean;
  isWidgetMinimized: boolean;
  hasUnreadCompletion: boolean;
  blogResults: GeneratedBlogResult[];
  caseStudyResults: GeneratedCaseStudyResult[];

  startBlogBatchGeneration: (params: BlogBatchParams) => Promise<void>;
  startCaseStudyBatchGeneration: (params: CaseStudyBatchParams) => Promise<void>;
  cancelGeneration: () => void;
  clearGenerationResults: () => void;
  toggleWidgetMinimized: () => void;
  dismissCompletionNotification: () => void;
}

const BackgroundGenerationContext = createContext<BackgroundGenerationContextValue | undefined>(undefined);

export function BackgroundGenerationProvider({ children }: { children: React.ReactNode }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<"blog" | "case-study" | null>(null);
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  const [totalBatchCount, setTotalBatchCount] = useState(0);
  const [currentGeneratingTitle, setCurrentGeneratingTitle] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isWidgetMinimized, setIsWidgetMinimized] = useState(false);
  const [hasUnreadCompletion, setHasUnreadCompletion] = useState(false);

  const [blogResults, setBlogResults] = useState<GeneratedBlogResult[]>([]);
  const [caseStudyResults, setCaseStudyResults] = useState<GeneratedCaseStudyResult[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const stageIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const pipelineStages = generationType === "case-study" ? PIPELINE_STAGES_CASE_STUDY : PIPELINE_STAGES_BLOG;

  const startStageTicker = useCallback((stagesCount: number) => {
    if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
    setCurrentStepIndex(0);
    stageIntervalRef.current = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < stagesCount - 1) return prev + 1;
        return 0;
      });
    }, 1400);
  }, []);

  const stopStageTicker = useCallback(() => {
    if (stageIntervalRef.current) {
      clearInterval(stageIntervalRef.current);
      stageIntervalRef.current = null;
    }
  }, []);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopStageTicker();
    setIsGenerating(false);
  }, [stopStageTicker]);

  const clearGenerationResults = useCallback(() => {
    setBlogResults([]);
    setCaseStudyResults([]);
    setIsCompleted(false);
    setHasUnreadCompletion(false);
    setErrorMessage("");
    setActiveBatchIndex(0);
    setTotalBatchCount(0);
    setCurrentGeneratingTitle("");
    setGenerationType(null);
  }, []);

  const toggleWidgetMinimized = useCallback(() => {
    setIsWidgetMinimized((prev) => !prev);
  }, []);

  const dismissCompletionNotification = useCallback(() => {
    setHasUnreadCompletion(false);
  }, []);

  // 1. Blog Batch Generation Background Worker
  const startBlogBatchGeneration = useCallback(
    async (params: BlogBatchParams) => {
      const { topics, workspaceId } = params;
      if (!workspaceId || !topics || topics.length === 0) return;

      abortControllerRef.current = new AbortController();
      setIsGenerating(true);
      setGenerationType("blog");
      setErrorMessage("");
      setIsCompleted(false);
      setHasUnreadCompletion(false);
      setBlogResults([]);
      setTotalBatchCount(topics.length);
      setActiveBatchIndex(1);
      setCurrentGeneratingTitle(topics[0]);
      setIsWidgetMinimized(false);

      startStageTicker(PIPELINE_STAGES_BLOG.length);

      const completed: GeneratedBlogResult[] = [];

      try {
        for (let i = 0; i < topics.length; i++) {
          if (abortControllerRef.current?.signal.aborted) break;

          const currentTopic = topics[i];
          setActiveBatchIndex(i + 1);
          setCurrentGeneratingTitle(currentTopic);
          setCurrentStepIndex(0);

          try {
            const res = await fetch("/api/generation/blog", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: abortControllerRef.current?.signal,
              body: JSON.stringify({
                workspaceId,
                topic: currentTopic,
                audience: params.audience || "CTOs, Engineering Leaders, Tech Founders",
                tone: params.tone || "Authoritative, insightful, modern, highly articulate",
                desiredLength: params.desiredLength || "medium",
                category: params.category || "Enterprise AI & Cloud Engineering",
                researchPreference: params.researchPreference ?? true,
                autoGenerateImage: params.autoGenerateImage ?? true,
                customImagePrompt: params.customImagePrompt?.trim() || undefined,
                imageStyle: params.imageStyle || "dark_tech",
              }),
            });

            if (res.ok) {
              const data = await res.json();
              completed.push({
                contentId: data.contentId,
                result: data.result,
                topic: currentTopic,
              });
              setBlogResults([...completed]);
            } else {
              const errData = await res.json();
              console.error(`Error generating blog "${currentTopic}":`, errData);
            }
          } catch (err: unknown) {
            if ((err as Error)?.name === "AbortError") {
              break;
            }
            console.error(`Failed to generate topic "${currentTopic}":`, err);
          }
        }

        if (completed.length === 0) {
          setErrorMessage("Generation failed for all requested topics. Please check your network or API keys.");
        } else {
          setIsCompleted(true);
          setHasUnreadCompletion(true);
        }
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          setErrorMessage("Network error during background generation execution.");
        }
      } finally {
        stopStageTicker();
        setIsGenerating(false);
      }
    },
    [startStageTicker, stopStageTicker]
  );

  // 2. Case Study Batch Generation Background Worker
  const startCaseStudyBatchGeneration = useCallback(
    async (params: CaseStudyBatchParams) => {
      const { items, workspaceId } = params;
      if (!workspaceId || !items || items.length === 0) return;

      abortControllerRef.current = new AbortController();
      setIsGenerating(true);
      setGenerationType("case-study");
      setErrorMessage("");
      setIsCompleted(false);
      setHasUnreadCompletion(false);
      setCaseStudyResults([]);
      setTotalBatchCount(items.length);
      setActiveBatchIndex(1);
      setCurrentGeneratingTitle(items[0].industry);
      setIsWidgetMinimized(false);

      startStageTicker(PIPELINE_STAGES_CASE_STUDY.length);

      const completed: GeneratedCaseStudyResult[] = [];

      try {
        for (let i = 0; i < items.length; i++) {
          if (abortControllerRef.current?.signal.aborted) break;

          const item = items[i];
          setActiveBatchIndex(i + 1);
          setCurrentGeneratingTitle(item.industry);
          setCurrentStepIndex(0);

          try {
            const res = await fetch("/api/generation/case-study", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: abortControllerRef.current?.signal,
              body: JSON.stringify({
                workspaceId,
                clientIndustry: item.industry,
                businessChallenge: item.challenge,
                proposedSolution: item.solution,
                technology: item.tech,
                resultsMetrics: item.metrics,
                targetAudience: params.targetAudience || "CTOs, VP of Engineering, Enterprise Architects",
                autoGenerateImage: params.autoGenerateImage ?? true,
                customImagePrompt: params.customImagePrompt?.trim() || undefined,
                imageStyle: params.imageStyle || "isometric_3d",
              }),
            });

            if (res.ok) {
              const data = await res.json();
              completed.push({
                contentId: data.contentId,
                result: data.result,
                title: data.result.title || item.industry,
              });
              setCaseStudyResults([...completed]);
            } else {
              const errData = await res.json();
              console.error(`Error generating case study "${item.industry}":`, errData);
            }
          } catch (err: unknown) {
            if ((err as Error)?.name === "AbortError") {
              break;
            }
            console.error(`Failed to generate case study "${item.industry}":`, err);
          }
        }

        if (completed.length === 0) {
          setErrorMessage("Generation failed for all requested case studies. Please check your network or API keys.");
        } else {
          setIsCompleted(true);
          setHasUnreadCompletion(true);
        }
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          setErrorMessage("Network error during background case study generation.");
        }
      } finally {
        stopStageTicker();
        setIsGenerating(false);
      }
    },
    [startStageTicker, stopStageTicker]
  );

  useEffect(() => {
    return () => {
      stopStageTicker();
    };
  }, [stopStageTicker]);

  return (
    <BackgroundGenerationContext.Provider
      value={{
        isGenerating,
        generationType,
        activeBatchIndex,
        totalBatchCount,
        currentGeneratingTitle,
        currentStepIndex,
        pipelineStages,
        errorMessage,
        isCompleted,
        isWidgetMinimized,
        hasUnreadCompletion,
        blogResults,
        caseStudyResults,
        startBlogBatchGeneration,
        startCaseStudyBatchGeneration,
        cancelGeneration,
        clearGenerationResults,
        toggleWidgetMinimized,
        dismissCompletionNotification,
      }}
    >
      {children}
    </BackgroundGenerationContext.Provider>
  );
}

export function useBackgroundGeneration() {
  const context = useContext(BackgroundGenerationContext);
  if (!context) {
    throw new Error("useBackgroundGeneration must be used within a BackgroundGenerationProvider");
  }
  return context;
}
