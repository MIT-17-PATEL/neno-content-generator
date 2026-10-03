"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Trash2,
  Eye,
  FileText,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
        return <Badge variant="secondary">Draft</Badge>;
      case "generating":
        return <Badge variant="primary">Generating</Badge>;
      case "in_review":
        return <Badge variant="warning">In Review</Badge>;
      case "approved":
      case "exported":
        return <Badge variant="success">Published</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Content Library
            </h1>
            <Badge variant="outline" className="text-xs font-mono">{items.length} items</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage, edit, and export articles in {activeWorkspace?.name || "Workspace"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="default"
            onClick={() => setIsModalOpen(true)}
            className="gap-1.5 h-9 font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>New Content Item</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or excerpt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-md p-0.5">
            {["all", "blog", "case-study"].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  selectedType === t
                    ? "bg-white text-slate-900 shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t === "all" ? "All Types" : t === "blog" ? "Blogs" : "Case Studies"}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="exported">Exported</option>
          </select>
        </div>
      </div>

      {/* Content Data Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading content library...</div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-sm font-semibold text-slate-800">No content items found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || selectedType !== "all" || selectedStatus !== "all"
                  ? "No items matched your current filter criteria."
                  : "Create your first article or case study to build your content repository."}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="mt-4 gap-1.5 h-8 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Content Item</span>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs text-slate-400 font-mono">
                      {(idx + 1).toString().padStart(2, "0")}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900">
                        <Link
                          href={`/content/${item.id}`}
                          className="hover:text-orange-600 transition-colors line-clamp-1"
                        >
                          {item.title}
                        </Link>
                      </div>
                      {item.excerpt && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {item.excerpt}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 capitalize">
                      {item.type.replace("-", " ")}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-medium">
                      {item.category}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(item.updatedAt || Date.now()).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/content/${item.id}`}>
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
                            <Eye className="h-3.5 w-3.5 mr-1 text-slate-500" />
                            <span>Edit</span>
                          </Button>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.title)}
                          title="Delete document"
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Content Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent onClose={() => setIsModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>New Content Item</DialogTitle>
            <DialogDescription>
              Initialize a manual draft in {activeWorkspace?.name || "Workspace"}
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleCreateDraft} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewType("blog")}
                  className={`p-2 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    newType === "blog"
                      ? "bg-orange-50 border-orange-500 text-orange-700 font-semibold"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Blog Post</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewType("case-study")}
                  className={`p-2 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    newType === "case-study"
                      ? "bg-orange-50 border-orange-500 text-orange-700 font-semibold"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Case Study</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Title
              </label>
              <Input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Scaling Distributed Event Pipelines with Kafka"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category
              </label>
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g., Cloud Architecture, AI"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Excerpt (Optional)
              </label>
              <Textarea
                rows={2}
                value={newExcerpt}
                onChange={(e) => setNewExcerpt(e.target.value)}
                placeholder="Brief summary of the article..."
              />
            </div>

            <DialogFooter>
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
                className="font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Draft"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
