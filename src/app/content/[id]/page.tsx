/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Clock,
  History,
  FileText,
  Search,
  Sparkles,
  Share2,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  RefreshCw,
  Wand2,
  Check,
  Edit3,
  Bot,
  Gauge,
  CheckCheck,
  Wrench,
  HelpCircle,
  Image as ImageIcon,
  Download,
  Code,
  FileCheck,
  FileCode,
  X,
  Copy,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ContentItem,
  ContentStatus,
  ContentVersion,
  MediaAsset,
  ExportFormat,
  ExportRecord,
  ExportFormattedResult,
} from "@/types";
import { SeoAnalysisResult } from "@/lib/analysis/seo-analyzer";
import { QaAnalysisResult } from "@/lib/analysis/qa-analyzer";

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;
  const { activeWorkspace } = useAuth();

  const [item, setItem] = useState<ContentItem | null>(null);
  const [currentVersion, setCurrentVersion] = useState<ContentVersion | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [sources, setSources] = useState<Array<{ id: string; url: string; title: string; publisher?: string; notes?: string }>>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);

  const [editorContent, setEditorContent] = useState("");
  const [activeTab, setActiveTab] = useState<"editor" | "seo" | "qa" | "history" | "research" | "agents">("editor");

  // Autosave & Edit State
  const [isDirty, setIsDirty] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [hasUserEdits, setHasUserEdits] = useState(false);

  // Analysis State
  const [seoAnalysis, setSeoAnalysis] = useState<SeoAnalysisResult | null>(null);
  const [qaAnalysis, setQaAnalysis] = useState<QaAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Section AI Revision State
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const [reviseSectionTitle, setReviseSectionTitle] = useState("");
  const [reviseSelectedText, setReviseSelectedText] = useState("");
  const [reviseInstruction, setReviseInstruction] = useState("");
  const [isRevising, setIsRevising] = useState(false);
  const [reviseError, setReviseError] = useState("");

  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("markdown");
  const [exportIncludeFrontmatter, setExportIncludeFrontmatter] = useState(true);
  const [exportStandaloneHtml, setExportStandaloneHtml] = useState(true);
  const [exportMarkStatus, setExportMarkStatus] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportFormattedResult | null>(null);
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);
  const [isCopiedExport, setIsCopiedExport] = useState(false);

  // History Diff Comparison State
  const [selectedDiffVersion, setSelectedDiffVersion] = useState<ContentVersion | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  const fetchContentDetails = useCallback(async () => {
    if (!activeWorkspace || !contentId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/content/${contentId}?workspaceId=${activeWorkspace.id}`);
      if (res.ok) {
        const data = await res.json();
        setItem(data.item);
        setCurrentVersion(data.currentVersion);
        setVersions(data.versions || []);
        setSources(data.sources || []);
        if (data.currentVersion) {
          setEditorContent(data.currentVersion.content);
          setSelectedDiffVersion(data.versions?.[1] || null);
          setLastSavedTime(new Date(data.currentVersion.createdAt || Date.now()).toLocaleTimeString());
        }

        // Also fetch media assets for this content item
        try {
          const mediaRes = await fetch(`/api/media?workspaceId=${activeWorkspace.id}&contentId=${contentId}`);
          if (mediaRes.ok) {
            const mediaData = await mediaRes.json();
            setMediaAssets(mediaData.assets || []);
          }
        } catch {
          // Non-blocking
        }
      }
    } catch (err) {
      console.error("Fetch detail failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace, contentId]);

  useEffect(() => {
    fetchContentDetails();
  }, [fetchContentDetails]);

  // Run Real-time SEO and QA Analysis
  const runAnalysis = useCallback(async () => {
    if (!activeWorkspace || !editorContent.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/content/${contentId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          content: editorContent,
          seoTitle: currentVersion?.seoMetadata?.seoTitle || item?.title,
          metaDescription: currentVersion?.seoMetadata?.metaDescription || item?.excerpt,
          slug: item?.slug,
          keywords: currentVersion?.seoMetadata?.keywords || [],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSeoAnalysis(data.seo);
        setQaAnalysis(data.qa);
      }
    } catch (err) {
      console.error("Analysis execution error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [activeWorkspace, editorContent, contentId, currentVersion, item]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  // Debounced Autosave Effect
  useEffect(() => {
    if (!isDirty || !activeWorkspace || !editorContent.trim()) return;

    const timer = setTimeout(async () => {
      setIsAutosaving(true);
      try {
        const res = await fetch(`/api/content/${contentId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: activeWorkspace.id,
            content: editorContent,
            seoMetadata: currentVersion?.seoMetadata || {},
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentVersion(data.version);
          setVersions((prev) => [data.version, ...prev]);
          setIsDirty(false);
          setHasUserEdits(true);
          setLastSavedTime(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error("Autosave error:", err);
      } finally {
        setIsAutosaving(false);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [editorContent, isDirty, activeWorkspace, contentId, currentVersion]);

  const handleEditorChange = (val: string) => {
    setEditorContent(val);
    setIsDirty(true);
    setHasUserEdits(true);
  };

  const handleStatusChange = async (newStatus: ContentStatus) => {
    if (!activeWorkspace || !item) return;
    try {
      const res = await fetch(`/api/content/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          status: newStatus,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setItem(data.item);
        setStatusMessage(`Workflow state updated to ${newStatus.toUpperCase()}`);
        setTimeout(() => setStatusMessage(""), 3000);
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const handleManualSave = async () => {
    if (!activeWorkspace || !item || !editorContent.trim()) return;
    setIsAutosaving(true);

    try {
      const res = await fetch(`/api/content/${contentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          content: editorContent,
          seoMetadata: currentVersion?.seoMetadata || {},
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentVersion(data.version);
        setVersions([data.version, ...versions]);
        setIsDirty(false);
        setLastSavedTime(new Date().toLocaleTimeString());
        setStatusMessage(`Version ${data.version.versionNumber} saved successfully`);
        setTimeout(() => setStatusMessage(""), 3000);
      }
    } catch (err) {
      console.error("Manual save error:", err);
    } finally {
      setIsAutosaving(false);
    }
  };

  const handleAutoFixQaIssue = async (issueTitle: string, suggestion: string) => {
    if (!activeWorkspace) return;
    try {
      const res = await fetch(`/api/content/${contentId}/fix-qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          content: editorContent,
          issueTitle,
          suggestion,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEditorContent(data.fixedContent);
        setCurrentVersion(data.version);
        setVersions([data.version, ...versions]);
        setStatusMessage(`Auto-resolved issue: "${issueTitle}"`);
        setTimeout(() => setStatusMessage(""), 3500);
      }
    } catch (err) {
      console.error("Auto fix error:", err);
    }
  };

  const handleExecuteSectionRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !reviseInstruction.trim() || !reviseSelectedText.trim()) return;

    setIsRevising(true);
    setReviseError("");

    try {
      const res = await fetch(`/api/content/${contentId}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          sectionTitle: reviseSectionTitle || "Selected Section",
          currentText: reviseSelectedText,
          instruction: reviseInstruction,
          fullContent: editorContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEditorContent(data.version.content);
        setCurrentVersion(data.version);
        setVersions([data.version, ...versions]);
        setIsReviseModalOpen(false);
        setReviseInstruction("");
        setReviseSelectedText("");
        setIsDirty(false);
        setStatusMessage("Section rewritten and saved as a new version!");
        setTimeout(() => setStatusMessage(""), 3500);
      } else {
        const errData = await res.json();
        setReviseError(errData.error || "Revision failed");
      }
    } catch {
      setReviseError("Network error during section revision");
    } finally {
      setIsRevising(false);
    }
  };

  const fetchExportHistory = useCallback(async () => {
    if (!activeWorkspace || !contentId) return;
    try {
      const res = await fetch(`/api/content/${contentId}/export?workspaceId=${activeWorkspace.id}`);
      if (res.ok) {
        const data = await res.json();
        setExportHistory(data.exports || []);
      }
    } catch (err) {
      console.error("Fetch export history error:", err);
    }
  }, [activeWorkspace, contentId]);

  const handleOpenExportModal = () => {
    setIsExportModalOpen(true);
    handleGenerateExport(exportFormat);
    fetchExportHistory();
  };

  const handleGenerateExport = async (format: ExportFormat) => {
    if (!activeWorkspace || !contentId) return;
    setIsExporting(true);
    setExportFormat(format);
    try {
      const res = await fetch(`/api/content/${contentId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          format,
          versionId: currentVersion?.id,
          includeFrontmatter: exportIncludeFrontmatter,
          standaloneHtml: exportStandaloneHtml,
          markAsExported: exportMarkStatus,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExportResult(data.result);
        if (exportMarkStatus && item && item.status !== "exported") {
          setItem({ ...item, status: "exported" });
        }
        fetchExportHistory();
      }
    } catch (err) {
      console.error("Export generation failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadExportFile = () => {
    if (!exportResult) return;
    const blob = new Blob([exportResult.content], { type: exportResult.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyExportContent = () => {
    if (!exportResult) return;
    navigator.clipboard.writeText(exportResult.content);
    setIsCopiedExport(true);
    setTimeout(() => setIsCopiedExport(false), 2000);
  };

  const wordCount = editorContent.trim().split(/\s+/).filter(Boolean).length;
  const charCount = editorContent.length;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center text-studio-400">
        Loading content workspace...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Content Item Not Found</h2>
        <p className="text-xs text-studio-400">
          The requested article may have been deleted or belongs to a different workspace.
        </p>
        <Link href="/content">
          <Button variant="secondary" size="sm">
            Back to Content Library
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumbs & Quick Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-studio-800/60 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/content"
            className="p-1.5 rounded-lg border border-studio-800 text-studio-400 hover:text-white hover:bg-studio-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-400">
                {item.type.replace("-", " ")}
              </span>
              <span className="text-studio-600">•</span>
              <span className="text-xs text-studio-400">{item.category}</span>
              {hasUserEdits ? (
                <Badge variant="info" className="gap-1 text-[10px]">
                  <span>User Modified</span>
                </Badge>
              ) : (
                <Badge variant="default" className="gap-1 text-[10px]">
                  <Bot className="h-3 w-3" />
                  <span>AI Generated Draft</span>
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-0.5">
              {item.title}
            </h1>
          </div>
        </div>

        {/* Workflow & Autosave Status Bar */}
        <div className="flex items-center gap-2.5">
          <div className="text-[11px] text-studio-400 px-2 py-1 rounded bg-studio-900 border border-studio-800 flex items-center gap-1.5">
            {isAutosaving ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin text-brand-400" />
                <span>Autosaving...</span>
              </>
            ) : isDirty ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Unsaved changes</span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span>Saved {lastSavedTime ? `at ${lastSavedTime}` : ""}</span>
              </>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setReviseSectionTitle("Section 1");
              setReviseSelectedText(editorContent.slice(0, 400));
              setIsReviseModalOpen(true);
            }}
            className="gap-1.5 text-xs text-brand-300 border-brand-800/60 hover:bg-brand-950/40"
          >
            <Wand2 className="h-3.5 w-3.5 text-brand-400" />
            <span>AI Section Rewrite</span>
          </Button>

          {item.status === "draft" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange("in_review")}
              className="gap-1.5 text-xs text-amber-300 border-amber-800/60 hover:bg-amber-950/40"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Submit for Review</span>
            </Button>
          )}

          {item.status === "in_review" && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStatusChange("draft")}
                className="gap-1.5 text-xs text-studio-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Revert to Draft</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange("approved")}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Approve Content</span>
              </Button>
            </>
          )}

          {item.status === "approved" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange("exported")}
              className="gap-1.5 text-xs text-brand-300"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Mark as Exported</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenExportModal}
            className="gap-1.5 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            <span>Export Content</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleManualSave}
            disabled={isAutosaving}
            className="gap-1.5 text-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Snapshot</span>
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-brand-950/80 border border-brand-800 text-xs text-brand-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-brand-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Multi-Tab Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Center: Editor & Analytical Panels (3 columns) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between bg-studio-900/60 border border-studio-800 px-4 py-2 rounded-t-xl overflow-x-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("editor")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeTab === "editor"
                    ? "bg-studio-800 text-white"
                    : "text-studio-400 hover:text-studio-200"
                }`}
              >
                Draft Editor
              </button>
              <button
                onClick={() => setActiveTab("seo")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === "seo"
                    ? "bg-studio-800 text-brand-300"
                    : "text-studio-400 hover:text-studio-200"
                }`}
              >
                <span>SEO & Readability</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </button>
              <button
                onClick={() => setActiveTab("qa")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === "qa"
                    ? "bg-studio-800 text-brand-300"
                    : "text-studio-400 hover:text-studio-200"
                }`}
              >
                <span>QA Audit</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                  (qaAnalysis?.score || 100) >= 80 ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-300"
                }`}>
                  {qaAnalysis?.score || 100}%
                </span>
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeTab === "history"
                    ? "bg-studio-800 text-white"
                    : "text-studio-400 hover:text-studio-200"
                }`}
              >
                Version History ({versions.length})
              </button>
              <button
                onClick={() => setActiveTab("research")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeTab === "research"
                    ? "bg-studio-800 text-white"
                    : "text-studio-400 hover:text-studio-200"
                }`}
              >
                Research Grounding ({sources.length})
              </button>
              <button
                onClick={() => setActiveTab("agents")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeTab === "agents"
                    ? "bg-studio-800 text-brand-300"
                    : "text-studio-400 hover:text-studio-200"
                }`}
              >
                Agent Inspector
              </button>
            </div>

            <div className="text-[11px] text-studio-500 flex items-center gap-3">
              <span>{wordCount} words</span>
              <span>{charCount} chars</span>
              <span>v{currentVersion?.versionNumber || 1}</span>
            </div>
          </div>

          {/* Tab 1: Draft Editor */}
          {activeTab === "editor" && (
            <div className="border border-t-0 border-studio-800 rounded-b-xl bg-studio-950 p-4">
              <textarea
                rows={24}
                value={editorContent}
                onChange={(e) => handleEditorChange(e.target.value)}
                placeholder="Write or edit content markdown..."
                className="w-full bg-transparent font-mono text-xs md:text-sm text-studio-100 placeholder-studio-600 focus:outline-none resize-y leading-relaxed"
              />
            </div>
          )}

          {/* Tab 2: SEO & Readability Panel */}
          {activeTab === "seo" && seoAnalysis && (
            <Card className="border-t-0 rounded-t-none space-y-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-brand-400" />
                  <span>Real-Time Search Engine Optimization & Readability</span>
                </CardTitle>
                <CardDescription>
                  Comprehensive structural analysis, SERP snippet validation, and reading complexity
                </CardDescription>
              </CardHeader>

              {/* Top Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 pt-0">
                <div className="p-3.5 rounded-lg bg-studio-950 border border-studio-800">
                  <span className="text-[11px] text-studio-400 block">Readability Score</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {seoAnalysis.readabilityScore} / 100
                  </div>
                  <span className="text-[10px] text-emerald-400 mt-0.5 block">
                    {seoAnalysis.readabilityLevel}
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-studio-950 border border-studio-800">
                  <span className="text-[11px] text-studio-400 block">Est. Reading Time</span>
                  <div className="text-xl font-bold text-white mt-1">
                    ~{seoAnalysis.readingTimeMinutes} min
                  </div>
                  <span className="text-[10px] text-studio-500 mt-0.5 block">
                    Based on {seoAnalysis.wordCount} words
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-studio-950 border border-studio-800">
                  <span className="text-[11px] text-studio-400 block">SEO Title Length</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {seoAnalysis.titleLength} chars
                  </div>
                  <span className={`text-[10px] mt-0.5 block ${
                    seoAnalysis.titleStatus === "good" ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    {seoAnalysis.titleStatus === "good" ? "Optimal (<65c)" : "Check length"}
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-studio-950 border border-studio-800">
                  <span className="text-[11px] text-studio-400 block">Heading Structure</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {seoAnalysis.headingCounts.h1} H1 • {seoAnalysis.headingCounts.h2} H2
                  </div>
                  <span className="text-[10px] text-studio-500 mt-0.5 block">
                    {seoAnalysis.headingCounts.h3} Sub-sections (H3)
                  </span>
                </div>
              </div>

              {/* Keywords Density Table */}
              <div className="p-4 pt-0 space-y-3">
                <span className="text-xs font-semibold text-white block">
                  Target Keyword Density & Distribution
                </span>
                {seoAnalysis.keywordsAnalysis.length === 0 ? (
                  <p className="text-xs text-studio-500 italic">No target keywords specified for this draft.</p>
                ) : (
                  <div className="border border-studio-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-studio-950 text-studio-400 border-b border-studio-800">
                        <tr>
                          <th className="p-2.5">Keyword</th>
                          <th className="p-2.5">Occurrences</th>
                          <th className="p-2.5">Density</th>
                          <th className="p-2.5">In Heading?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-studio-800/60">
                        {seoAnalysis.keywordsAnalysis.map((kw, idx) => (
                          <tr key={idx} className="hover:bg-studio-950/40">
                            <td className="p-2.5 font-medium text-white">{kw.keyword}</td>
                            <td className="p-2.5 text-studio-300">{kw.count}x</td>
                            <td className="p-2.5 text-studio-300">{kw.densityPercent}%</td>
                            <td className="p-2.5">
                              {kw.foundInHeading ? (
                                <Badge variant="success">Yes</Badge>
                              ) : (
                                <Badge variant="outline">No</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Tab 3: QA Quality Audit Panel */}
          {activeTab === "qa" && qaAnalysis && (
            <Card className="border-t-0 rounded-t-none space-y-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <CardTitle className="text-base">Automated QA & Brand Rule Audit</CardTitle>
                  </div>
                  <Badge variant={qaAnalysis.passed ? "success" : "warning"}>
                    Score: {qaAnalysis.score}/100
                  </Badge>
                </div>
                <CardDescription>
                  Deep inspection for prohibited brand vocabulary, unsupported claims, and structural issues
                </CardDescription>
              </CardHeader>

              <div className="p-4 pt-0 space-y-3">
                {qaAnalysis.issues.length === 0 ? (
                  <div className="p-8 text-center text-xs text-emerald-400 border border-dashed border-emerald-800/60 rounded-lg bg-emerald-950/20">
                    <CheckCheck className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                    <p className="font-semibold text-sm text-white">All QA & Brand Quality Checks Passed</p>
                    <p className="text-xs text-emerald-300 mt-1">Zero prohibited buzzwords or structural defects detected.</p>
                  </div>
                ) : (
                  qaAnalysis.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="p-3.5 rounded-lg border border-studio-800 bg-studio-950/80 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{issue.title}</span>
                          <Badge variant={issue.severity === "high" ? "warning" : "outline"}>
                            {issue.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-studio-400">{issue.description}</p>
                        <p className="text-[11px] text-brand-300">
                          <strong>Fix:</strong> {issue.suggestion}
                        </p>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAutoFixQaIssue(issue.title, issue.suggestion)}
                        className="text-xs gap-1.5 shrink-0"
                      >
                        <Wrench className="h-3.5 w-3.5 text-brand-400" />
                        <span>Auto-Fix</span>
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* Tab 4: Version History */}
          {activeTab === "history" && (
            <Card className="border-t-0 rounded-t-none space-y-4">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-brand-400" />
                  <span>Immutable Version History & Snapshot Comparison</span>
                </CardTitle>
                <CardDescription>
                  Review previous revisions, inspect differences, or restore any historical snapshot
                </CardDescription>
              </CardHeader>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 pt-0">
                {/* Version List */}
                <div className="space-y-2 border-r border-studio-800/80 pr-3">
                  <span className="text-[11px] font-semibold text-studio-400 uppercase tracking-wider block mb-2">
                    Snapshots
                  </span>
                  {versions.map((ver) => (
                    <div
                      key={ver.id}
                      onClick={() => setSelectedDiffVersion(ver)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedDiffVersion?.id === ver.id
                          ? "bg-brand-950/40 border-brand-500/60"
                          : "bg-studio-950/60 border-studio-800 hover:border-studio-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          Version {ver.versionNumber}
                        </span>
                        {ver.id === currentVersion?.id && (
                          <Badge variant="info">Active</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-studio-500 mt-1">
                        {new Date(ver.createdAt || Date.now()).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Diff / Snapshot Preview */}
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-studio-800">
                    <span className="text-xs font-medium text-studio-300">
                      Previewing Version {selectedDiffVersion?.versionNumber || currentVersion?.versionNumber}
                    </span>
                    {selectedDiffVersion && selectedDiffVersion.id !== currentVersion?.id && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setEditorContent(selectedDiffVersion.content);
                          setActiveTab("editor");
                          setIsDirty(true);
                        }}
                        className="text-xs"
                      >
                        Restore This Version to Editor
                      </Button>
                    )}
                  </div>
                  <pre className="p-4 rounded-lg bg-studio-950 border border-studio-800/80 text-xs font-mono text-studio-300 overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed">
                    {selectedDiffVersion?.content || currentVersion?.content}
                  </pre>
                </div>
              </div>
            </Card>
          )}

          {/* Tab 5: Research */}
          {activeTab === "research" && (
            <Card className="border-t-0 rounded-t-none">
              <CardHeader>
                <CardTitle className="text-base">Retained Research Citations</CardTitle>
                <CardDescription>
                  Verified external facts and publisher sources backing this content piece
                </CardDescription>
              </CardHeader>
              {sources.length === 0 ? (
                <div className="p-8 text-center text-xs text-studio-500 border border-dashed border-studio-800 rounded-lg">
                  No external research sources attached yet. Run the Research Agent pipeline to retrieve grounded citations.
                </div>
              ) : (
                <div className="space-y-3">
                  {sources.map((src) => (
                    <div
                      key={src.id}
                      className="p-3 rounded-lg border border-studio-800 bg-studio-950/80"
                    >
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-brand-400 hover:underline flex items-center gap-1.5"
                      >
                        <span>{src.title}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {src.notes && (
                        <p className="text-xs text-studio-300 mt-1">{src.notes}</p>
                      )}
                      <span className="text-[10px] text-studio-500 mt-1 block">
                        Publisher: {src.publisher || "Web Source"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Tab 6: Multi-Agent Inspector */}
          {activeTab === "agents" && (
            <Card className="border-t-0 rounded-t-none space-y-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-brand-400" />
                      <span>Multi-Agent Execution Pipeline</span>
                    </CardTitle>
                    <CardDescription>
                      Specialized agent stages executing sequentially with automatic retry and circuit breaker defense
                    </CardDescription>
                  </div>
                  <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    Circuit: CLOSED (Healthy)
                  </Badge>
                </div>
              </CardHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 pt-0">
                <div className="p-3 rounded-lg bg-studio-950 border border-studio-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                    <span>1. Research Agent</span>
                    <Badge variant="success">Completed</Badge>
                  </div>
                  <p className="text-[11px] text-studio-400">
                    Gathered grounded citations and empirical latency benchmarks.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-studio-950 border border-studio-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                    <span>2. Content Strategist</span>
                    <Badge variant="success">Completed</Badge>
                  </div>
                  <p className="text-[11px] text-studio-400">
                    Formulated 4-part architectural blueprint and section goals.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-studio-950 border border-studio-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                    <span>3. Writer Agent</span>
                    <Badge variant="success">Completed</Badge>
                  </div>
                  <p className="text-[11px] text-studio-400">
                    Produced full markdown draft adhering to workspace brand tone.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-studio-950 border border-studio-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                    <span>4. SEO Agent</span>
                    <Badge variant="success">Completed</Badge>
                  </div>
                  <p className="text-[11px] text-studio-400">
                    Generated SEO title, meta description, and keywords.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-studio-950 border border-studio-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                    <span>5. QA Reviewer Agent</span>
                    <Badge variant="success">Passed ({qaAnalysis?.score || 100}/100)</Badge>
                  </div>
                  <p className="text-[11px] text-studio-400">
                    Verified brand vocabulary rules and heading structures.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-studio-950 border border-studio-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                    <span>6. Image Agent</span>
                    <Badge variant="success">Completed</Badge>
                  </div>
                  <p className="text-[11px] text-studio-400">
                    Designed isometric 3D render prompt and visual brief.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Sidebar: Metadata & Visual Brief (1 column) */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Content Overview</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-studio-500 block text-[11px]">Workflow State</span>
                <span className="font-semibold text-white uppercase tracking-wide">
                  {item.status.replace("_", " ")}
                </span>
              </div>
              <div>
                <span className="text-studio-500 block text-[11px]">Slug</span>
                <code className="text-[11px] text-studio-300 bg-studio-950 px-1.5 py-0.5 rounded border border-studio-800">
                  {item.slug}
                </code>
              </div>
              <div>
                <span className="text-studio-500 block text-[11px]">Category</span>
                <span className="text-studio-200">{item.category}</span>
              </div>
              <div>
                <span className="text-studio-500 block text-[11px]">Last Updated</span>
                <span className="text-studio-200">
                  {new Date(item.updatedAt || Date.now()).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">SEO Meta Snapshot</CardTitle>
            </CardHeader>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-studio-500 block text-[11px]">SEO Title</span>
                <span className="text-studio-200 line-clamp-1">
                  {currentVersion?.seoMetadata?.seoTitle || item.title}
                </span>
              </div>
              <div>
                <span className="text-studio-500 block text-[11px]">Meta Description</span>
                <span className="text-studio-400 line-clamp-2">
                  {currentVersion?.seoMetadata?.metaDescription || item.excerpt || "No description set"}
                </span>
              </div>
              {Array.isArray(currentVersion?.seoMetadata?.keywords) && currentVersion.seoMetadata.keywords.length > 0 && (
                <div>
                  <span className="text-studio-500 block text-[11px] mb-1">Keywords</span>
                  <div className="flex flex-wrap gap-1">
                    {currentVersion.seoMetadata.keywords.map((kw, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-studio-950 border border-studio-800 text-[10px] text-brand-300">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Featured Visual Asset Card */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Featured Visual</CardTitle>
              <Link href="/media" className="text-[11px] text-indigo-400 hover:text-indigo-300">
                Media Library
              </Link>
            </CardHeader>
            <div className="space-y-3 text-xs">
              {mediaAssets.length > 0 ? (
                <div className="space-y-2">
                  <div className="rounded-lg overflow-hidden border border-studio-800 bg-studio-950 aspect-video relative group">
                    <img
                      src={mediaAssets[0].publicUrl}
                      alt={mediaAssets[0].altText || mediaAssets[0].title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5">
                      <Badge variant="outline" className="bg-black/70 text-[9px] text-studio-200 border-white/10">
                        {mediaAssets[0].style?.replace("_", " ") || "16:9"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-studio-200 truncate">
                    {mediaAssets[0].title}
                  </p>
                  {mediaAssets[0].prompt && (
                    <p className="text-[10px] text-studio-400 line-clamp-2 font-mono bg-studio-950 p-1.5 rounded border border-studio-800/60">
                      {mediaAssets[0].prompt}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center p-4 border border-dashed border-studio-800 rounded-lg bg-studio-950/40">
                  <ImageIcon className="w-5 h-5 text-studio-500 mx-auto mb-1.5" />
                  <p className="text-[11px] text-studio-400">No image generated yet</p>
                  <Link href="/media">
                    <Button variant="outline" size="sm" className="mt-2 text-[11px] h-7 px-2.5 border-studio-700">
                      <Sparkles className="w-3 h-3 mr-1 text-indigo-400" />
                      Create Visual
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* AI Section Revision Modal */}
      {isReviseModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl p-6 bg-studio-900 border-studio-800 shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Wand2 className="h-5 w-5 text-brand-400" />
              <h3 className="text-lg font-bold text-white">AI Section Revision Assistant</h3>
            </div>
            <p className="text-xs text-studio-400 mb-4">
              Instruct the AI to rewrite or optimize a specific section without affecting the rest of the document.
            </p>

            {reviseError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300">
                {reviseError}
              </div>
            )}

            <form onSubmit={handleExecuteSectionRevision} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Section Title / Identifier
                </label>
                <input
                  type="text"
                  required
                  value={reviseSectionTitle}
                  onChange={(e) => setReviseSectionTitle(e.target.value)}
                  placeholder="e.g., Section 2: Architectural Blueprint"
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3 py-2 text-xs text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Target Section Text to Rewrite
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviseSelectedText}
                  onChange={(e) => setReviseSelectedText(e.target.value)}
                  placeholder="Paste or select the portion of text you wish to rewrite..."
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Revision Instruction / Prompt
                </label>
                <input
                  type="text"
                  required
                  value={reviseInstruction}
                  onChange={(e) => setReviseInstruction(e.target.value)}
                  placeholder="e.g., Make the tone more technical and add a benchmark comparison table"
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3 py-2 text-xs text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-studio-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsReviseModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isRevising}
                  className="gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isRevising ? "Rewriting Section..." : "Execute Section Revision"}</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DOCUMENT EXPORT MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-studio-900 border border-studio-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-studio-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Export Document</h3>
                  <p className="text-xs text-studio-400">
                    Generate multi-format publication artifacts for web, Markdown repos, or headless CMS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-studio-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Format Selection Tabs */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleGenerateExport("markdown")}
                className={`p-3.5 rounded-xl text-left border transition-all ${
                  exportFormat === "markdown"
                    ? "bg-indigo-950/40 border-indigo-500 text-white shadow-sm shadow-indigo-500/10"
                    : "bg-studio-950/60 border-studio-800 text-studio-400 hover:border-studio-700 hover:text-studio-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Markdown (.md)</span>
                  <FileCode className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-[11px] text-studio-400">
                  Frontmatter metadata + formatted GitHub flavored markdown
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleGenerateExport("html")}
                className={`p-3.5 rounded-xl text-left border transition-all ${
                  exportFormat === "html"
                    ? "bg-indigo-950/40 border-indigo-500 text-white shadow-sm shadow-indigo-500/10"
                    : "bg-studio-950/60 border-studio-800 text-studio-400 hover:border-studio-700 hover:text-studio-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">HTML5 (.html)</span>
                  <Code className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-[11px] text-studio-400">
                  SEO meta headers, OpenGraph tags, and responsive typography
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleGenerateExport("json")}
                className={`p-3.5 rounded-xl text-left border transition-all ${
                  exportFormat === "json"
                    ? "bg-indigo-950/40 border-indigo-500 text-white shadow-sm shadow-indigo-500/10"
                    : "bg-studio-950/60 border-studio-800 text-studio-400 hover:border-studio-700 hover:text-studio-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Headless CMS (.json)</span>
                  <FileCheck className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-[11px] text-studio-400">
                  Structured payload for Strapi, Contentful, Ghost, or Sanity
                </p>
              </button>
            </div>

            {/* Export Options */}
            <div className="flex flex-wrap items-center gap-4 p-3 bg-studio-950/60 rounded-xl border border-studio-800/80 text-xs text-studio-300">
              {exportFormat === "markdown" && (
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportIncludeFrontmatter}
                    onChange={(e) => {
                      setExportIncludeFrontmatter(e.target.checked);
                      handleGenerateExport("markdown");
                    }}
                    className="rounded border-studio-700 bg-studio-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Include YAML Frontmatter</span>
                </label>
              )}

              {exportFormat === "html" && (
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportStandaloneHtml}
                    onChange={(e) => {
                      setExportStandaloneHtml(e.target.checked);
                      handleGenerateExport("html");
                    }}
                    className="rounded border-studio-700 bg-studio-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Full HTML5 Document with Head & Styles</span>
                </label>
              )}

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportMarkStatus}
                  onChange={(e) => setExportMarkStatus(e.target.checked)}
                  className="rounded border-studio-700 bg-studio-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Update document workflow status to &quot;Exported&quot;</span>
              </label>
            </div>

            {/* Live Output Code Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-studio-200">
                  Output Preview ({exportResult?.filename || "export"})
                </span>
                <span className="text-studio-500 font-mono text-[11px]">
                  {exportResult?.metadata?.wordCount || wordCount} words • {exportResult?.mimeType}
                </span>
              </div>

              <div className="relative">
                <pre className="w-full max-h-64 overflow-auto p-4 bg-studio-950 rounded-xl border border-studio-800 text-[11px] font-mono text-studio-300 leading-relaxed">
                  {isExporting ? "Generating formatted export..." : exportResult?.content || "No content formatted"}
                </pre>
              </div>
            </div>

            {/* Export History */}
            {exportHistory.length > 0 && (
              <div className="pt-2 border-t border-studio-800/80">
                <p className="text-xs font-semibold text-studio-400 mb-2">
                  Past Exports ({exportHistory.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {exportHistory.slice(0, 5).map((rec) => (
                    <span
                      key={rec.id}
                      className="px-2 py-1 rounded bg-studio-950 border border-studio-800 text-[10px] text-studio-400"
                    >
                      {rec.format.toUpperCase()} • {new Date(rec.createdAt).toLocaleDateString()}{" "}
                      {new Date(rec.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-studio-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExportModalOpen(false)}
                className="border-studio-700 text-studio-300"
              >
                Close
              </Button>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyExportContent}
                  disabled={!exportResult || isExporting}
                  className="border-studio-700 text-studio-200"
                >
                  {isCopiedExport ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copy Content
                    </>
                  )}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={downloadExportFile}
                  disabled={!exportResult || isExporting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download {exportFormat.toUpperCase()}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
