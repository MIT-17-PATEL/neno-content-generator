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
        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-studio-900/80 border border-studio-800/80 hover:border-studio-700 text-left transition-all"
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="h-6 w-6 rounded bg-brand-950 border border-brand-800/80 flex items-center justify-center text-brand-400 shrink-0">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <div className="truncate">
            <div className="text-[11px] font-medium text-studio-400 uppercase tracking-wider">
              Workspace
            </div>
            <div className="text-xs font-semibold text-white truncate">
              {activeWorkspace?.name || "Select Workspace"}
            </div>
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-studio-400 shrink-0 ml-2" />
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
          <div className="absolute bottom-full left-0 mb-2 w-full bg-studio-900 border border-studio-800 rounded-xl shadow-xl z-40 p-2 space-y-1">
            <div className="px-2 py-1 text-[11px] font-medium text-studio-400 uppercase tracking-wider">
              Available Workspaces
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
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? "bg-brand-600/20 text-brand-300 font-medium"
                        : "text-studio-300 hover:bg-studio-800 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-brand-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-studio-800 pt-1.5 mt-1.5">
              {!isCreating ? (
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-studio-300 hover:text-white hover:bg-studio-800 rounded-lg transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-brand-400" />
                  <span>Create Workspace</span>
                </button>
              ) : (
                <form onSubmit={handleCreate} className="p-2 space-y-2">
                  <input
                    type="text"
                    placeholder="Workspace name"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    required
                    className="w-full bg-studio-950 border border-studio-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newWsDesc}
                    onChange={(e) => setNewWsDesc(e.target.value)}
                    className="w-full bg-studio-950 border border-studio-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="w-full py-1 text-xs"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Creating..." : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="py-1 text-xs"
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
