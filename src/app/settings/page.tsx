"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Save,
  Building,
  Target,
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
  Sparkles,
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
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-500">
        Please select or create a workspace to configure settings.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Settings
            </h1>
            <Badge variant="outline" className="text-xs font-normal text-slate-700 bg-slate-100">
              {activeWorkspace.name}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Manage workspace brand guidelines, voice rules, security policies, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === "brand" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBrandSettings}
                disabled={isLoading}
                className="gap-1.5 text-slate-700 border-slate-200"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? "Saving..." : "Save Guidelines"}</span>
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
              className="gap-1.5 text-slate-700 border-slate-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingAudit ? "animate-spin" : ""}`} />
              <span>Refresh Log</span>
            </Button>
          )}
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("brand")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
            activeTab === "brand"
              ? "bg-orange-50 text-orange-700 border border-orange-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Brand Voice & Identity</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
            activeTab === "security"
              ? "bg-orange-50 text-orange-700 border border-orange-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Security & Audit Logs</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Brand guidelines updated. All future generation runs in <strong>{activeWorkspace.name}</strong> will adhere to these rules.</span>
        </div>
      )}

      {/* Tab 1: Brand Voice */}
      {activeTab === "brand" && (
        <form onSubmit={handleSave} className="space-y-5">
          {/* Core Identity */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-base font-semibold text-slate-900">Core Identity</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Basic organizational profile used for contextual generation and research
              </CardDescription>
            </CardHeader>
            <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Brand / Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g., Neno Technology"
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Industry & Domain
                </label>
                <input
                  type="text"
                  required
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., Enterprise Cloud Architecture"
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>
          </Card>

          {/* Audience & Tone */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-base font-semibold text-slate-900">Audience & Tone</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Governs the reading level, technical depth, and voice of generated articles
              </CardDescription>
            </CardHeader>
            <div className="p-6 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    required
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="e.g., CTOs, Engineering Leaders, Architects"
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Tone of Voice
                  </label>
                  <input
                    type="text"
                    required
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="e.g., Authoritative, empirical, concise"
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Editorial Style Guidelines
                </label>
                <textarea
                  rows={3}
                  value={styleGuidelines}
                  onChange={(e) => setStyleGuidelines(e.target.value)}
                  placeholder="e.g., Use active voice. Highlight concrete ROI metrics and architectural tradeoffs. Avoid generic buzzwords."
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors resize-none"
                />
              </div>
            </div>
          </Card>

          {/* Terminology Rules */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-base font-semibold text-slate-900">Vocabulary Constraints</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Enforced by the QA and editing steps during content generation
              </CardDescription>
            </CardHeader>

            <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preferred Terms */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Preferred Terms</span>
                  </label>
                  <span className="text-[11px] text-slate-400">{preferredTerms.length} terms</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPreferred}
                    onChange={(e) => setNewPreferred(e.target.value)}
                    onKeyDown={handleAddPreferred}
                    placeholder="Add preferred word / phrase..."
                    className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPreferred}
                    className="text-xs border-slate-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-14 p-2.5 rounded-md bg-slate-50 border border-slate-200">
                  {preferredTerms.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No preferred terms added.</span>
                  ) : (
                    preferredTerms.map((term) => (
                      <span
                        key={term}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium"
                      >
                        <span>{term}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePreferred(term)}
                          className="hover:text-emerald-950"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Prohibited Terms */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Prohibited Terms</span>
                  </label>
                  <span className="text-[11px] text-slate-400">{prohibitedTerms.length} terms</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProhibited}
                    onChange={(e) => setNewProhibited(e.target.value)}
                    onKeyDown={handleAddProhibited}
                    placeholder="Add banned term / buzzword..."
                    className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddProhibited}
                    className="text-xs border-slate-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-14 p-2.5 rounded-md bg-slate-50 border border-slate-200">
                  {prohibitedTerms.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No prohibited terms added.</span>
                  ) : (
                    prohibitedTerms.map((term) => (
                      <span
                        key={term}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
                      >
                        <span>{term}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProhibited(term)}
                          className="hover:text-red-950"
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
        <div className="space-y-5">
          {/* Security Policies Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 rounded-md text-emerald-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-900">Application Hardening</CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Security headers and transport layer protection
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <div className="space-y-2 p-4 pt-0 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-medium">HSTS Preload Protection</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px]">
                    max-age=63072000
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-medium">Anti-Clickjacking Defense</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px]">
                    DENY
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-medium">MIME-Sniffing Prevention</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px]">
                    nosniff
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-medium">Prompt Injection Isolation</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px]">
                    Active Boundary
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-50 rounded-md text-orange-600">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-900">Rate Limiting & Quotas</CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Request throttling and tenant abuse controls
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <div className="space-y-2 p-4 pt-0 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-medium">AI Generation Throttle</span>
                  <span className="font-mono text-slate-800 font-semibold">10 req / min</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-medium">Auth Brute-Force Guard</span>
                  <span className="font-mono text-slate-800 font-semibold">15 req / min</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-medium">REST API Standard Tier</span>
                  <span className="font-mono text-slate-800 font-semibold">120 req / min</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-slate-700 font-medium">Session Token Security</span>
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 font-mono text-[10px]">
                    HTTP-Only SameSite
                  </Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* Audit Logs Table */}
          <Card className="bg-white border-slate-200 overflow-hidden">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-900">Workspace Audit Trail</CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Immutable record of security events, auth, and generation operations
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs text-slate-600 bg-slate-50">{auditEvents.length} Events Logged</Badge>
              </div>
            </CardHeader>

            {isLoadingAudit ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin text-orange-600 mx-auto mb-2" />
                Loading audit trail records...
              </div>
            ) : auditEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <Shield className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="font-medium text-slate-700">No audit events recorded yet</p>
                <p className="text-slate-400 mt-0.5">
                  Security, auth, and generation actions will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                    <tr>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              evt.action.startsWith("AUTH")
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : evt.action.startsWith("GENERATION")
                                ? "bg-orange-50 text-orange-800 border border-orange-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {evt.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 font-medium">
                          {evt.userEmail || evt.userId || "System"}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                          {new Date(evt.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] max-w-xs truncate">
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
