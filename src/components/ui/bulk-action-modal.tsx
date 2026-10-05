"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  ShieldAlert,
  Send,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type BulkActionMode = "trash" | "restore" | "permanent-delete" | "publish";

export interface BulkItem {
  id: string;
  title: string;
  slug?: string;
  category?: string;
  type?: string;
}

export interface BulkActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BulkActionMode;
  items: BulkItem[];
  onProcessItem: (item: BulkItem) => Promise<{ success: boolean; error?: string }>;
  onCompleted?: (successCount: number, failCount: number) => void;
  itemTypeLabel?: string; // e.g. "blog", "case study", "content item"
}

interface ItemStatus {
  item: BulkItem;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
}

export function BulkActionModal({
  open,
  onOpenChange,
  mode,
  items,
  onProcessItem,
  onCompleted,
  itemTypeLabel = "item",
}: BulkActionModalProps) {
  // Steps: "confirm" | "processing" | "completed"
  const [step, setStep] = useState<"confirm" | "processing" | "completed">("confirm");
  const [itemStatuses, setItemStatuses] = useState<ItemStatus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const isRunningRef = useRef(false);

  // Initialize when modal opens or items change
  useEffect(() => {
    if (open) {
      setStep("confirm");
      setItemStatuses(items.map((it) => ({ item: it, status: "pending" })));
      setCurrentIndex(0);
      setSuccessCount(0);
      setFailCount(0);
      isRunningRef.current = false;
    }
  }, [open, items]);

  const handleStartProcessing = async () => {
    if (isRunningRef.current || items.length === 0) return;
    isRunningRef.current = true;
    setStep("processing");

    let successes = 0;
    let fails = 0;

    const currentList: ItemStatus[] = items.map((it) => ({ item: it, status: "pending" }));
    setItemStatuses([...currentList]);

    for (let i = 0; i < items.length; i++) {
      setCurrentIndex(i);

      // Set current item to processing
      currentList[i].status = "processing";
      setItemStatuses([...currentList]);

      try {
        const res = await onProcessItem(items[i]);
        if (res.success) {
          currentList[i].status = "success";
          successes++;
        } else {
          currentList[i].status = "error";
          currentList[i].error = res.error || "Operation failed";
          fails++;
        }
      } catch (err) {
        currentList[i].status = "error";
        currentList[i].error = err instanceof Error ? err.message : "Network error";
        fails++;
      }

      setSuccessCount(successes);
      setFailCount(fails);
      setItemStatuses([...currentList]);
    }

    isRunningRef.current = false;
    setStep("completed");
    if (onCompleted) {
      onCompleted(successes, fails);
    }
  };

  const handleRetryFailed = async () => {
    const failedItems = itemStatuses.filter((s) => s.status === "error").map((s) => s.item);
    if (failedItems.length === 0) return;

    isRunningRef.current = true;
    setStep("processing");

    const currentList = [...itemStatuses];
    let successes = successCount;
    let fails = 0;

    for (let i = 0; i < currentList.length; i++) {
      if (currentList[i].status === "error") {
        setCurrentIndex(i);
        currentList[i].status = "processing";
        setItemStatuses([...currentList]);

        try {
          const res = await onProcessItem(currentList[i].item);
          if (res.success) {
            currentList[i].status = "success";
            currentList[i].error = undefined;
            successes++;
          } else {
            currentList[i].status = "error";
            currentList[i].error = res.error || "Retry failed";
            fails++;
          }
        } catch (err) {
          currentList[i].status = "error";
          currentList[i].error = err instanceof Error ? err.message : "Retry error";
          fails++;
        }

        setSuccessCount(successes);
        setFailCount(fails);
        setItemStatuses([...currentList]);
      }
    }

    isRunningRef.current = false;
    setStep("completed");
    if (onCompleted) {
      onCompleted(successes, fails);
    }
  };

  const handleClose = () => {
    if (step === "processing") return; // Prevent closing while actively processing
    onOpenChange(false);
  };

  // Titles & Labels based on mode
  const getModeDetails = () => {
    switch (mode) {
      case "trash":
        return {
          title: `Move ${items.length} ${itemTypeLabel}${items.length !== 1 ? "s" : ""} to Trash?`,
          description: `You're about to move ${items.length} item${items.length !== 1 ? "s" : ""} to Trash. They will be removed from the website immediately and can be restored for 7 days.`,
          actionLabel: "Move to Trash",
          processingTitle: "Moving items to Trash",
          processingSubtitle: "Please wait while we update your content and remove it from the live website.",
          successTitle: `${successCount} item${successCount !== 1 ? "s" : ""} moved to Trash`,
          successMessage: "All selected items were successfully moved to Trash and removed from the website.",
          confirmButtonVariant: "destructive" as const,
        };
      case "restore":
        return {
          title: `Restore ${items.length} ${itemTypeLabel}${items.length !== 1 ? "s" : ""} from Trash?`,
          description: `You're about to restore ${items.length} item${items.length !== 1 ? "s" : ""} back to your active library.`,
          actionLabel: "Restore Items",
          processingTitle: "Restoring items",
          processingSubtitle: "Please wait while we restore your items and reset their status.",
          successTitle: `${successCount} item${successCount !== 1 ? "s" : ""} restored`,
          successMessage: "Selected items have been restored and returned to your workspace.",
          confirmButtonVariant: "primary" as const,
        };
      case "permanent-delete":
        return {
          title: `Permanently delete ${items.length} ${itemTypeLabel}${items.length !== 1 ? "s" : ""} from database?`,
          description: "This action cannot be undone. These items and their historical version snapshots will be permanently deleted from the database.",
          actionLabel: "Permanently Delete",
          processingTitle: "Permanently deleting items",
          processingSubtitle: "Please wait while we permanently remove these records.",
          successTitle: `${successCount} item${successCount !== 1 ? "s" : ""} permanently deleted`,
          successMessage: "Selected items were permanently deleted from the database.",
          confirmButtonVariant: "destructive" as const,
        };
      case "publish":
        return {
          title: `Publish ${items.length} ${itemTypeLabel}${items.length !== 1 ? "s" : ""} to Website?`,
          description: `You're about to publish ${items.length} item${items.length !== 1 ? "s" : ""} directly to the live website.`,
          actionLabel: "Publish to Website",
          processingTitle: "Publishing items to website",
          processingSubtitle: "Please wait while we synchronize payloads and revalidate ISR cache.",
          successTitle: `${successCount} item${successCount !== 1 ? "s" : ""} published`,
          successMessage: "All selected items were published successfully to the website.",
          confirmButtonVariant: "primary" as const,
        };
    }
  };

  const details = getModeDetails();
  const progressPercent = items.length > 0 ? Math.round(((currentIndex + (step === "completed" ? 1 : 0)) / items.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(val) => !isRunningRef.current && onOpenChange(val)}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-slate-200 shadow-2xl">
        
        {/* STEP 1: Confirmation View */}
        {step === "confirm" && (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-full shrink-0 ${
                  mode === "restore" || mode === "publish"
                    ? "bg-orange-100 text-orange-600"
                    : "bg-rose-100 text-rose-600"
                }`}
              >
                {mode === "trash" && <Trash2 className="h-5 w-5" />}
                {mode === "restore" && <RotateCcw className="h-5 w-5" />}
                {mode === "permanent-delete" && <AlertTriangle className="h-5 w-5" />}
                {mode === "publish" && <Send className="h-5 w-5" />}
              </div>

              <div className="space-y-1">
                <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                  {details.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 leading-relaxed">
                  {details.description}
                </DialogDescription>
              </div>
            </div>

            {/* Items Preview Box */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 max-h-36 overflow-y-auto divide-y divide-slate-200/60">
              {items.map((item, idx) => (
                <div key={item.id} className="py-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="font-mono text-[11px] text-slate-400">{idx + 1}.</span>
                    <span className="font-medium text-slate-800 truncate">{item.title}</span>
                  </div>
                  {item.category && (
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">{item.category}</span>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleClose} className="h-8 text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                variant={details.confirmButtonVariant}
                size="sm"
                onClick={handleStartProcessing}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                {mode === "trash" && <Trash2 className="h-3.5 w-3.5" />}
                {mode === "restore" && <RotateCcw className="h-3.5 w-3.5" />}
                {mode === "permanent-delete" && <AlertTriangle className="h-3.5 w-3.5" />}
                {mode === "publish" && <Send className="h-3.5 w-3.5" />}
                <span>{details.actionLabel}</span>
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 2: Real-time Processing View */}
        {step === "processing" && (
          <div className="p-6 space-y-5">
            {/* SaaS Process Pipeline Indicator */}
            <div className="flex flex-col items-center justify-center text-center space-y-3 pt-2">
              <div className="relative flex items-center justify-center">
                <div className="h-14 w-14 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center animate-pulse">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{details.processingTitle}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{details.processingSubtitle}</p>
              </div>
            </div>

            {/* Progress Bar & Counter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span>
                  Processing {currentIndex + 1} of {items.length}
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {Math.min(100, Math.max(5, progressPercent))}%
                </span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-orange-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
                />
              </div>
            </div>

            {/* Sequential Item Checklist */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 max-h-48 overflow-y-auto space-y-2">
              {itemStatuses.map((st, idx) => (
                <div key={st.item.id} className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center gap-2 truncate pr-2">
                    {st.status === "success" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 animate-in zoom-in-75 duration-150" />
                    )}
                    {st.status === "processing" && (
                      <Loader2 className="h-4 w-4 text-orange-600 shrink-0 animate-spin" />
                    )}
                    {st.status === "pending" && (
                      <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0 inline-block" />
                    )}
                    {st.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}

                    <span
                      className={`truncate ${
                        st.status === "processing"
                          ? "font-bold text-slate-900"
                          : st.status === "success"
                          ? "text-slate-600 line-through"
                          : st.status === "error"
                          ? "text-rose-700 font-medium"
                          : "text-slate-500"
                      }`}
                    >
                      {st.item.title}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {st.status === "processing" ? "updating..." : st.status === "success" ? "done" : ""}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-center text-slate-400">
              Please keep this window open while changes are synchronized with the database and live website.
            </p>
          </div>
        )}

        {/* STEP 3: Completion View */}
        {step === "completed" && (
          <div className="p-6 space-y-5">
            {failCount === 0 ? (
              <div className="flex flex-col items-center justify-center text-center space-y-2.5 pt-2">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">{details.successTitle}</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">{details.successMessage}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {successCount} of {items.length} items processed
                    </h3>
                    <p className="text-xs text-amber-700 font-medium">
                      {failCount} item{failCount !== 1 ? "s" : ""} could not be updated.
                    </p>
                  </div>
                </div>

                {/* Error items breakdown */}
                <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 max-h-36 overflow-y-auto space-y-1.5">
                  {itemStatuses
                    .filter((s) => s.status === "error")
                    .map((s) => (
                      <div key={s.item.id} className="text-xs">
                        <span className="font-semibold text-rose-900 block truncate">{s.item.title}</span>
                        <span className="text-[11px] text-rose-600 block">{s.error || "Unable to update this item."}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-2 flex items-center justify-between gap-2">
              <div>
                {mode === "trash" && successCount > 0 && (
                  <Link href="/trash">
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                      <Trash2 className="h-3.5 w-3.5 text-slate-600" />
                      <span>View Trash</span>
                    </Button>
                  </Link>
                )}
                {mode === "restore" && successCount > 0 && (
                  <Link href="/blog">
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5 text-slate-600" />
                      <span>View in Library</span>
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2">
                {failCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRetryFailed}
                    className="h-8 text-xs gap-1 text-orange-700 border-orange-300 bg-orange-50 hover:bg-orange-100"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry Failed ({failCount})</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleClose}
                  className="h-8 text-xs font-semibold px-4"
                >
                  Done
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
