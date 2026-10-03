"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  CheckCircle,
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
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContentItem, ContentStatus, ContentVersion } from "@/types";

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;
  const { activeWorkspace } = useAuth();

  const [item, setItem] = useState<ContentItem | null>(null);
  const [currentVersion, setCurrentVersion] = useState<ContentVersion | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [sources, setSources] = useState<Array<{ id: string; url: string; title: string; publisher?: string; notes?: string }>>([]);

  const [editorContent, setEditorContent] = useState("");
  const [activeTab, setActiveTab] = useState<"editor" | "history" | "research">("editor");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
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

  const handleSaveNewVersion = async () => {
    if (!activeWorkspace || !item || !editorContent.trim()) return;
    setIsSaving(true);
    setSaveSuccess(false);

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
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Save version error:", err);
    } finally {
      setIsSaving(false);
    }
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
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-0.5">
              {item.title}
            </h1>
          </div>
        </div>

        {/* Workflow Action Bar */}
        <div className="flex items-center gap-2">
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
            variant="primary"
            size="sm"
            onClick={handleSaveNewVersion}
            disabled={isSaving}
            className="gap-1.5 text-xs"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                <span>Saved v{currentVersion?.versionNumber}</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>{isSaving ? "Saving..." : "Save Version"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-brand-950/80 border border-brand-800 text-xs text-brand-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-brand-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Center: Editor View (3 columns) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between bg-studio-900/60 border border-studio-800 px-4 py-2 rounded-t-xl">
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
            </div>

            <div className="text-[11px] text-studio-500 flex items-center gap-3">
              <span>{wordCount} words</span>
              <span>{charCount} chars</span>
              <span>v{currentVersion?.versionNumber || 1}</span>
            </div>
          </div>

          {activeTab === "editor" && (
            <div className="border border-t-0 border-studio-800 rounded-b-xl bg-studio-950 p-4">
              <textarea
                rows={22}
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                placeholder="Write or edit content markdown..."
                className="w-full bg-transparent font-mono text-xs md:text-sm text-studio-100 placeholder-studio-600 focus:outline-none resize-y leading-relaxed"
              />
            </div>
          )}

          {activeTab === "history" && (
            <Card className="border-t-0 rounded-t-none">
              <CardHeader>
                <CardTitle className="text-base">Immutable Version History</CardTitle>
                <CardDescription>
                  Every save and AI generation stage produces a permanent snapshot
                </CardDescription>
              </CardHeader>
              <div className="space-y-3">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-3.5 rounded-lg border border-studio-800 bg-studio-950/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">
                          Version {ver.versionNumber}
                        </span>
                        {ver.id === currentVersion?.id && (
                          <Badge variant="info">Current</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-studio-500 mt-0.5">
                        Saved on {new Date(ver.createdAt || Date.now()).toLocaleString()}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditorContent(ver.content);
                        setActiveTab("editor");
                      }}
                      className="text-xs"
                    >
                      Restore to Editor
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

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
                  No external research sources attached yet. Run the Research Agent pipeline in Phase 5 to retrieve grounded citations.
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
        </div>

        {/* Right Sidebar: Metadata & Workflow Status (1 column) */}
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
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
