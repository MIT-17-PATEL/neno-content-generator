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
  Shield,
  ShieldCheck,
  Lock,
  Activity,
  Key,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuditEvent } from "@/types";

export default function SettingsPage() {
  const { activeWorkspace } = useAuth();
  const [activeTab, setActiveTab] = useState<"brand" | "security">("brand");

  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [styleGuidelines, setStyleGuidelines] = useState("");
  const [preferredTerms, setPreferredTerms] = useState<string[]>([]);
  const [prohibitedTerms, setProhibitedTerms] = useState<string[]>([]);

  const [newPreferred, setNewPreferred] = useState("");
  const [newProhibited, setNewProhibited] = useState("");

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

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

  const fetchAuditLogs = useCallback(async () => {
    if (!activeWorkspace) return;
    setIsLoadingAudit(true);
    try {
      const res = await fetch(`/api/audit?workspaceId=${activeWorkspace.id}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setAuditEvents(data.events || []);
      }
    } catch (err) {
      console.error("Fetch audit error:", err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (activeTab === "security") {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  if (!activeWorkspace) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-studio-400">
        Please select or create a workspace to configure brand voice and settings.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-studio-800/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Workspace & Security Settings
            </h1>
            <Badge variant="info">{activeWorkspace.name}</Badge>
          </div>
          <p className="text-sm text-studio-400">
            Manage brand voice rules, OWASP security policies, rate limits, and audit logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "brand" ? (
            <>
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
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAuditLogs}
              disabled={isLoadingAudit}
              className="gap-1.5 text-studio-300 border-studio-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingAudit ? "animate-spin" : ""}`} />
              <span>Refresh Audit Log</span>
            </Button>
          )}
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-studio-800/80 pb-3">
        <button
          onClick={() => setActiveTab("brand")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "brand"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
              : "bg-studio-950/60 border border-studio-800 text-studio-400 hover:text-studio-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Brand Voice & Identity</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "security"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
              : "bg-studio-950/60 border border-studio-800 text-studio-400 hover:text-studio-200"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Security & Audit Logs</span>
        </button>
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

      {/* Tab 1: Brand Voice */}
      {activeTab === "brand" && (
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
      )}

      {/* Tab 2: Security & Audit Logs */}
      {activeTab === "security" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Security Policies Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="bg-studio-900/50 border-studio-800">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">OWASP Application Hardening</CardTitle>
                    <CardDescription className="text-xs">
                      Active security headers and transport layer defense
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <div className="space-y-2.5 p-4 pt-0 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                  <span className="text-studio-300 font-medium">HSTS Preload Protection</span>
                  <Badge variant="success">max-age=63072000</Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                  <span className="text-studio-300 font-medium">Anti-Clickjacking Defense</span>
                  <Badge variant="success">X-Frame-Options: DENY</Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                  <span className="text-studio-300 font-medium">MIME-Sniffing Prevention</span>
                  <Badge variant="success">nosniff</Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                  <span className="text-studio-300 font-medium">Prompt Injection Boundary</span>
                  <Badge variant="success">Active Isolation</Badge>
                </div>
              </div>
            </Card>

            <Card className="bg-studio-900/50 border-studio-800">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Rate Limiting & Tenant Protection</CardTitle>
                    <CardDescription className="text-xs">
                      Sliding window request throttling and quota controls
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <div className="space-y-2.5 p-4 pt-0 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                  <span className="text-studio-300 font-medium">AI Generation Throttle</span>
                  <span className="font-mono text-indigo-400 font-semibold">10 req / min</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                  <span className="text-studio-300 font-medium">Authentication Brute-Force Guard</span>
                  <span className="font-mono text-emerald-400 font-semibold">15 req / min</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                  <span className="text-studio-300 font-medium">REST API Standard Tier</span>
                  <span className="font-mono text-brand-400 font-semibold">120 req / min</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                  <span className="text-studio-300 font-medium">Session Token Security</span>
                  <Badge variant="info">JWT HTTP-Only SameSite</Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* Audit Logs Table */}
          <Card className="bg-studio-900/50 border-studio-800 overflow-hidden">
            <CardHeader className="border-b border-studio-800/80 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  <div>
                    <CardTitle className="text-sm">Workspace Audit Trail</CardTitle>
                    <CardDescription className="text-xs">
                      Immutable record of security events, authentication, and content operations
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline">{auditEvents.length} Events Logged</Badge>
              </div>
            </CardHeader>

            {isLoadingAudit ? (
              <div className="py-16 text-center text-xs text-studio-400">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
                Loading audit trail records...
              </div>
            ) : auditEvents.length === 0 ? (
              <div className="py-16 text-center text-xs text-studio-400">
                <Shield className="w-8 h-8 text-studio-600 mx-auto mb-2" />
                <p className="font-semibold text-studio-300">No audit events recorded yet</p>
                <p className="text-studio-500 mt-0.5">
                  Security, auth, and generation actions will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-studio-950/80 border-b border-studio-800 text-studio-400 font-medium">
                    <tr>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-studio-800/60">
                    {auditEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-studio-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              evt.action.startsWith("AUTH")
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/50"
                                : evt.action.startsWith("GENERATION")
                                ? "bg-indigo-950 text-indigo-300 border border-indigo-800/50"
                                : "bg-studio-800 text-studio-300 border border-studio-700"
                            }`}
                          >
                            {evt.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-studio-300">
                          {evt.userEmail || evt.userId || "System"}
                        </td>
                        <td className="py-3 px-4 text-studio-400 text-[11px]">
                          {new Date(evt.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-studio-400 font-mono text-[11px] max-w-xs truncate">
                          {evt.details ? JSON.stringify(evt.details) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
