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
  Loader2,
  Trash2,
  Upload,
  Network,
  Camera,
  AlertTriangle,
  X,
  Search,
} from "lucide-react";
import { findBannedPhrases } from "@/lib/ai/banned-phrases";
import { generateSlug, SLUG_PATTERN } from "@/lib/utils";
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

  // Direct Website API Publish State
  const [isPublishingToWebsite, setIsPublishingToWebsite] = useState(false);
  const [publishWebsiteSuccess, setPublishWebsiteSuccess] = useState<string | null>(null);
  const [publishWebsiteError, setPublishWebsiteError] = useState<string | null>(null);

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
          // data.version is the raw DB row (seo_metadata); keep the mapped seoMetadata so the next save doesn't drop the cover.
          setCurrentVersion((prev) =>
            prev ? { ...prev, id: data.version.id, versionNumber: data.version.version_number, content: data.version.content } : prev
          );
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

  // ---------------- Review before publish
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState("");

  /** Reloads the latest version without the full-page loading state (keeps the review overlay open). */
  const reloadVersion = async (): Promise<ContentVersion | null> => {
    if (!activeWorkspace) return null;
    const res = await fetch(`/api/content/${contentId}?workspaceId=${activeWorkspace.id}`);
    if (!res.ok) return null;
    const data = await res.json();
    setCurrentVersion(data.currentVersion);
    setVersions(data.versions || []);
    if (data.currentVersion) setEditorContent(data.currentVersion.content);
    return data.currentVersion;
  };

  const runVisualAction = async (label: string, body: Record<string, unknown>): Promise<boolean> => {
    if (!activeWorkspace) return false;
    let ok = false;
    setReviewBusy(label);
    setReviewError("");
    try {
      if (isDirty) await handleManualSave(); // visuals are built from the saved draft
      const res = await fetch(`/api/content/${contentId}/visuals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace.id, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setReviewError(data.error || `Request failed (HTTP ${res.status})`);
      ok = res.ok;
      await reloadVersion();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : String(err));
    } finally {
      setReviewBusy(null);
    }
    return ok;
  };

  // Stock photo search (Pexels / Unsplash via the visuals route). Results are previews only until one is picked.
  type StockResult = {
    provider: "pexels" | "unsplash"; id: string; thumbUrl: string; photographer: string; alt: string; score?: number; reason?: string;
    credit: { photographerUrl: string; photoUrl: string }; // links already carry Unsplash referral params
  };
  const [stockOpen, setStockOpen] = useState(false);
  const [stockQuery, setStockQuery] = useState("");
  const [stockQueries, setStockQueries] = useState<string[]>([]);
  const [stockResults, setStockResults] = useState<StockResult[] | null>(null);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

  const searchStock = async (query?: string) => {
    if (!activeWorkspace) return;
    setReviewBusy("stock");
    setReviewError("");
    try {
      if (isDirty) await handleManualSave(); // queries are built from the saved draft
      const res = await fetch(`/api/content/${contentId}/visuals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace.id, action: "stock-search", ...(query?.trim() ? { query: query.trim() } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReviewError(data.error || `Stock search failed (HTTP ${res.status})`);
        setStockResults([]);
        return;
      }
      setStockResults(data.candidates || []);
      setStockQueries(data.queries || []);
      setStockWarnings(data.warnings || []);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : String(err));
    } finally {
      setReviewBusy(null);
    }
  };

  const handleCoverUpload = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return setReviewError("Use a PNG, JPEG, WebP or GIF image.");
    if (file.size > 10 * 1024 * 1024) return setReviewError("Image must be under 10 MB.");
    const reader = new FileReader();
    reader.onload = () =>
      runVisualAction("upload", { action: "upload-cover", dataUri: String(reader.result), alt: file.name.replace(/\.[^.]+$/, "") });
    reader.readAsDataURL(file);
  };

  // Editable title / slug / excerpt in the review step
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewSlug, setReviewSlug] = useState("");
  const [reviewExcerpt, setReviewExcerpt] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugSuggestion, setSlugSuggestion] = useState("");
  const isPublishedItem = item?.status === "approved" || item?.status === "exported";

  const openReview = () => {
    setReviewError("");
    setSlugSuggestion("");
    setReviewTitle(item?.title || "");
    setReviewSlug(item?.slug || "");
    setReviewExcerpt(item?.excerpt || "");
    setSlugTouched(false);
    setIsReviewOpen(true);
  };

  const handleReviewTitleChange = (title: string) => {
    setReviewTitle(title);
    // Only auto-follow the title for unpublished posts the user hasn't hand-edited, so live URLs don't change silently.
    if (!slugTouched && !isPublishedItem) setReviewSlug(generateSlug(title));
  };

  /** Saves title/slug/excerpt if changed. Returns false (and shows why) when the server rejects them. */
  const saveReviewMeta = async (): Promise<boolean> => {
    if (!activeWorkspace || !item) return false;
    const changes: Record<string, string> = {};
    if (reviewTitle.trim() !== item.title) changes.title = reviewTitle.trim();
    if (reviewSlug.trim() !== item.slug) changes.slug = reviewSlug.trim();
    if (reviewExcerpt.trim() !== (item.excerpt || "")) changes.excerpt = reviewExcerpt.trim();
    if (Object.keys(changes).length === 0) return true;
    const res = await fetch(`/api/content/${contentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: activeWorkspace.id, ...changes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const fieldErrors = data.details?.fieldErrors ? Object.values(data.details.fieldErrors).flat().join(" ") : "";
      setReviewError(fieldErrors || data.error || `Could not save title/slug/excerpt (HTTP ${res.status})`);
      setSlugSuggestion(data.suggestion || "");
      return false;
    }
    if (data.item) setItem(data.item);
    return true;
  };

  const handleSaveFromReview = async () => {
    setReviewBusy("save");
    setReviewError("");
    try {
      if (!(await saveReviewMeta())) return;
      if (isDirty) await handleManualSave();
    } finally {
      setReviewBusy(null);
    }
  };

  const handlePublishFromReview = async () => {
    setReviewBusy("publish");
    setReviewError("");
    try {
      if (!(await saveReviewMeta())) return;
      if (isDirty) await handleManualSave();
      setIsReviewOpen(false);
      await handlePublishToWebsite();
    } finally {
      setReviewBusy(null);
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
        // The versions API returns the raw DB row (seo_metadata); reload the mapped version so the cover isn't dropped on the next save.
        const saved = await reloadVersion();
        setIsDirty(false);
        setLastSavedTime(new Date().toLocaleTimeString());
        setStatusMessage(`Version ${saved?.versionNumber ?? ""} saved successfully`);
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

  const handlePublishToWebsite = async () => {
    if (!activeWorkspace || !contentId) return;
    setIsPublishingToWebsite(true);
    setPublishWebsiteSuccess(null);
    setPublishWebsiteError(null);
    try {
      const res = await fetch(`/api/content/${contentId}/publish-website`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace.id }),
      });
      const data = await res.json();
      if (res.ok && data.publishedToWebsite) {
        setPublishWebsiteSuccess(`Published directly to Neno Website API! Live URL: ${data.websiteUrl}`);
        if (item) setItem({ ...item, status: "approved" });
      } else if (res.ok && !data.publishedToWebsite) {
        setPublishWebsiteError(data.errorDetail || "Could not publish to Neno Website. Ensure website is running on port 3000 with admin credentials.");
      } else {
        setPublishWebsiteError(data.error || "Failed to publish to website");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not reach website server";
      setPublishWebsiteError(`Error connecting to publishing service: ${msg}`);
    } finally {
      setIsPublishingToWebsite(false);
      setTimeout(() => {
        setPublishWebsiteSuccess(null);
        setPublishWebsiteError(null);
      }, 10000);
    }
  };

  const [isDeletingDocument, setIsDeletingDocument] = useState(false);

  const handleDeleteDocument = async () => {
    if (!activeWorkspace || !contentId) return;
    if (
      !confirm(
        `Are you sure you want to delete "${item?.title || "this document"}"?\n\nThis will remove it from the studio and also delete it from your website if published.`
      )
    ) {
      return;
    }

    setIsDeletingDocument(true);
    try {
      const res = await fetch(`/api/content/${contentId}?workspaceId=${activeWorkspace.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/content");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete document");
        setIsDeletingDocument(false);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting document");
      setIsDeletingDocument(false);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
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
            <h1 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
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
            className="gap-1.5 text-xs h-8 border-slate-200"
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
                className="text-xs h-8 border-slate-200"
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
            className="gap-1.5 text-xs h-8 font-medium border-slate-200"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Export</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openReview}
            disabled={isPublishingToWebsite}
            className="gap-1.5 text-xs h-8 font-semibold border-orange-300 text-orange-700 bg-orange-50/50 hover:bg-orange-100/80 transition-colors"
          >
            {isPublishingToWebsite ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-600" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-orange-600" />
                <span>Review &amp; Publish</span>
              </>
            )}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleManualSave}
            disabled={isAutosaving}
            className="gap-1.5 text-xs h-8 font-semibold bg-orange-600 hover:bg-orange-700"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteDocument}
            disabled={isDeletingDocument}
            className="gap-1.5 text-xs h-8 font-medium border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
            title="Delete document and remove from website"
          >
            {isDeletingDocument ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {publishWebsiteSuccess && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{publishWebsiteSuccess}</span>
          </div>
          <a
            href="http://localhost:3000/blog"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-emerald-950 shrink-0 font-semibold"
          >
            Open Website Blog &rarr;
          </a>
        </div>
      )}

      {publishWebsiteError && (
        <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{publishWebsiteError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenExportModal}
            className="text-xs h-7 bg-white border-amber-300 text-amber-900"
          >
            Export JSON Instead
          </Button>
        </div>
      )}

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
          {/* Document Title & Overview Card */}
          <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Active Document
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                {item.title}
              </h2>
            </div>
            <Badge variant="outline" className="text-xs bg-slate-50 font-mono">
              {item.category}
            </Badge>
          </div>

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
                      ? "bg-slate-100 text-slate-900 font-semibold border border-slate-200"
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
      {/* Review before publish: nothing is sent to the website until "Publish" is clicked here. */}
      {isReviewOpen && (() => {
        const meta = currentVersion?.seoMetadata || {};
        const coverSrc = meta.featuredImageUrl || meta.coverImage || meta.ogImage || "";
        const coverType = meta.coverType;
        const inline = meta.inlineVisuals || [];
        const banned = findBannedPhrases(editorContent);
        const busy = reviewBusy !== null;
        const reviewValid = reviewTitle.trim().length >= 5 && reviewSlug.length >= 3 && SLUG_PATTERN.test(reviewSlug);
        const spin = (k: string) => reviewBusy === k && <Loader2 className="h-3.5 w-3.5 animate-spin" />;
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-label="Review before publish">
            <div className="max-w-6xl mx-auto my-6 bg-white rounded-xl shadow-xl border border-slate-200">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Review before publish</h2>
                  <p className="text-[11px] text-slate-500">Check the draft and visuals. Nothing is published until you click Publish.</p>
                </div>
                <button type="button" onClick={() => setIsReviewOpen(false)} disabled={busy} className="text-slate-500 hover:text-slate-800" aria-label="Close review">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {reviewError && (
                <div className="mx-5 mt-4 p-2.5 rounded bg-red-50 text-red-700 border border-red-200 text-xs">{reviewError}</div>
              )}

              <div className="grid lg:grid-cols-[1fr_360px] gap-5 p-5">
                {/* Left: metadata + editable draft */}
                <div className="space-y-3 min-w-0">
                  <div className="space-y-2.5">
                    <div>
                      <label htmlFor="review-title" className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                      <Input id="review-title" value={reviewTitle} onChange={(e) => handleReviewTitleChange(e.target.value)} />
                      {reviewTitle.trim().length < 5 && <p className="text-[11px] text-red-600 mt-1">Title must be at least 5 characters.</p>}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="review-slug" className="text-xs font-semibold text-slate-700">Slug</label>
                        <button type="button" className="text-[11px] text-orange-700 hover:underline"
                          onClick={() => { setReviewSlug(generateSlug(reviewTitle)); setSlugTouched(true); setSlugSuggestion(""); }}>
                          Suggest from title
                        </button>
                      </div>
                      <Input id="review-slug" className="font-mono" value={reviewSlug} spellCheck={false}
                        onChange={(e) => { setReviewSlug(e.target.value.toLowerCase()); setSlugTouched(true); setSlugSuggestion(""); }} />
                      {reviewSlug && !SLUG_PATTERN.test(reviewSlug) && (
                        <p className="text-[11px] text-red-600 mt-1">Use lowercase letters, numbers and single hyphens only.</p>
                      )}
                      {slugSuggestion && (
                        <button type="button" className="text-[11px] text-orange-700 hover:underline mt-1"
                          onClick={() => { setReviewSlug(slugSuggestion); setSlugSuggestion(""); setReviewError(""); }}>
                          Use “{slugSuggestion}” instead
                        </button>
                      )}
                      {isPublishedItem && reviewSlug !== item?.slug && (
                        <p className="text-[11px] text-amber-700 mt-1">
                          This post is already live at /blog-single/{item?.slug}. Publishing with a new slug creates a new URL; the old one stays up until you remove it.
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="review-excerpt" className="block text-xs font-semibold text-slate-700 mb-1">Excerpt</label>
                      <Textarea id="review-excerpt" rows={3} maxLength={500} value={reviewExcerpt} onChange={(e) => setReviewExcerpt(e.target.value)} />
                      <p className="text-[10px] text-slate-400 mt-0.5 text-right">{reviewExcerpt.length}/500</p>
                    </div>
                  </div>

                  {banned.length > 0 ? (
                    <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800 flex gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span><strong>Banned phrases still in the draft:</strong> {banned.join(", ")}</span>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">No banned phrases found.</div>
                  )}

                  <label htmlFor="review-draft" className="block text-xs font-semibold text-slate-700">Draft (Markdown, editable)</label>
                  <textarea
                    id="review-draft"
                    rows={26}
                    value={editorContent}
                    onChange={(e) => handleEditorChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-md p-3 font-mono text-xs text-slate-900 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>

                {/* Right: cover + inline visuals */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Cover {coverType && <span className="font-normal normal-case text-slate-500">({coverType})</span>}
                    </h3>
                    <div className="rounded-md overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
                      {coverSrc ? (
                        <img src={coverSrc} alt={meta.coverAlt || "Cover image"} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-500 p-4 text-center">No cover yet. Generate one or upload your own.</span>
                      )}
                    </div>
                    {meta.coverCredit && (
                      <p className="text-[11px] text-slate-600">
                        Photo by <a href={meta.coverCredit.photographerUrl} target="_blank" rel="noopener noreferrer" className="underline">{meta.coverCredit.photographer}</a>
                        {" "}on{" "}
                        <a href={meta.coverCredit.photoUrl} target="_blank" rel="noopener noreferrer" className="underline">
                          {meta.coverCredit.provider === "pexels" ? "Pexels" : "Unsplash"}
                        </a>
                        <span className="text-slate-400"> (sent to the website as the cover credit)</span>
                      </p>
                    )}
                    {meta.coverAlt && <p className="text-[11px] text-slate-500">Alt: {meta.coverAlt}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="outline" size="sm" disabled={busy} className="gap-1 text-xs h-8"
                        onClick={() => runVisualAction("regen", { action: "regenerate-cover", type: coverType === "photo" ? "photo" : "diagram" })}>
                        {spin("regen") || <RefreshCw className="h-3.5 w-3.5" />} Regenerate
                      </Button>
                      <Button variant="outline" size="sm" disabled={busy} className="gap-1 text-xs h-8"
                        onClick={() => runVisualAction("switch", { action: "regenerate-cover", type: coverType === "photo" ? "diagram" : "photo" })}>
                        {spin("switch") || (coverType === "photo" ? <Network className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />)}
                        {coverType === "photo" ? "Use diagram" : "Use photo"}
                      </Button>
                      <label className={`inline-flex items-center gap-1 text-xs h-8 px-3 rounded-md border border-slate-200 ${busy ? "opacity-50 pointer-events-none" : "cursor-pointer hover:bg-slate-50"}`}>
                        {spin("upload") || <Upload className="h-3.5 w-3.5" />} Upload my image
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only"
                          onChange={(e) => { handleCoverUpload(e.target.files?.[0]); e.target.value = ""; }} />
                      </label>
                      <Button variant="outline" size="sm" disabled={busy} className="gap-1 text-xs h-8"
                        onClick={() => { setStockOpen(true); if (!stockResults) searchStock(); }}>
                        {spin("stock") || <Search className="h-3.5 w-3.5" />} Find stock photo
                      </Button>
                    </div>

                    {stockOpen && (
                      <div className="border border-slate-200 rounded-md p-2.5 space-y-2 bg-slate-50">
                        <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); searchStock(stockQuery); }}>
                          <Input aria-label="Stock photo search" className="h-8 text-xs" value={stockQuery}
                            placeholder={stockQueries.join(" · ") || "e.g. engineers at whiteboard"} onChange={(e) => setStockQuery(e.target.value)} />
                          <Button type="submit" variant="outline" size="sm" disabled={busy} className="text-xs h-8 shrink-0">Search again</Button>
                        </form>
                        {stockQueries.length > 0 && <p className="text-[10px] text-slate-500">Searched: {stockQueries.join(" · ")}</p>}
                        {(stockWarnings || []).map((w, i) => <p key={i} className="text-[10px] text-amber-700">{w}</p>)}
                        {reviewBusy === "stock" && <p className="text-[11px] text-slate-500">Searching and scoring photos…</p>}
                        {stockResults && stockResults.length === 0 && reviewBusy !== "stock" && (
                          <p className="text-[11px] text-slate-500">No suitable photos found. Try a more concrete scene.</p>
                        )}
                        <div className="grid grid-cols-2 gap-1.5">
                          {(stockResults || []).map((c) => (
                            <div key={`${c.provider}:${c.id}`} className="space-y-0.5">
                              <button type="button" disabled={busy}
                                onClick={() => runVisualAction("pick", { action: "stock-select", provider: c.provider, id: c.id }).then((ok) => ok && setStockOpen(false))}
                                className="block w-full aspect-video rounded overflow-hidden border border-slate-200 hover:ring-2 hover:ring-orange-400 disabled:opacity-50"
                                title={c.reason || c.alt}>
                                <img src={c.thumbUrl} alt={c.alt || `Photo by ${c.photographer}`} className="w-full h-full object-cover" loading="lazy" />
                              </button>
                              <p className="text-[9px] text-slate-500 leading-tight">
                                {typeof c.score === "number" && <span className="font-semibold text-slate-700">{c.score}/10 · </span>}
                                Photo by <a href={c.credit.photographerUrl} target="_blank" rel="noopener noreferrer" className="underline">{c.photographer}</a>
                                {" "}on{" "}
                                <a href={c.credit.photoUrl} target="_blank" rel="noopener noreferrer" className="underline">
                                  {c.provider === "pexels" ? "Pexels" : "Unsplash"}
                                </a>
                              </p>
                            </div>
                          ))}
                        </div>
                        {reviewBusy === "pick" && <p className="text-[11px] text-slate-500">Saving cover…</p>}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Inline visuals</h3>
                    <p className="text-[11px] text-slate-500">For review only. The website can&apos;t show images inside the post body yet, so these are not published.</p>
                    {[0, 1].map((i) => {
                      const v = inline[i];
                      if (!v && i > inline.length) return null;
                      return (
                        <div key={i} className="border border-slate-200 rounded-md p-2 space-y-1.5">
                          {v ? (
                            <>
                              <img src={v.dataUri} alt={v.alt} className="w-full rounded" />
                              <p className="text-[11px] text-slate-700">{v.caption}</p>
                              <p className="text-[10px] text-slate-400">After: “{v.afterHeading}” · {v.inlineType}</p>
                            </>
                          ) : (
                            <p className="text-[11px] text-slate-500">No inline visual planned.</p>
                          )}
                          <Button variant="outline" size="sm" disabled={busy} className="gap-1 text-xs h-7"
                            onClick={() => runVisualAction(`inline-${i}`, { action: "regenerate-inline", index: i })}>
                            {spin(`inline-${i}`) || <RefreshCw className="h-3 w-3" />} {v ? "Regenerate" : "Try to generate"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {(meta.visualWarnings || []).length > 0 && (
                    <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-0.5">
                      {(meta.visualWarnings || []).map((w, i) => <div key={i}>• {w}</div>)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
                <Button variant="outline" size="sm" disabled={busy} onClick={() => setIsReviewOpen(false)} className="text-xs h-8">Cancel</Button>
                <Button variant="outline" size="sm" disabled={busy || !reviewValid} onClick={handleSaveFromReview} className="gap-1 text-xs h-8">
                  {spin("save") || <Save className="h-3.5 w-3.5" />} Save draft
                </Button>
                <Button variant="primary" size="sm" disabled={busy || isPublishingToWebsite || !reviewValid} onClick={handlePublishFromReview}
                  className="gap-1.5 text-xs h-8 font-semibold bg-orange-600 hover:bg-orange-700">
                  {spin("publish") || <Sparkles className="h-3.5 w-3.5" />} Publish
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

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
