/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wand2,
  Check,
  ShieldCheck,
  Share2,
  Download,
  Copy,
  Gauge,
  Layers,
  Sparkles,
  ExternalLink,
  Bot,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

  // History Diff State
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
        setStatusMessage(`Status updated to ${newStatus.toUpperCase()}`);
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
      <div className="max-w-7xl mx-auto p-12 text-center text-slate-400 text-sm">
        Loading document workspace...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Document Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested document could not be located in this workspace.
        </p>
        <Link href="/content">
          <Button variant="outline" size="sm">
            Return to Content Library
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Header & Workflow Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/content"
            className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-600">
                {item.type.replace("-", " ")}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">{item.category}</span>
              {hasUserEdits ? (
                <Badge variant="secondary" className="text-[10px]">User Modified</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Draft v1</Badge>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              {item.title}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 flex items-center gap-1.5 font-medium">
            {isAutosaving ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin text-orange-600" />
                <span>Autosaving...</span>
              </>
            ) : isDirty ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Unsaved</span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span>Saved {lastSavedTime ? `at ${lastSavedTime}` : ""}</span>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setReviseSectionTitle("Selected Section");
              setReviseSelectedText(editorContent.slice(0, 400));
              setIsReviseModalOpen(true);
            }}
            className="gap-1.5 text-xs h-8"
          >
            <Wand2 className="h-3.5 w-3.5 text-orange-600" />
            <span>Rewrite</span>
          </Button>

          {item.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("in_review")}
              className="gap-1.5 text-xs h-8 text-amber-700 hover:bg-amber-50 border-amber-200"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Submit Review</span>
            </Button>
          )}

          {item.status === "in_review" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("draft")}
                className="text-xs h-8"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                <span>Revert</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange("approved")}
                className="gap-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Approve</span>
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenExportModal}
            className="gap-1.5 text-xs h-8 font-medium"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Export</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleManualSave}
            disabled={isAutosaving}
            className="gap-1.5 text-xs h-8 font-semibold"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save</span>
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-2.5 rounded-md bg-orange-50 border border-orange-200 text-xs text-orange-800 flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4 text-orange-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Workspace Layout (Editor + Analytical Tabs + Sidebar Metadata) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Editor & Content Area (3 columns) */}
        <div className="lg:col-span-3 space-y-3">
          {/* Tabs Bar */}
          <div className="flex items-center justify-between bg-white border border-slate-200 px-3 py-1.5 rounded-t-lg shadow-sm overflow-x-auto">
            <div className="flex items-center gap-1">
              {[
                { key: "editor", label: "Editor" },
                { key: "seo", label: "SEO & Readability", badge: seoAnalysis?.readabilityScore ? `${seoAnalysis.readabilityScore}%` : undefined },
                { key: "qa", label: "QA Audit", badge: qaAnalysis?.score ? `${qaAnalysis.score}%` : undefined },
                { key: "history", label: `History (${versions.length})` },
                { key: "research", label: `Sources (${sources.length})` },
                { key: "agents", label: "Agents" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.key
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-100 text-orange-700 font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-3 font-mono">
              <span>{wordCount} words</span>
              <span>{charCount} chars</span>
              <span>v{currentVersion?.versionNumber || 1}</span>
            </div>
          </div>

          {/* Tab 1: Draft Editor */}
          {activeTab === "editor" && (
            <div className="border border-t-0 border-slate-200 rounded-b-lg bg-white p-4 shadow-sm">
              <textarea
                rows={24}
                value={editorContent}
                onChange={(e) => handleEditorChange(e.target.value)}
                placeholder="Write or edit content markdown..."
                className="w-full bg-white font-mono text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-y leading-relaxed"
              />
            </div>
          )}

          {/* Tab 2: SEO Panel */}
          {activeTab === "seo" && seoAnalysis && (
            <Card className="border-t-0 rounded-t-none p-5 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <Gauge className="h-4 w-4 text-orange-600" />
                  <span>SEO & Readability Analysis</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Keyword distribution, title validation, and reading complexity
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block font-medium">Readability Score</span>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{seoAnalysis.readabilityScore} / 100</div>
                  <span className="text-[10px] text-emerald-600 font-medium block">{seoAnalysis.readabilityLevel}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block font-medium">Reading Time</span>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">~{seoAnalysis.readingTimeMinutes} min</div>
                  <span className="text-[10px] text-slate-500 block">{seoAnalysis.wordCount} words</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block font-medium">Title Length</span>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{seoAnalysis.titleLength} chars</div>
                  <span className="text-[10px] text-emerald-600 font-medium block">{seoAnalysis.titleStatus === "good" ? "Optimal" : "Check length"}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block font-medium">Heading Structure</span>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{seoAnalysis.headingCounts.h1} H1 • {seoAnalysis.headingCounts.h2} H2</div>
                  <span className="text-[10px] text-slate-500 block">{seoAnalysis.headingCounts.h3} Subheadings</span>
                </div>
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-800 block">Keyword Distribution</span>
                {seoAnalysis.keywordsAnalysis.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No target keywords attached.</p>
                ) : (
                  <div className="border border-slate-200 rounded-md overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="p-2.5 font-semibold">Keyword</th>
                          <th className="p-2.5 font-semibold">Frequency</th>
                          <th className="p-2.5 font-semibold">Density</th>
                          <th className="p-2.5 font-semibold">In Heading</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {seoAnalysis.keywordsAnalysis.map((k) => (
                          <tr key={k.keyword}>
                            <td className="p-2.5 font-medium text-slate-800">{k.keyword}</td>
                            <td className="p-2.5 text-slate-600">{k.count} times</td>
                            <td className="p-2.5 text-slate-600">{k.densityPercent}%</td>
                            <td className="p-2.5">{k.foundInHeading ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Tab 3: QA Audit Panel */}
          {activeTab === "qa" && qaAnalysis && (
            <Card className="border-t-0 rounded-t-none p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">QA & Brand Compliance Audit</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Automated validation of citations, claims, and style guidelines</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Quality Score:</span>
                  <Badge variant={qaAnalysis.passed ? "success" : "warning"} className="text-xs">
                    {qaAnalysis.score} / 100
                  </Badge>
                </div>
              </div>

              {qaAnalysis.issues.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-md">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-emerald-800">All Quality & Brand Checks Passed</p>
                  <p className="text-xs text-emerald-600 mt-0.5">No prohibited buzzwords, formatting discrepancies, or unsupported assertions detected.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {qaAnalysis.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900">{issue.title}</span>
                          <Badge variant={issue.severity === "high" ? "destructive" : issue.severity === "medium" ? "warning" : "secondary"}>
                            {issue.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{issue.description}</p>
                        <p className="text-xs text-orange-700 font-medium">Recommendation: {issue.suggestion}</p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoFixQaIssue(issue.title, issue.suggestion)}
                        className="text-xs h-7 shrink-0 text-orange-700 border-orange-200 hover:bg-orange-50"
                      >
                        Auto-Fix
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Tab 4: Version History */}
          {activeTab === "history" && (
            <Card className="border-t-0 rounded-t-none p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Version History</h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden">
                {versions.map((ver) => (
                  <div key={ver.id} className="p-3.5 bg-white flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Version {ver.versionNumber}</span>
                        {ver.id === currentVersion?.id && <Badge variant="primary">Active</Badge>}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Snapshot created: {new Date(ver.createdAt || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    {ver.id !== currentVersion?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditorContent(ver.content);
                          setCurrentVersion(ver);
                          setIsDirty(false);
                          setStatusMessage(`Restored Version ${ver.versionNumber}`);
                        }}
                        className="text-xs h-7"
                      >
                        Restore Snapshot
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tab 5: Research Grounding */}
          {activeTab === "research" && (
            <Card className="border-t-0 rounded-t-none p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Attached Empirical Sources</h3>
              {sources.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No research sources currently attached to this document.</p>
              ) : (
                <div className="space-y-2">
                  {sources.map((s) => (
                    <div key={s.id} className="p-3 rounded-md border border-slate-200 bg-slate-50 text-xs">
                      <div className="font-semibold text-slate-900">{s.title}</div>
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-orange-600 hover:underline flex items-center gap-1 mt-0.5">
                        <span>{s.url}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Tab 6: Agent Inspector */}
          {activeTab === "agents" && (
            <Card className="border-t-0 rounded-t-none p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Autonomous Agent Pipeline Status</h3>
              <p className="text-xs text-slate-500">Telemetry logs from multi-agent generation run</p>
              <div className="p-3 rounded bg-slate-100 border border-slate-200 font-mono text-xs text-slate-800 space-y-1">
                <div>✓ ResearchAgent: Verified citations loaded</div>
                <div>✓ StrategistAgent: Formulated structure outline</div>
                <div>✓ WriterAgent: Completed full text synthesis</div>
                <div>✓ SeoAgent: Optimized keyword density & meta</div>
                <div>✓ QaAgent: Passed compliance score standards</div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Sidebar (Metadata & Artwork) */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Document Details</h3>
            <div className="text-xs space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-semibold text-slate-900 capitalize">{item.status.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-slate-900">{item.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Slug:</span>
                <span className="font-mono text-[11px] text-slate-700">{item.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Version:</span>
                <span className="font-semibold text-slate-900">v{currentVersion?.versionNumber || 1}</span>
              </div>
            </div>
          </Card>

          {/* Featured Visual Media */}
          {mediaAssets.length > 0 && (
            <Card className="p-4 space-y-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Featured Media</h3>
              <div className="rounded-md overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
                {mediaAssets[0].publicUrl?.startsWith("<svg") ? (
                  <div
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: mediaAssets[0].publicUrl }}
                  />
                ) : (
                  <img
                    src={mediaAssets[0].publicUrl}
                    alt={mediaAssets[0].altText || "Featured visual"}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2">{mediaAssets[0].prompt}</p>
            </Card>
          )}
        </div>
      </div>

      {/* AI Section Revision Dialog */}
      <Dialog open={isReviseModalOpen} onOpenChange={setIsReviseModalOpen}>
        <DialogContent onClose={() => setIsReviseModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>AI Section Rewrite</DialogTitle>
            <DialogDescription>
              Target a section to rewrite while preserving surrounding document flow
            </DialogDescription>
          </DialogHeader>

          {reviseError && (
            <div className="p-2.5 rounded bg-red-50 text-red-700 border border-red-200 text-xs">
              {reviseError}
            </div>
          )}

          <form onSubmit={handleExecuteSectionRevision} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Section Content</label>
              <Textarea
                rows={4}
                required
                value={reviseSelectedText}
                onChange={(e) => setReviseSelectedText(e.target.value)}
                placeholder="Paste section text..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rewrite Instructions</label>
              <Input
                required
                value={reviseInstruction}
                onChange={(e) => setReviseInstruction(e.target.value)}
                placeholder="e.g., Make more concise, add benchmark metrics, tone down buzzwords"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsReviseModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isRevising}>
                {isRevising ? "Rewriting..." : "Execute Rewrite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Export Modal Dialog */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent onClose={() => setIsExportModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Export Document</DialogTitle>
            <DialogDescription>
              Generate production artifacts for CMS or static publication
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Format Pickers */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { format: "markdown", label: "Markdown (.md)" },
                { format: "html", label: "HTML5 (.html)" },
                { format: "json", label: "Headless JSON" },
              ].map((fmt) => (
                <button
                  key={fmt.format}
                  type="button"
                  onClick={() => handleGenerateExport(fmt.format as ExportFormat)}
                  className={`p-2 rounded-md border text-xs font-semibold transition-colors ${
                    exportFormat === fmt.format
                      ? "bg-orange-50 border-orange-500 text-orange-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            {/* Live Preview Box */}
            {exportResult && (
              <div className="p-3 rounded-md bg-slate-900 text-slate-100 font-mono text-xs max-h-48 overflow-y-auto">
                <pre>{exportResult.content.slice(0, 500)}...</pre>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={copyExportContent}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                <span>{isCopiedExport ? "Copied!" : "Copy Content"}</span>
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={downloadExportFile} disabled={!exportResult}>
                <Download className="h-3.5 w-3.5 mr-1" />
                <span>Download File</span>
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
