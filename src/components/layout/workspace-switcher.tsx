"use client";

import React, { useState } from "react";
import { Check, ChevronDown, Plus, Building2 } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspace, refreshWorkspaces } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsDesc, setNewWsDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWsName, description: newWsDesc }),
      });
      if (res.ok) {
        const data = await res.json();
        await refreshWorkspaces();
        setActiveWorkspace(data.workspace);
        setIsCreating(false);
        setNewWsName("");
        setNewWsDesc("");
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Create workspace failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/80 text-left transition-all"
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="h-6 w-6 rounded bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 shrink-0">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <div className="truncate">
            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              Workspace
            </div>
            <div className="text-xs font-semibold text-slate-900 truncate">
              {activeWorkspace?.name || "Select Workspace"}
            </div>
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => {
              setIsOpen(false);
              setIsCreating(false);
            }}
          />
          <div className="absolute bottom-full left-0 mb-2 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-40 p-1.5 space-y-1">
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Workspaces
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {workspaces.map((ws) => {
                const isSelected = activeWorkspace?.id === ws.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      isSelected
                        ? "bg-orange-50 text-orange-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-orange-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-100 pt-1.5 mt-1">
              {!isCreating ? (
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-orange-600" />
                  <span>New Workspace</span>
                </button>
              ) : (
                <form onSubmit={handleCreate} className="p-1.5 space-y-2">
                  <input
                    type="text"
                    placeholder="Workspace name"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newWsDesc}
                    onChange={(e) => setNewWsDesc(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="w-full py-1 text-xs h-7"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Saving..." : "Create"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="py-1 text-xs h-7"
                      onClick={() => setIsCreating(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
