"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Briefcase,
  TrendingUp,
  Quote,
  Code,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateSlug } from "@/lib/utils";

interface Section {
  id: string;
  type: "Text" | "Quote" | "Statistics" | "Technology" | "Results" | "CTA" | "Image";
  title: string;
  content: string;
}

const defaultSections: Section[] = [
  {
    id: "sec_1",
    type: "Text",
    title: "1. Client Overview & Objective",
    content: "Overview of the enterprise client, baseline technical infrastructure, and strategic objectives for multi-agent automation.",
  },
  {
    id: "sec_2",
    type: "Text",
    title: "2. The Technical Challenge",
    content: "Analysis of operational bottlenecks, high authoring latency, non-deterministic system failure modes, and compliance boundaries.",
  },
  {
    id: "sec_3",
    type: "Text",
    title: "3. Engineered Solution & Architecture",
    content: "Autonomous multi-agent orchestration fabric with deterministic supervisor routing, structured output validation, and telemetry guards.",
  },
  {
    id: "sec_4",
    type: "Technology",
    title: "4. Technology Stack & Integrations",
    content: "Neno Content Platform, Gemini 2.5 Flash, TypeScript, PostgreSQL, AWS S3, Next.js App Router.",
  },
  {
    id: "sec_5",
    type: "Results",
    title: "5. Quantifiable Business Impact",
    content: "- 85% Reduction in Content Production Turnaround\n- 99.4% Factual Accuracy & Hallucination Elimination\n- 4.2x Scalability Velocity Across Multi-Channel Ingress",
  },
];

interface CaseStudyEditorProps {
  initialId?: string;
}

