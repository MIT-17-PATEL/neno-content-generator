"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  ExternalLink,
  ShieldCheck,
  Plus,
  Trash2,
  BookOpen,
  FileText,
  Filter,
  CheckCircle2,
  AlertCircle,
  Layers,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentItem } from "@/types";

interface ResearchSourceItem {
  id: string;
  content_id: string;
  url: string;
  title: string;
  publisher?: string;
  notes?: string;
  relevance?: string;
  retrieved_at?: string;
  contentTitle?: string;
}

export default function ResearchPage() {
  const { activeWorkspace } = useAuth();
  const [sources, setSources] = useState<ResearchSourceItem[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRelevance, setSelectedRelevance] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPublisher, setNewPublisher] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newRelevance, setNewRelevance] = useState("Primary Empirical Reference");
  const [targetContentId, setTargetContentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchSourcesAndContent = useCallback(async () => {
    if (!activeWorkspace) return;
    setIsLoading(true);
    try {
      const [sourcesRes, contentRes] = await Promise.all([
        fetch(`/api/research?workspaceId=${activeWorkspace.id}`),
        fetch(`/api/content?workspaceId=${activeWorkspace.id}`),
      ]);

      if (sourcesRes.ok) {
        const data = await sourcesRes.json();
        setSources(data.sources || []);
      }
      if (contentRes.ok) {
        const cData = await contentRes.json();
        setContentItems(cData.items || []);
        if (cData.items?.length > 0 && !targetContentId) {
          setTargetContentId(cData.items[0].id);
        }
      }
    } catch (err) {
      console.error("Fetch research failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace, targetContentId]);

  useEffect(() => {
    fetchSourcesAndContent();
  }, [fetchSourcesAndContent]);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !newUrl.trim() || !newTitle.trim() || !targetContentId) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          contentId: targetContentId,
          url: newUrl,
          title: newTitle,
          publisher: newPublisher,
          notes: newNotes,
          relevance: newRelevance,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewUrl("");
        setNewTitle("");
        setNewPublisher("");
        setNewNotes("");
        fetchSourcesAndContent();
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Failed to add research source");
      }
    } catch {
      setErrorMessage("Network error adding research source");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!activeWorkspace) return;
    if (!confirm("Are you sure you want to remove this research source citation?")) return;

    try {
      const res = await fetch(`/api/research/${id}?workspaceId=${activeWorkspace.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSources(sources.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("Delete source error:", err);
    }
  };

  const filteredSources = sources.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.publisher?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRelevance =
      selectedRelevance === "all" || s.relevance === selectedRelevance;

    return matchesSearch && matchesRelevance;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-studio-800/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Research & Grounding Repository
            </h1>
            <Badge variant="success" className="gap-1 text-[11px]">
              <ShieldCheck className="h-3 w-3" />
              <span>Prompt-Injection Defense Active</span>
            </Badge>
          </div>
          <p className="text-sm text-studio-400">
            Authoritative empirical sources, industry benchmarks, and publisher citations in <strong>{activeWorkspace?.name}</strong>
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
            <span>Add Research Source</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-studio-900/40 border border-studio-800/80 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-studio-500" />
          <input
            type="text"
            placeholder="Search by title, publisher, notes, or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-studio-950 border border-studio-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedRelevance}
            onChange={(e) => setSelectedRelevance(e.target.value)}
            className="bg-studio-950 border border-studio-800 rounded-lg px-3 py-1.5 text-xs text-studio-300 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Relevance Levels</option>
            <option value="Primary Empirical Reference">Primary Reference</option>
            <option value="Industry Benchmark">Industry Benchmark</option>
            <option value="Secondary Source">Secondary Source</option>
          </select>
        </div>
      </div>

      {/* Sources Grid */}
      {isLoading ? (
        <Card className="p-12 text-center text-studio-400 text-sm">
          Loading verified research repository...
        </Card>
      ) : filteredSources.length === 0 ? (
        <Card className="p-16 border-dashed border-studio-800 text-center">
          <BookOpen className="h-10 w-10 text-studio-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No research sources found</h3>
          <p className="text-xs text-studio-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedRelevance !== "all"
              ? "No sources matched your active filter."
              : "Launch an autonomous generation run with research enabled or attach verified citations manually."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSources.map((source) => (
            <Card key={source.id} className="p-5 flex flex-col justify-between hover:border-studio-700 transition-all">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{source.relevance || "Reference"}</Badge>
                    <span className="text-[11px] text-studio-500">
                      {source.publisher || "Authoritative Source"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSource(source.id)}
                    title="Remove citation"
                    className="text-studio-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-white hover:text-brand-400 transition-colors flex items-center gap-1.5"
                  >
                    <span>{source.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                  <p className="text-xs text-studio-400 mt-1.5 leading-relaxed line-clamp-3">
                    {source.notes || "Grounding benchmark and empirical findings."}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-studio-800/80 flex items-center justify-between text-[11px] text-studio-500">
                <div className="flex items-center gap-1.5 truncate">
                  <FileText className="h-3 w-3 text-brand-400 shrink-0" />
                  <Link
                    href={`/content/${source.content_id}`}
                    className="hover:text-brand-300 truncate"
                  >
                    {source.contentTitle || "Associated Article"}
                  </Link>
                </div>
                <span>
                  {source.retrieved_at
                    ? new Date(source.retrieved_at).toLocaleDateString()
                    : "Verified"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Source Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 bg-studio-900 border-studio-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Add Research Source</h3>
            <p className="text-xs text-studio-400 mb-4">
              Attach a verified external publication or benchmark to an article draft
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleAddSource} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Associated Content Draft
                </label>
                <select
                  required
                  value={targetContentId}
                  onChange={(e) => setTargetContentId(e.target.value)}
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  {contentItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({item.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Source URL
                </label>
                <input
                  type="url"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://ieee.org/papers/..."
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Publication / Paper Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Empirical Benchmarks in Distributed Consensus"
                  className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-studio-300 mb-1.5">
                    Publisher / Institution
                  </label>
                  <input
                    type="text"
                    value={newPublisher}
                    onChange={(e) => setNewPublisher(e.target.value)}
                    placeholder="e.g., Gartner, IEEE, ACM"
                    className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-studio-300 mb-1.5">
                    Relevance Level
                  </label>
                  <select
                    value={newRelevance}
                    onChange={(e) => setNewRelevance(e.target.value)}
                    className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Primary Empirical Reference">Primary Empirical Reference</option>
                    <option value="Industry Benchmark">Industry Benchmark</option>
                    <option value="Secondary Source">Secondary Source</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1.5">
                  Key Findings & Benchmark Notes
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Summarize key statistics, data tables, or architectural findings..."
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
                  {isSubmitting ? "Sanitizing & Saving..." : "Save Source"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
