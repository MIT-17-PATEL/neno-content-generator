"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  TrendingUp,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Filter,
  Layers,
  Sparkles,
  Clock,
  CheckCircle,
  Eye,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentItem, ContentType, ContentStatus } from "@/types";

export default function ContentLibraryPage() {
  const { activeWorkspace } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<ContentType>("blog");
  const [newCategory, setNewCategory] = useState("Technology");
  const [newExcerpt, setNewExcerpt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchContent = useCallback(async () => {
    if (!activeWorkspace) return;
    setIsLoading(true);
    try {
      let url = `/api/content?workspaceId=${activeWorkspace.id}`;
      if (selectedType !== "all") url += `&type=${selectedType}`;
      if (selectedStatus !== "all") url += `&status=${selectedStatus}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("Fetch content error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace, selectedType, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !newTitle.trim()) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          type: newType,
          title: newTitle,
          category: newCategory,
          excerpt: newExcerpt,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewTitle("");
        setNewExcerpt("");
        fetchContent();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to create content draft");
      }
    } catch {
      setErrorMessage("Network error creating draft");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!activeWorkspace) return;
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/content/${id}?workspaceId=${activeWorkspace.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems(items.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const getStatusBadge = (status: ContentStatus) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "generating":
        return <Badge variant="info">Generating...</Badge>;
      case "in_review":
        return <Badge variant="warning">In Review</Badge>;
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "exported":
        return <Badge variant="default">Exported</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-studio-800/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Content Library
            </h1>
            <Badge variant="outline">{items.length} items</Badge>
          </div>
          <p className="text-sm text-studio-400">
            Manage blogs, case studies, status workflows, and version histories in <strong>{activeWorkspace?.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Content Item</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-studio-900/40 border border-studio-800/80 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-studio-500" />
          <input
            type="text"
            placeholder="Search by title or excerpt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-studio-950 border border-studio-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center bg-studio-950 border border-studio-800 rounded-lg p-1">
            <button
              onClick={() => setSelectedType("all")}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                selectedType === "all"
                  ? "bg-studio-800 text-white"
                  : "text-studio-400 hover:text-studio-200"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setSelectedType("blog")}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                selectedType === "blog"
                  ? "bg-brand-600/30 text-brand-300"
                  : "text-studio-400 hover:text-studio-200"
              }`}
            >
              Blogs
            </button>
            <button
              onClick={() => setSelectedType("case-study")}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                selectedType === "case-study"
                  ? "bg-emerald-600/30 text-emerald-300"
                  : "text-studio-400 hover:text-studio-200"
              }`}
            >
              Case Studies
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-studio-950 border border-studio-800 rounded-lg px-3 py-1.5 text-xs text-studio-300 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="exported">Exported</option>
          </select>
        </div>
      </div>

      {/* Content Table / List */}
      {isLoading ? (
        <Card className="p-12 text-center text-studio-400 text-sm">
          Loading workspace content items...
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-16 border-dashed border-studio-800 text-center">
          <Layers className="h-10 w-10 text-studio-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No content items found</h3>
          <p className="text-xs text-studio-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedType !== "all" || selectedStatus !== "all"
              ? "No articles matched your active filters. Try adjusting your search query."
              : "Get started by creating a new manual draft or initiating an autonomous generation workflow."}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="mt-4 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create First Item</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-studio-800/80 bg-studio-900/60 hover:border-studio-700 transition-all gap-4"
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    item.type === "blog"
                      ? "bg-brand-950 border border-brand-800/60 text-brand-400"
                      : "bg-emerald-950 border border-emerald-800/60 text-emerald-400"
                  }`}
                >
                  {item.type === "blog" ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/content/${item.id}`}
                      className="text-sm font-semibold text-white hover:text-brand-400 transition-colors truncate"
                    >
                      {item.title}
                    </Link>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-xs text-studio-400 line-clamp-1 mt-0.5">
                    {item.excerpt || "No excerpt provided."}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-studio-500 mt-1.5">
                    <span>Category: <strong className="text-studio-400">{item.category}</strong></span>
                    <span>Slug: <code className="text-studio-400">{item.slug}</code></span>
                    <span>Updated: {new Date(item.updatedAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/content/${item.id}`}>
                  <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                    <Eye className="h-3.5 w-3.5" />
                    <span>Open Editor</span>
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id, item.title)}
                  title="Delete"
                  className="p-2 rounded-lg border border-studio-800 text-studio-500 hover:text-red-400 hover:bg-studio-900 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 bg-studio-900 border-studio-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Content Item</h3>
            <p className="text-xs text-studio-400 mb-4">
              Initialize a new article or case study draft in {activeWorkspace?.name}
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateDraft} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Content Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType("blog")}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                      newType === "blog"
                        ? "bg-brand-600/20 border-brand-500 text-brand-300"
                        : "border-studio-800 text-studio-400 hover:bg-studio-800"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Blog Article</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType("case-study")}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                      newType === "case-study"
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                        : "border-studio-800 text-studio-400 hover:bg-studio-800"
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>Case Study</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Scaling Distributed Event Pipelines with Kafka & Rust"
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Category
                </label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., Cloud Architecture, AI Engineering"
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Summary / Excerpt (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newExcerpt}
                  onChange={(e) => setNewExcerpt(e.target.value)}
                  placeholder="Brief synopsis of the content piece..."
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-studio-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Draft"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