export function CaseStudyEditor({ initialId }: CaseStudyEditorProps) {
  const router = useRouter();
  const { activeWorkspace } = useAuth();

  const isEditing = Boolean(initialId);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Overview State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [clientName, setClientName] = useState("");
  const [industry, setIndustry] = useState("Enterprise AI & Cloud");
  const [location, setLocation] = useState("Global");
  const [shortDescription, setShortDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [status, setStatus] = useState<"Draft" | "Published" | "Scheduled">("Draft");

  // Modular Sections State
  const [sections, setSections] = useState<Section[]>(defaultSections);
  const [newSectionType, setNewSectionType] = useState<Section["type"]>("Text");

  // Feedback
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 6000);
  };

  useEffect(() => {
    if (!initialId || !activeWorkspace) return;
    setIsLoading(true);
    fetch(`/api/admin/case-studies/${initialId}?workspaceId=${activeWorkspace.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.item) {
          setTitle(data.item.title || "");
          setSlug(data.item.slug || "");
          setShortDescription(data.item.excerpt || "");
          setIndustry(data.item.category || "Enterprise AI & Cloud");
          if (data.item.status === "approved" || data.item.status === "exported") {
            setStatus("Published");
          } else if (data.item.status === "in_review") {
            setStatus("Scheduled");
          } else {
            setStatus("Draft");
          }
        }
        if (data.version) {
          const meta = data.version.seo_metadata || {};
          setClientName(meta.clientName || "");
          setLocation(meta.location || "Global");
          setCoverImage(meta.featuredImageUrl || meta.coverImage || meta.ogImage || meta.featuredImageBrief || "");
          if (Array.isArray(meta.sections) && meta.sections.length > 0) {
            setSections(meta.sections);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load case study:", err);
        showToast("Error loading case study details", "error");
      })
      .finally(() => setIsLoading(false));
  }, [initialId, activeWorkspace]);

  // Section Handlers
  const handleAddSection = () => {
    const newSec: Section = {
      id: `sec_${Date.now()}`,
      type: newSectionType,
      title: `${sections.length + 1}. New ${newSectionType} Section`,
      content: "",
    };
    setSections([...sections, newSec]);
  };

  const handleUpdateSection = (id: string, field: "title" | "content", val: string) => {
    setSections(
      sections.map((sec) => (sec.id === id ? { ...sec, [field]: val } : sec))
    );
  };

  const handleRemoveSection = (id: string) => {
    setSections(sections.filter((sec) => sec.id !== id));
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    setSections(reordered);
  };

  // Save / Publish
  const handleSave = async (publishNow: boolean = false) => {
    if (!activeWorkspace) return;
    if (!title.trim()) {
      showToast("Please enter a case study title", "error");
      return;
    }

    if (publishNow) {
      setIsPublishing(true);
    } else {
      setIsSaving(true);
    }

    const payload = {
      workspaceId: activeWorkspace.id,
      title,
      slug: slug || generateSlug(title),
      clientName: clientName || "Enterprise Client",
      industry,
      location,
      shortDescription,
      coverImage,
      sections,
      status: publishNow ? "Published" : status,
      publishNow,
    };

    try {
      const url = isEditing ? `/api/admin/case-studies/${initialId}` : "/api/admin/case-studies";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        if (publishNow) {
          showToast("Case study published live to website!");
          setStatus("Published");
        } else {
          showToast(isEditing ? "Case study updated successfully" : "Case study created successfully");
        }
        if (!isEditing && data.item?.id) {
          router.push(`/case-studies/${data.item.id}/edit`);
        }
      } else {
        showToast(data.error || "Failed to save case study", "error");
      }
    } catch (err) {
      console.error("Save error:", err);
      showToast("Error communicating with CMS server", "error");
    } finally {
      setIsSaving(false);
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
        <span>Loading case study editor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-lg shadow-lg border flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-emerald-900 text-white border-emerald-700"
              : "bg-rose-900 text-white border-rose-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/case-studies">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate max-w-lg">
                {title || (isEditing ? "Edit Case Study" : "Create Case Study")}
              </h1>
              <Badge variant={status === "Published" ? "success" : status === "Scheduled" ? "warning" : "secondary"}>
                {status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Client: {clientName || "Enterprise Client"} • {industry}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            className="gap-1.5 h-8 text-xs font-medium"
          >
            <Eye className="h-3.5 w-3.5 text-slate-600" />
            <span>Preview</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={isSaving || isPublishing}
            className="gap-1.5 h-8 text-xs font-medium border-slate-200"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-slate-600" />}
            <span>Save Draft</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSave(true)}
            disabled={isSaving || isPublishing}
            className="gap-1.5 h-8 text-xs font-semibold bg-orange-600 hover:bg-orange-700 shadow-sm"
          >
            {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>Publish to Website</span>
          </Button>
        </div>
      </div>

      {/* Overview Card */}
      <Card className="border-slate-200 shadow-none">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900">Case Study Overview</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Define the customer profile, headline, and executive summary.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Case Study Title *</label>
            <Input
              placeholder="e.g. Autonomous Content Engine: Slashing Enterprise Production Latency by 85%"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!isEditing && !slug) setSlug(generateSlug(e.target.value));
              }}
              className="text-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Client Name</label>
              <Input
                placeholder="e.g. Acme Cloud Corp"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Industry</label>
              <Select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="text-xs"
              >
                <option value="Enterprise AI & Cloud">Enterprise AI & Cloud</option>
                <option value="Fintech & Banking">Fintech & Banking</option>
                <option value="Healthcare & Bio">Healthcare & Bio</option>
                <option value="SaaS & DevOps">SaaS & DevOps</option>
                <option value="Global Logistics">Global Logistics</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Location / Scale</label>
              <Input
                placeholder="e.g. San Francisco / Global 2000"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Short Summary / Impact Teaser</label>
            <Textarea
              placeholder="How an autonomous agent architecture helped a global enterprise slash authoring turnaround by 85% with verified factual accuracy..."
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Cover Image URL / Storage Key</label>
              <Input
                placeholder="uploads/case-studies/banner.webp or https://..."
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Publication Status</label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as "Draft" | "Published" | "Scheduled")}
                className="text-xs"
              >
                <option value="Draft">Draft</option>
                <option value="Published">Published (Live on Website)</option>
                <option value="Scheduled">Scheduled</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modular Section-Based Content Editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Modular Case Study Sections</h2>
            <p className="text-xs text-slate-500">
              Add, remove, and reorder modular content blocks to structure the customer story.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-40">
              <Select
                value={newSectionType}
                onChange={(e) => setNewSectionType(e.target.value as Section["type"])}
                className="h-8 text-xs"
              >
                <option value="Text">Text Section</option>
                <option value="Quote">Executive Quote</option>
                <option value="Statistics">Key Statistics</option>
                <option value="Technology">Tech Stack</option>
                <option value="Results">Results & Metrics</option>
                <option value="CTA">Call to Action</option>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSection}
              className="gap-1 text-xs h-8 font-semibold border-slate-200 hover:border-orange-300 hover:text-orange-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Section</span>
            </Button>
          </div>
        </div>

        {/* Sections List */}
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <Card key={section.id} className="border-slate-200 shadow-none hover:border-slate-300 transition-colors">
              <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-mono">
                    {section.type}
                  </span>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => handleUpdateSection(section.id, "title", e.target.value)}
                    className="text-xs font-semibold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-orange-500 rounded px-1 flex-1"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={idx === 0}
                    onClick={() => handleMoveSection(idx, "up")}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                    title="Move Up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={idx === sections.length - 1}
                    onClick={() => handleMoveSection(idx, "down")}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                    title="Move Down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSection(section.id)}
                    className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50"
                    title="Remove Section"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-3.5">
                <Textarea
                  placeholder={`Enter content for ${section.title}...`}
                  value={section.content}
                  onChange={(e) => handleUpdateSection(section.id, "content", e.target.value)}
                  rows={4}
                  className="text-xs font-mono leading-relaxed resize-y border-slate-200"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Case Study Preview
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                {industry} • CASE STUDY
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">{title || "Case Study Title"}</h1>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 font-medium">
                <span>Client: {clientName || "Enterprise Client"}</span>
                <span>•</span>
                <span>Location: {location}</span>
              </div>
              {shortDescription && (
                <p className="text-xs text-slate-700 mt-3 p-3 bg-slate-50 rounded border border-slate-200 leading-relaxed">
                  {shortDescription}
                </p>
              )}
            </div>

            <div className="space-y-6">
              {sections.map((sec) => (
                <div key={sec.id} className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
                    {sec.title}
                  </h3>
                  <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {sec.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
