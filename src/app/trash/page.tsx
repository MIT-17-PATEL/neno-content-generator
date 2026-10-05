"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Trash2,
  RefreshCw,
  RotateCcw,
  Search,
  AlertTriangle,
  FileText,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  MoreVertical,
  X,
  Loader2,
  ShieldAlert,
  Layers,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { DbContentItem } from "@/db/schema";

interface TrashStats {
  total: number;
  blogs: number;
  caseStudies: number;
}

export default function TrashPage() {
  const { activeWorkspace } = useAuth();

  const [items, setItems] = useState<DbContentItem[]>([]);
  const [stats, setStats] = useState<TrashStats>({ total: 0, blogs: 0, caseStudies: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<"all" | "blog" | "case-study">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("deleted_desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modals
  const [restoreModalItem, setRestoreModalItem] = useState<DbContentItem | null>(null);
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false);
  const [permDeleteModalItem, setPermDeleteModalItem] = useState<DbContentItem | null>(null);
  const [bulkPermDeleteOpen, setBulkPermDeleteOpen] = useState(false);
  const [emptyTrashModalOpen, setEmptyTrashModalOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const fetchTrashItems = useCallback(async () => {
    if (!activeWorkspace) return;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        workspaceId: activeWorkspace.id,
        type: activeTab,
        search: searchQuery,
        sort: sortBy,
      });
      const res = await fetch(`/api/admin/trash?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setStats(data.stats || { total: 0, blogs: 0, caseStudies: 0 });
      }
    } catch (err) {
      console.error("Failed to load trash items:", err);
      showToast("Failed to load Trash items", "error");
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace, activeTab, searchQuery, sortBy]);

  useEffect(() => {
    fetchTrashItems();
  }, [fetchTrashItems]);

  // Selection handlers
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

  // Single Restore
  const handleSingleRestore = async (item: DbContentItem) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/trash/${item.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace?.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `"${item.title}" restored successfully.`);
        setRestoreModalItem(null);
        setSelectedIds((prev) => prev.filter((id) => id !== item.id));
        fetchTrashItems();
      } else {
        showToast(data.error || "Failed to restore item", "error");
      }
    } catch {
      showToast("Network error while restoring item", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Restore
  const handleBulkRestoreConfirm = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/trash/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace?.id, ids: selectedIds }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `${selectedIds.length} item(s) restored successfully.`);
        setSelectedIds([]);
        setBulkRestoreOpen(false);
        fetchTrashItems();
      } else {
        showToast(data.error || "Failed to bulk restore items", "error");
      }
    } catch {
      showToast("Error processing bulk restore", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Single Permanent Delete
  const handleSinglePermanentDelete = async (item: DbContentItem) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/trash/${item.id}/permanent?workspaceId=${activeWorkspace?.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`"${item.title}" permanently deleted.`);
        setPermDeleteModalItem(null);
        setSelectedIds((prev) => prev.filter((id) => id !== item.id));
        fetchTrashItems();
      } else {
        showToast(data.error || "Failed to permanently delete item", "error");
      }
    } catch {
      showToast("Error permanently deleting item", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Permanent Delete
  const handleBulkPermanentDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/trash/permanent-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace?.id, ids: selectedIds }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `${selectedIds.length} item(s) permanently deleted.`);
        setSelectedIds([]);
        setBulkPermDeleteOpen(false);
        fetchTrashItems();
      } else {
        showToast(data.error || "Failed to permanently delete selected items", "error");
      }
    } catch {
      showToast("Error processing bulk deletion", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Empty Trash
  const handleEmptyTrashConfirm = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace?.id, action: "empty" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Trash has been completely emptied.");
        setSelectedIds([]);
        setEmptyTrashModalOpen(false);
        fetchTrashItems();
      } else {
        showToast(data.error || "Failed to empty Trash", "error");
      }
    } catch {
      showToast("Error emptying Trash", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Expiration countdown
  const getExpirationBadge = (deletedAt?: Date | string | null, permanentDeleteAt?: Date | string | null) => {
    if (!deletedAt) return <Badge variant="secondary">7 days remaining</Badge>;
    const delTime = new Date(deletedAt).getTime();
    const permTime = permanentDeleteAt ? new Date(permanentDeleteAt).getTime() : delTime + 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const diffMs = permTime - now;
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays <= 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
          <Clock className="h-3 w-3 text-rose-600" />
          <span>Expires today</span>
        </span>
      );
    }
    if (diffDays === 1) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
          <Clock className="h-3 w-3 text-amber-600" />
          <span>1 day remaining</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
        <Clock className="h-3 w-3 text-slate-400" />
        <span>{diffDays} days remaining</span>
      </span>
    );
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
          <button onClick={() => setToastMessage(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-slate-700" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Trash</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deleted content is kept for 7 days before it is permanently removed.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTrashItems}
            disabled={isLoading}
            className="gap-1.5 h-9 text-xs font-semibold border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmptyTrashModalOpen(true)}
            disabled={isLoading || stats.total === 0}
            className="gap-1.5 h-9 text-xs font-semibold text-rose-700 border-rose-300 hover:bg-rose-50 hover:border-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Empty Trash</span>
          </Button>
        </div>
      </div>

      {/* Warning Info Banner */}
      <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold block text-amber-900">
            Items in Trash are automatically permanently deleted after 7 days.
          </span>
          <span className="text-amber-800 text-[11px] block">
            Deleted items are immediately removed from your public website. Restoring an item returns it to your workspace and re-publishes it if it was previously live. Associated media assets are preserved during the recovery window.
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("blog")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "blog"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Blogs ({stats.blogs})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("case-study")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "case-study"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Case Studies ({stats.caseStudies})</span>
          </button>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2 flex-1 sm:justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search trashed content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs bg-white"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 px-2.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="deleted_desc">Deleted Date (Newest)</option>
            <option value="deleted_asc">Deleted Date (Oldest)</option>
            <option value="created_desc">Original Date (Newest)</option>
            <option value="az">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Floating/Inline Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-slate-900 text-white rounded-lg flex items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
            <span>{selectedIds.length} item(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkRestoreOpen(true)}
              disabled={isProcessing}
              className="h-8 text-xs font-semibold bg-transparent text-white border-slate-700 hover:bg-slate-800 hover:text-white gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
              <span>Restore Selected</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkPermDeleteOpen(true)}
              disabled={isProcessing}
              className="h-8 text-xs font-semibold gap-1.5 bg-rose-600 hover:bg-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Permanently</span>
            </Button>
          </div>
        </div>
      )}

      {/* Trash Table */}
      <Card className="border-slate-200 shadow-none overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="border-b border-slate-200">
              <TableHead className="w-10 px-3">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Content</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 w-28">Type</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 w-28">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 w-32">Deleted By</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 w-32">Deleted Date</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 w-36">Permanent Deletion</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    <span className="text-xs font-medium">Scanning Trash...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-8">
                    <Trash2 className="h-8 w-8 stroke-1 text-slate-300" />
                    <span className="text-sm font-semibold text-slate-700">Trash is empty</span>
                    <span className="text-xs text-slate-400 max-w-sm">
                      Items moved to trash will appear here for 7 days before being permanently removed.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isBlog = item.type === "blog";
                return (
                  <TableRow
                    key={item.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors ${
                      isSelected ? "bg-orange-50/40" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <TableCell className="px-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => handleSelectOne(item.id, Boolean(c))}
                        aria-label={`Select ${item.title}`}
                      />
                    </TableCell>

                    {/* Title & Excerpt */}
                    <TableCell className="max-w-md py-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-900 line-clamp-1">
                          {item.title}
                        </span>
                        {item.excerpt && (
                          <span className="text-[11px] text-slate-500 line-clamp-1">
                            {item.excerpt}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-400 block truncate">
                          /{item.slug}
                        </span>
                      </div>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      {isBlog ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold text-orange-700 bg-orange-50/60 border-orange-200 gap-1 py-0.5"
                        >
                          <FileText className="h-2.5 w-2.5" />
                          <span>Blog</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold text-indigo-700 bg-indigo-50/60 border-indigo-200 gap-1 py-0.5"
                        >
                          <Briefcase className="h-2.5 w-2.5" />
                          <span>Case Study</span>
                        </Badge>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {item.status === "approved" || item.status === "exported" ? (
                        <Badge variant="success" className="text-[10px] py-0">
                          Published
                        </Badge>
                      ) : item.status === "in_review" ? (
                        <Badge variant="warning" className="text-[10px] py-0">
                          Scheduled
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          Draft
                        </Badge>
                      )}
                    </TableCell>

                    {/* Deleted By */}
                    <TableCell className="text-xs text-slate-600 font-medium">
                      {item.deleted_by || "Admin"}
                    </TableCell>

                    {/* Deleted Date */}
                    <TableCell className="text-xs text-slate-500 font-medium">
                      {item.deleted_at
                        ? new Date(item.deleted_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Recently"}
                    </TableCell>

                    {/* Permanent Deletion Countdown */}
                    <TableCell>
                      {getExpirationBadge(item.deleted_at, item.permanent_delete_at)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRestoreModalItem(item)}
                          disabled={isProcessing}
                          className="h-7 px-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Restore</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs">
                            <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider">
                              Trash Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => setRestoreModalItem(item)}
                              className="text-emerald-700 font-medium cursor-pointer gap-2"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Restore to Studio</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setPermDeleteModalItem(item)}
                              className="text-rose-600 font-medium cursor-pointer gap-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete Permanently</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Single Restore Modal */}
      <Dialog open={Boolean(restoreModalItem)} onOpenChange={(open) => !open && setRestoreModalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-emerald-600" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Restore Content?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to restore &ldquo;{restoreModalItem?.title}&rdquo; from Trash?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-slate-800 block">
              Previous State: {restoreModalItem?.status === "approved" ? "Published" : "Draft"}
            </span>
            <span className="text-slate-500 text-[11px] block">
              {restoreModalItem?.status === "approved"
                ? "This item will be restored to your active workspace and automatically re-published live to your website."
                : "This item will return to your workspace as an active draft."}
            </span>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRestoreModalItem(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => restoreModalItem && handleSingleRestore(restoreModalItem)}
              disabled={isProcessing}
              className="gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              <span>Restore Item</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Restore Modal */}
      <Dialog open={bulkRestoreOpen} onOpenChange={setBulkRestoreOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-emerald-600" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Restore {selectedIds.length} Selected Items?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              All selected items will be restored from Trash to your workspace with their previous publication states.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded border border-slate-200 text-xs">
            {selectedItems.map((it) => (
              <div key={it.id} className="flex items-center gap-2 text-slate-700 py-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="truncate font-medium">{it.title}</span>
                <span className="text-[10px] text-slate-400 capitalize">({it.type})</span>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkRestoreOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkRestoreConfirm}
              disabled={isProcessing}
              className="gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              <span>Restore {selectedIds.length} Items</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Permanent Delete Modal */}
      <Dialog open={Boolean(permDeleteModalItem)} onOpenChange={(open) => !open && setPermDeleteModalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              <DialogTitle className="text-base font-bold text-rose-900">
                Permanently Delete Item?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              This action cannot be undone. This record and all versions will be permanently purged from the database.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-rose-900 block truncate">
              {permDeleteModalItem?.title}
            </span>
            <span className="text-rose-700 text-[11px] block">
              ⚠️ Once permanently deleted, this item cannot be recovered.
            </span>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPermDeleteModalItem(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => permDeleteModalItem && handleSinglePermanentDelete(permDeleteModalItem)}
              disabled={isProcessing}
              className="gap-1.5 font-semibold bg-rose-600 hover:bg-rose-700"
            >
              {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Delete Permanently</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Permanent Delete Modal */}
      <Dialog open={bulkPermDeleteOpen} onOpenChange={setBulkPermDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              <DialogTitle className="text-base font-bold text-rose-900">
                Permanently Delete {selectedIds.length} Items?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              This action cannot be undone. All selected items will be permanently erased from the database.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-rose-50 rounded border border-rose-200 text-xs text-rose-900">
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
              onClick={() => setBulkPermDeleteOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkPermanentDeleteConfirm}
              disabled={isProcessing}
              className="gap-1.5 font-semibold bg-rose-600 hover:bg-rose-700"
            >
              {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Delete {selectedIds.length} Items</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty Trash Modal */}
      <Dialog open={emptyTrashModalOpen} onOpenChange={setEmptyTrashModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              <DialogTitle className="text-base font-bold text-rose-900">
                Empty Trash?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              All items currently in Trash ({stats.total} item(s)) will be permanently purged from the database. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-1">
            <span className="font-semibold block">⚠️ Permanent Data Loss Warning</span>
            <span className="text-rose-700 text-[11px] block">
              Every blog and case study currently in the recycle bin will be completely deleted.
            </span>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmptyTrashModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEmptyTrashConfirm}
              disabled={isProcessing}
              className="gap-1.5 font-semibold bg-rose-600 hover:bg-rose-700"
            >
              {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Empty Entire Trash</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
