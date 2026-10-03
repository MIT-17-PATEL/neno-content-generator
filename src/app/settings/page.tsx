"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Save,
  Building,
  Target,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Plus,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { activeWorkspace } = useAuth();

  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [styleGuidelines, setStyleGuidelines] = useState("");
  const [preferredTerms, setPreferredTerms] = useState<string[]>([]);
  const [prohibitedTerms, setProhibitedTerms] = useState<string[]>([]);

  const [newPreferred, setNewPreferred] = useState("");
  const [newProhibited, setNewProhibited] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchBrandSettings = useCallback(async () => {
    if (!activeWorkspace) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/brand`);
      if (res.ok) {
        const data = await res.json();
        const brand = data.brand;
        if (brand) {
          setBrandName(brand.brand_name || brand.brandName || "");
          setIndustry(brand.industry || "");
          setAudience(brand.audience || "");
          setTone(brand.tone || "");
          setStyleGuidelines(brand.style_guidelines || brand.styleGuidelines || "");
          setPreferredTerms(brand.preferred_terms || brand.preferredTerms || []);
          setProhibitedTerms(brand.prohibited_terms || brand.prohibitedTerms || []);
        }
      }
    } catch (err) {
      console.error("Fetch brand settings error:", err);
      setErrorMessage("Could not load brand settings for this workspace.");
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchBrandSettings();
  }, [fetchBrandSettings]);

  const handleAddPreferred = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const val = newPreferred.trim();
    if (val && !preferredTerms.includes(val)) {
      setPreferredTerms([...preferredTerms, val]);
      setNewPreferred("");
    }
  };

  const handleRemovePreferred = (term: string) => {
    setPreferredTerms(preferredTerms.filter((t) => t !== term));
  };

  const handleAddProhibited = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const val = newProhibited.trim();
    if (val && !prohibitedTerms.includes(val)) {
      setProhibitedTerms([...prohibitedTerms, val]);
      setNewProhibited("");
    }
  };

  const handleRemoveProhibited = (term: string) => {
    setProhibitedTerms(prohibitedTerms.filter((t) => t !== term));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/brand`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          industry,
          audience,
          tone,
          styleGuidelines,
          preferredTerms,
          prohibitedTerms,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to save brand settings");
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch {
      setErrorMessage("Network error saving brand configuration");
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-studio-400">
        Please select or create a workspace to configure brand voice and settings.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-studio-800/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Brand Voice & Workspace Settings
            </h1>
            <Badge variant="info">{activeWorkspace.name}</Badge>
          </div>
          <p className="text-sm text-studio-400">
            Define the brand parameters, audience profiles, and vocabulary injected into AI generation agents
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchBrandSettings}
            disabled={isLoading}
            className="gap-1.5 text-studio-400"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="gap-2"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Saved Successfully</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{isSaving ? "Saving Guidelines..." : "Save Brand Settings"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-300 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>Brand guidelines updated. All future generation runs in <strong>{activeWorkspace.name}</strong> will adhere to these rules.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Identity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Building className="h-4 w-4 text-brand-400" />
              <CardTitle>Core Identity & Industry</CardTitle>
            </div>
            <CardDescription>
              Basic organizational profile used for contextual research grounding
            </CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-studio-300 mb-1.5">
                Brand / Organization Name
              </label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Neno Technology"
                className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-studio-300 mb-1.5">
                Industry & Domain
              </label>
              <input
                type="text"
                required
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Enterprise AI & Cloud Engineering"
                className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
          </div>
        </Card>

        {/* Audience & Tone */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Target className="h-4 w-4 text-brand-400" />
              <CardTitle>Audience & Tone of Voice</CardTitle>
            </div>
            <CardDescription>
              Governs the reading level, technical depth, and emotional register of the Writer Agent
            </CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-studio-300 mb-1.5">
                Target Audience Persona
              </label>
              <input
                type="text"
                required
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g., CTOs, VP of Engineering, Enterprise Architects"
                className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-studio-300 mb-1.5">
                Tone of Voice
              </label>
              <input
                type="text"
                required
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g., Authoritative, technical, concise, pragmatic"
                className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-studio-300 mb-1.5">
              Writing Style & Editorial Guidelines
            </label>
            <textarea
              rows={3}
              value={styleGuidelines}
              onChange={(e) => setStyleGuidelines(e.target.value)}
              placeholder="e.g., Use active voice. Highlight concrete ROI metrics and architectural tradeoffs. Avoid generic buzzwords."
              className="w-full bg-studio-950 border border-studio-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>
        </Card>

        {/* Terminology Rules */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <BookOpen className="h-4 w-4 text-brand-400" />
              <CardTitle>Brand Vocabulary & Terminology Constraints</CardTitle>
            </div>
            <CardDescription>
              Enforced by the QA Agent during the generation pipeline
            </CardDescription>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Preferred Terms */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Preferred Terminology</span>
                </label>
                <span className="text-[11px] text-studio-500">{preferredTerms.length} terms</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPreferred}
                  onChange={(e) => setNewPreferred(e.target.value)}
                  onKeyDown={handleAddPreferred}
                  placeholder="Add preferred word / phrase..."
                  className="flex-1 bg-studio-950 border border-studio-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-studio-500 focus:outline-none focus:border-emerald-500"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddPreferred}
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-16 p-2 rounded-lg bg-studio-950/60 border border-studio-800/80">
                {preferredTerms.length === 0 ? (
                  <span className="text-xs text-studio-500 italic p-1">No preferred terms defined.</span>
                ) : (
                  preferredTerms.map((term) => (
                    <span
                      key={term}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs"
                    >
                      <span>{term}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePreferred(term)}
                        className="hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Prohibited Terms */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Prohibited Terminology</span>
                </label>
                <span className="text-[11px] text-studio-500">{prohibitedTerms.length} terms</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProhibited}
                  onChange={(e) => setNewProhibited(e.target.value)}
                  onKeyDown={handleAddProhibited}
                  placeholder="Add banned buzzword / term..."
                  className="flex-1 bg-studio-950 border border-studio-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-studio-500 focus:outline-none focus:border-red-500"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddProhibited}
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-16 p-2 rounded-lg bg-studio-950/60 border border-studio-800/80">
                {prohibitedTerms.length === 0 ? (
                  <span className="text-xs text-studio-500 italic p-1">No prohibited terms defined.</span>
                ) : (
                  prohibitedTerms.map((term) => (
                    <span
                      key={term}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-950/60 border border-red-800/60 text-red-300 text-xs"
                    >
                      <span>{term}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveProhibited(term)}
                        className="hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
