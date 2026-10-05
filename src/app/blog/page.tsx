"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  SlidersHorizontal,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Copy,
  Send,
  ArrowUpDown,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ExternalLink,
  Layers,
  Sparkles,
  Loader2,
  X,
  Globe,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ContentItem } from "@/types";

interface BlogStats {
  total: number;
  published: number;
  drafts: number;
  scheduled: number;
}

export default function BlogManagementPage() {
  const router = useRouter();
  const { activeWorkspace } = useAuth();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<BlogStats>({ total: 0, published: 0, drafts: 0, scheduled: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Modals & Feedback
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [websiteModalOpen, setWebsiteModalOpen] = useState(false);
  const [websiteBlogs, setWebsiteBlogs] = useState<Array<{ id: string; title: string; slug: string; category?: string }>>([]);
  const [isLoadingWebsiteBlogs, setIsLoadingWebsiteBlogs] = useState(false);
  const [isSyncingWebsite, setIsSyncingWebsite] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const fetchBlogs = useCallback(async () => {
    if (!activeWorkspace) return;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        workspaceId: activeWorkspace.id,
        status: statusFilter,
        category: categoryFilter,
        search: searchQuery,
        sort: sortBy,
      });
      const res = await fetch(`/api/admin/blogs?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setStats(data.stats || { total: 0, published: 0, drafts: 0, scheduled: 0 });
      }
    } catch (err) {
      console.error("Failed to load blogs:", err);
      showToast("Failed to load blogs from workspace", "error");
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace, statusFilter, categoryFilter, searchQuery, sortBy]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  // Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(items.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const isAllSelected = items.length > 0 && selectedIds.length === items.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < items.length;

  // Single & Bulk Actions
  const handleSinglePublish = async (item: ContentItem) => {
    try {
      const res = await fetch("/api/admin/blogs/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace?.id, id: item.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`"${item.title}" published directly to website!`);
        fetchBlogs();
      } else {
        showToast(data.error || "Failed to publish blog", "error");
      }
    } catch {
      showToast("Error connecting to website publish API", "error");
    }
  };

  const handleSingleUnpublish = async (item: ContentItem) => {
    try {
      const res = await fetch("/api/admin/blogs/unpublish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace?.id, id: item.id }),
      });
      if (res.ok) {
        showToast(`"${item.title}" moved to draft status`);
        fetchBlogs();
      }
    } catch {
      showToast("Failed to unpublish blog", "error");
    }
  };

  const handleSingleDuplicate = async (item: ContentItem) => {
    try {
      const res = await fetch("/api/admin/blogs/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace?.id, id: item.id }),
      });
      if (res.ok) {
        showToast(`Duplicated "${item.title}"`);
        fetchBlogs();
      }
    } catch {
      showToast("Failed to duplicate blog", "error");
    }
  };

  const handleSingleDelete = async (item: ContentItem) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?\n\nThis will also remove it from the live website.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/blogs/${item.id}?workspaceId=${activeWorkspace?.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Moved "${item.title}" to Trash (7-day recovery)`);
        setSelectedIds((prev) => prev.filter((id) => id !== item.id));
        fetchBlogs();
      }
    } catch {
      showToast("Failed to delete blog", "error");
    }
  };

  // Bulk Actions
  const handleBulkPublishConfirm = async () => {
    setIsProcessingBulk(true);
    try {
      const res = await fetch("/api/admin/blogs/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace?.id, ids: selectedIds }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`${data.publishedCount} blog(s) published successfully to the website!`);
        setSelectedIds([]);
        setPublishModalOpen(false);
        fetchBlogs();
      } else {
        showToast(data.error || "Bulk publishing encountered issues", "error");
      }
    } catch {
      showToast("Error processing bulk publishing", "error");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkUnpublish = async () => {
    if (!confirm(`Unpublish ${selectedIds.length} selected blog(s)?`)) return;
    setIsProcessingBulk(true);
    try {
      const res = await fetch("/api/admin/blogs/unpublish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace?.id, ids: selectedIds }),
      });
      if (res.ok) {
        showToast(`${selectedIds.length} blog(s) unpublished`);
        setSelectedIds([]);
        fetchBlogs();
      }
    } catch {
      showToast("Bulk unpublish failed", "error");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    setIsProcessingBulk(true);
    try {
      for (const id of selectedIds) {
        await fetch(`/api/admin/blogs/${id}?workspaceId=${activeWorkspace?.id}`, { method: "DELETE" });
      }
      showToast(`${selectedIds.length} blog(s) moved to Trash (7-day recovery)`);
      setSelectedIds([]);
      setDeleteModalOpen(false);
      fetchBlogs();
    } catch {
      showToast("Failed to delete all selected blogs", "error");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const fetchWebsiteBlogs = async () => {
    if (!activeWorkspace) return;
    setIsLoadingWebsiteBlogs(true);
    try {
      const res = await fetch(`/api/admin/blogs/sync-website?workspaceId=${activeWorkspace.id}`);
      if (res.ok) {
        const data = await res.json();
        setWebsiteBlogs(data.websiteBlogs || []);
      }
    } catch {
      showToast("Could not connect to live website", "error");
    } finally {
      setIsLoadingWebsiteBlogs(false);
    }
  };

  const handleImportFromWebsite = async () => {
    if (!activeWorkspace) return;
    setIsSyncingWebsite(true);
    try {
      const res = await fetch("/api/admin/blogs/sync-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace.id, action: "import" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Imported blogs successfully");
        fetchBlogs();
        fetchWebsiteBlogs();
      } else {
        showToast(data.error || "Failed to import from website", "error");
      }
    } catch {
      showToast("Network error importing website blogs", "error");
    } finally {
      setIsSyncingWebsite(false);
    }
  };

  const handleDeleteFromWebsiteSingle = async (wb: { id: string; slug: string; title: string }) => {
    if (!confirm(`Delete "${wb.title}" directly from the live website?`)) return;
    setIsSyncingWebsite(true);
    try {
      const res = await fetch("/api/admin/blogs/sync-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspace?.id,
          action: "delete-from-website",
          ids: [wb.id],
          slugs: [wb.slug],
          titles: [wb.title],
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Deleted "${wb.title}" from live website!`);
        fetchWebsiteBlogs();
      } else {
        showToast(data.error || "Failed to delete from website", "error");
      }
    } catch {
      showToast("Error communicating with website", "error");
    } finally {
      setIsSyncingWebsite(false);
    }
  };

  const handlePurgeAllWebsite = async () => {
    if (!confirm("⚠️ WARNING: This will delete ALL published articles from the live website (localhost:3000). Are you sure?")) {
      return;
    }
    setIsSyncingWebsite(true);
    try {
      const res = await fetch("/api/admin/blogs/sync-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace?.id, action: "purge-all-website" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Website purged successfully");
        fetchWebsiteBlogs();
      } else {
        showToast(data.error || "Failed to purge website", "error");
      }
    } catch {
      showToast("Error purging website blogs", "error");
    } finally {
      setIsSyncingWebsite(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "published":
      case "exported":
        return <Badge variant="success">Published</Badge>;
      case "in_review":
        return <Badge variant="warning">Scheduled</Badge>;
      case "generating":
        return <Badge variant="primary">Generating</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-lg shadow-lg border flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === "success"
              ? "bg-emerald-900 text-white border-emerald-700"
              : "bg-rose-900 text-white border-rose-700"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Blog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, manage, edit and publish your website articles.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Website Sync & Clean Tool */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setWebsiteModalOpen(true);
              fetchWebsiteBlogs();
            }}
            className="gap-1.5 h-9 text-xs font-semibold border-slate-300 text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
          >
            <Globe className="h-3.5 w-3.5 text-emerald-600" />
            <span>Website Sync & Clean</span>
          </Button>

          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPublishModalOpen(true)}
              className="gap-1.5 h-9 text-xs font-semibold border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Publish Selected ({selectedIds.length})</span>
            </Button>
          )}

          <Link href="/blog/create">
            <Button variant="primary" size="default" className="gap-1.5 h-9 font-semibold text-xs shadow-sm">
              <Plus className="h-4 w-4" />
              <span>+ Create Blog</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 border-slate-200 shadow-none hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Blogs</span>
            <FileText className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
            <span className="text-[11px] text-slate-400 font-medium">Articles in library</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 shadow-none border-l-4 border-l-emerald-500 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Published</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{stats.published}</span>
            <span className="text-[11px] text-slate-400 font-medium">Live on website</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 shadow-none hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Drafts</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.drafts}</span>
            <span className="text-[11px] text-slate-400 font-medium">In progress</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 shadow-none border-l-4 border-l-amber-500 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Scheduled</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{stats.scheduled}</span>
            <span className="text-[11px] text-slate-400 font-medium">Queued release</span>
          </div>
        </Card>
      </div>

      {/* Toolbar: Search, Filters & Sort */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search blogs by title, category, or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs bg-white border-slate-200"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-32">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 text-xs"
            >
              <option value="all">All Status</option>
              <option value="approved">Published</option>
              <option value="draft">Draft</option>
              <option value="in_review">Scheduled</option>
            </Select>
          </div>

          <div className="w-36">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 text-xs"
            >
              <option value="all">All Categories</option>
              <option value="AI">AI & Machine Learning</option>
              <option value="Technology">Technology</option>
              <option value="Business">Business</option>
              <option value="Engineering">Engineering</option>
              <option value="Research">Research</option>
            </Select>
          </div>

          <div className="w-36">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 text-xs"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="az">A-Z</option>
              <option value="za">Z-A</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-30 flex items-center justify-between p-3 px-4 bg-slate-900 text-white rounded-lg shadow-lg border border-slate-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="bg-orange-500 text-white font-bold px-2 py-0.5 rounded text-[11px]">
              {selectedIds.length}
            </span>
            <span>blog(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPublishModalOpen(true)}
              disabled={isProcessingBulk}
              className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700 hover:text-white"
            >
              <Send className="h-3.5 w-3.5 mr-1 text-orange-400" />
              <span>Publish</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkUnpublish}
              disabled={isProcessingBulk}
              className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700 hover:text-white"
            >
              <span>Unpublish</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
              disabled={isProcessingBulk}
              className="h-7 text-xs bg-rose-950 border-rose-800 text-rose-200 hover:bg-rose-900 hover:text-white"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              <span>Delete</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-7 text-xs text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Blog Management Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
              <span>Loading blog library...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center">
              <FileText className="h-10 w-10 mx-auto text-slate-300" />
              <h3 className="mt-3 text-sm font-semibold text-slate-800">No blogs found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                  ? "No blogs match your filter criteria. Try resetting filters."
                  : "Get started by creating your first blog article."}
              </p>
              <Link href="/blog/create" className="inline-block mt-4">
                <Button variant="primary" size="sm" className="h-8 text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Blog</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={isAllSelected}
                        indeterminate={isIndeterminate}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="min-w-[320px]">Blog</TableHead>
                    <TableHead className="w-40">Category</TableHead>
                    <TableHead className="w-32">Author</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-32">Published Date</TableHead>
                    <TableHead className="w-28">Updated</TableHead>
                    <TableHead className="w-16 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const isPublished = item.status === "approved" || item.status === "exported";

                    return (
                      <TableRow
                        key={item.id}
                        className={isSelected ? "bg-orange-50/40" : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) => handleSelectOne(item.id, c)}
                          />
                        </TableCell>

                        {/* Blog Column: Thumbnail + Title + Excerpt + Slug */}
                        <TableCell>
                          <div className="flex items-start gap-3 py-1">
                            <div className="h-10 w-14 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden text-[10px] text-slate-400 font-mono">
                              <FileText className="h-4 w-4 text-slate-400" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <Link
                                href={`/blog/${item.id}/edit`}
                                className="text-xs font-semibold text-slate-900 hover:text-orange-600 transition-colors line-clamp-1 block"
                              >
                                {item.title}
                              </Link>
                              <p className="text-[11px] text-slate-500 line-clamp-1">
                                {item.excerpt || "No description"}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono block truncate">
                                /{item.slug}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Category */}
                        <TableCell className="text-xs text-slate-600 font-medium">
                          {item.category}
                        </TableCell>

                        {/* Author */}
                        <TableCell className="text-xs text-slate-600">
                          {((item as unknown as { created_by?: string }).created_by || item.createdBy || "").includes("mit") ? "Mit Patel" : "Neno AI Lab"}
                        </TableCell>

                        {/* Status */}
                        <TableCell>{getStatusBadge(item.status)}</TableCell>

                        {/* Published Date */}
                        <TableCell className="text-xs text-slate-500">
                          {new Date(item.createdAt || (item as unknown as { created_at?: string }).created_at || Date.now()).toLocaleDateString()}
                        </TableCell>

                        {/* Updated */}
                        <TableCell className="text-xs text-slate-500">
                          {new Date(item.updatedAt || (item as unknown as { updated_at?: string }).updated_at || Date.now()).toLocaleDateString()}
                        </TableCell>

                        {/* 3-Dot Action Menu */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Blog Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => router.push(`/blog/${item.id}/edit`)}>
                                <Edit className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                <span>Edit Article</span>
                              </DropdownMenuItem>

                              {isPublished && (
                                <DropdownMenuItem
                                  onClick={() => window.open(`http://localhost:3000/blog-single/${item.slug}`, "_blank")}
                                >
                                  <ExternalLink className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                  <span>View on Website</span>
                                </DropdownMenuItem>
                              )}

                              {!isPublished ? (
                                <DropdownMenuItem onClick={() => handleSinglePublish(item)}>
                                  <Send className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                                  <span className="text-emerald-700 font-medium">Publish to Website</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleSingleUnpublish(item)}>
                                  <Clock className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                  <span>Unpublish (Draft)</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem onClick={() => handleSingleDuplicate(item)}>
                                <Copy className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                <span>Duplicate</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                destructive
                                onClick={() => handleSingleDelete(item)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Publish Modal */}
      <Dialog open={publishModalOpen} onOpenChange={setPublishModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Publish Blogs to Website
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              You are about to publish {selectedIds.length} blog(s) to the live Neno website. Next.js ISR caches will be purged immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded border border-slate-200 text-xs">
            {selectedItems.map((it) => (
              <div key={it.id} className="flex items-center gap-2 text-slate-700 py-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="truncate font-medium">{it.title}</span>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPublishModalOpen(false)}
              disabled={isProcessingBulk}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkPublishConfirm}
              disabled={isProcessingBulk}
              className="gap-1.5 font-semibold bg-orange-600 hover:bg-orange-700"
            >
              {isProcessingBulk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>Publish {selectedIds.length} Blog(s)</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-900">
              Delete Selected Blogs
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to permanently delete {selectedIds.length} selected blog(s)? This will also remove them from the live website database.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-rose-50 rounded border border-rose-200 text-xs text-rose-800">
            {selectedItems.map((it) => (
              <div key={it.id} className="flex items-center gap-2 py-1">
                <Trash2 className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                <span className="truncate font-medium">{it.title}</span>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isProcessingBulk}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDeleteConfirm}
              disabled={isProcessingBulk}
              className="gap-1.5 font-semibold"
            >
              {isProcessingBulk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Delete {selectedIds.length} Blog(s)</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Website Sync & Clean Dialog */}
      <Dialog open={websiteModalOpen} onOpenChange={setWebsiteModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-emerald-600" />
                <DialogTitle className="text-base font-bold text-slate-900">
                  Live Website Synchronization (localhost:3000)
                </DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchWebsiteBlogs}
                disabled={isLoadingWebsiteBlogs}
                className="h-7 text-xs gap-1 text-slate-600"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingWebsiteBlogs ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Directly view, import, or purge blogs currently stored in your live Next.js website&apos;s database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <span className="text-xs font-semibold text-slate-900 block">
                  {isLoadingWebsiteBlogs ? "Scanning website..." : `${websiteBlogs.length} Articles Live on Website`}
                </span>
                <span className="text-[11px] text-slate-500">
                  Import them into Content Studio or purge outdated records.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleImportFromWebsite}
                  disabled={isSyncingWebsite || websiteBlogs.length === 0}
                  className="h-8 text-xs font-semibold gap-1.5 bg-white border-slate-300 text-slate-800 hover:bg-slate-50"
                >
                  {isSyncingWebsite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5 text-orange-600" />}
                  <span>Import All to Studio</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handlePurgeAllWebsite}
                  disabled={isSyncingWebsite || websiteBlogs.length === 0}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Purge All Website</span>
                </Button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {isLoadingWebsiteBlogs ? (
                <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                  <span>Loading website articles...</span>
                </div>
              ) : websiteBlogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No blogs found on live website.
                </div>
              ) : (
                websiteBlogs.map((wb) => (
                  <div key={wb.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {wb.title}
                        </span>
                        {wb.category && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 border-slate-200">
                            {wb.category}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 truncate block">
                        /{wb.slug}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFromWebsiteSingle(wb)}
                      disabled={isSyncingWebsite}
                      className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 shrink-0 font-medium"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete from Website</span>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWebsiteModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
