"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Clock,
  Sparkles,
  Image as ImageIcon,
  Link2,
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Table as TableIcon,
  X,
  ExternalLink,
  Loader2,
  Share2,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateSlug } from "@/lib/utils";
import { ExportFormatter } from "@/lib/export/export-formatter";

interface BlogEditorProps {
  initialId?: string;
}

export function BlogEditor({ initialId }: BlogEditorProps) {
  const router = useRouter();
  const { activeWorkspace, user } = useAuth();

  const isEditing = Boolean(initialId);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [author, setAuthor] = useState("Mit Patel");
  const [category, setCategory] = useState("AI Architecture");
  const [tags, setTags] = useState<string[]>(["Agentic AI", "Next.js", "Enterprise"]);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<"Draft" | "Published" | "Scheduled">("Draft");
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split("T")[0]);

  // Content
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // SEO State
  const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");

  // AI Image Generation State
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState<
    "dark_tech" | "isometric_3d" | "minimalist_vector" | "architectural_blueprint" | "editorial_photo"
  >("dark_tech");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [autoGenerateImageOnSave, setAutoGenerateImageOnSave] = useState(true);

  // Feedback
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 6000);
  };

  const handleGenerateAiImage = async () => {
    if (!activeWorkspace) return;
    if (!title.trim() && !imagePrompt.trim()) {
      showToast("Please enter a blog title or image prompt first", "error");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const res = await fetch("/api/media/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          topic: title.trim() || "Enterprise AI Systems",
          category,
          style: imageStyle,
          aspectRatio: "16:9",
          customPrompt: imagePrompt.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.asset?.publicUrl) {
        setFeaturedImage(data.asset.publicUrl);
        showToast("AI featured image generated and attached to article!");
      } else {
        showToast(data.error || "Failed to generate AI image", "error");
      }
    } catch (err) {
      console.error("Image generation error:", err);
      showToast("Network error generating image", "error");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Load existing blog if editing
  useEffect(() => {
    if (!initialId || !activeWorkspace) return;
    setIsLoading(true);
    fetch(`/api/admin/blogs/${initialId}?workspaceId=${activeWorkspace.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.item) {
          setTitle(data.item.title || "");
          setSlug(data.item.slug || "");
          setShortDescription(data.item.excerpt || "");
          setCategory(data.item.category || "AI Architecture");
          if (data.item.status === "approved" || data.item.status === "exported") {
            setStatus("Published");
          } else if (data.item.status === "in_review") {
            setStatus("Scheduled");
          } else {
            setStatus("Draft");
          }
        }
        if (data.version) {
          setContent(data.version.content || "");
          const meta = data.version.seo_metadata || {};
          setSeoTitle(meta.seoTitle || data.item?.title || "");
          setMetaDescription(meta.metaDescription || data.item?.excerpt || "");
          setKeywords(Array.isArray(meta.keywords) ? meta.keywords : []);
          setFeaturedImage(meta.featuredImageBrief || meta.ogImage || "");
          setOgImage(meta.ogImage || "");
          setCanonicalUrl(meta.canonicalUrl || "");
          setAuthor(meta.author || user?.name || "Mit Patel");
          setTags(Array.isArray(meta.tags) ? meta.tags : []);
        }
      })
      .catch((err) => {
        console.error("Failed to load blog:", err);
        showToast("Error loading blog details", "error");
      })
      .finally(() => setIsLoading(false));
  }, [initialId, activeWorkspace, user]);

  // Auto-generate slug when title changes in create mode
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing && !slug) {
      setSlug(generateSlug(val));
    }
  };

  // Tags management
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  // Keywords management
  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && keywordInput.trim()) {
      e.preventDefault();
      if (!keywords.includes(keywordInput.trim())) {
        setKeywords([...keywords, keywordInput.trim()]);
      }
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter((item) => item !== kw));
  };

  // Markdown Toolbar helper
  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    const replacement = `${prefix}${selected || "text"}${suffix}`;
    const newContent = content.slice(0, start) + replacement + content.slice(end);
    setContent(newContent);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4));
    }, 0);
  };

  // Save / Publish
  const handleSave = async (publishNow: boolean = false) => {
    if (!activeWorkspace) return;
    if (!title.trim()) {
      showToast("Please enter a blog title", "error");
      return;
    }

    if (publishNow) {
      setIsPublishing(true);
    } else {
      setIsSaving(true);
    }

    let finalImageUrl = featuredImage;
    if (!finalImageUrl && autoGenerateImageOnSave && title.trim()) {
      try {
        const imgRes = await fetch("/api/media/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: activeWorkspace.id,
            topic: title.trim(),
            category,
            style: imageStyle,
            aspectRatio: "16:9",
            customPrompt: imagePrompt.trim() || undefined,
          }),
        });
        const imgData = await imgRes.json();
        if (imgData.asset?.publicUrl) {
          finalImageUrl = imgData.asset.publicUrl;
          setFeaturedImage(finalImageUrl);
        }
      } catch (err) {
        console.warn("Auto image generation on save:", err);
      }
    }

    const payload = {
      workspaceId: activeWorkspace.id,
      title,
      slug: slug || generateSlug(title),
      shortDescription,
      content: content || `# ${title}\n\n${shortDescription}`,
      category,
      author,
      tags,
      status: publishNow ? "Published" : status,
      publishNow,
      publishDate,
      featuredImage: finalImageUrl,
      seoTitle: seoTitle || title,
      metaDescription: metaDescription || shortDescription,
      keywords,
      ogImage: ogImage || finalImageUrl,
      canonicalUrl,
    };

    try {
      const url = isEditing ? `/api/admin/blogs/${initialId}` : "/api/admin/blogs";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        if (publishNow) {
          showToast("Published directly to Neno Website!");
          setStatus("Published");
        } else {
          showToast(isEditing ? "Blog draft updated successfully" : "Blog created successfully");
        }
        if (!isEditing && data.item?.id) {
          router.push(`/blog/${data.item.id}/edit`);
        }
      } else {
        showToast(data.error || "Failed to save blog", "error");
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
        <span>Loading blog editor...</span>
      </div>
    );
  }

  const renderedHtml = ExportFormatter.markdownToHtmlBody(content || `# ${title || "Blog Title"}\n\n${shortDescription}`);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Toast */}
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
          <Link href="/blog">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate max-w-lg">
                {title || (isEditing ? "Edit Article" : "Create Blog Article")}
              </h1>
              <Badge variant={status === "Published" ? "success" : status === "Scheduled" ? "warning" : "secondary"}>
                {status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing ? `Slug: /blog-single/${slug}` : "Draft new article for website"}
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

      {/* Editor Tabs */}
      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-lg border border-slate-200">
          <TabsTrigger value="basic" className="text-xs">Basic Information</TabsTrigger>
          <TabsTrigger value="content" className="text-xs">Content Editor</TabsTrigger>
          <TabsTrigger value="seo" className="text-xs">SEO & Social</TabsTrigger>
          <TabsTrigger value="publishing" className="text-xs">Publishing Settings</TabsTrigger>
        </TabsList>

        {/* Tab 1: Basic Information */}
        <TabsContent value="basic" className="space-y-6">
          <Card className="border-slate-200 shadow-none">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-900">Article Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Blog Title *</label>
                <Input
                  placeholder="e.g. Architecting Autonomous Multi-Agent AI Systems"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">URL Slug</label>
                  <Input
                    placeholder="architecting-autonomous-multi-agent-ai-systems"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Canonical path: /blog-single/{slug || "slug"}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Category</label>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="text-xs"
                  >
                    <option value="AI Architecture">AI Architecture</option>
                    <option value="Agentic AI">Agentic AI & Autonomous Systems</option>
                    <option value="Enterprise AI & Cloud">Enterprise AI & Cloud</option>
                    <option value="Machine Learning">Machine Learning</option>
                    <option value="Engineering">Engineering & DevOps</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Short Description / Excerpt</label>
                <Textarea
                  placeholder="A concise summary displayed on blog cards, search engines, and social media cards..."
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Author Name</label>
                <Input
                  placeholder="e.g. Mit Patel or Neno AI Lab"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* AI Featured Hero Image Generator Card */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50/50 via-slate-50 to-orange-50/30 border border-orange-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-orange-100 text-orange-700">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Featured Hero Image & AI Generation</h4>
                      <p className="text-[11px] text-slate-500">Auto-generates visuals from topic or custom prompt</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateAiImage}
                    disabled={isGeneratingImage || (!title.trim() && !imagePrompt.trim())}
                    className="gap-1.5 h-8 text-xs font-semibold bg-orange-600 hover:bg-orange-700 shadow-sm"
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Generating Visual...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{featuredImage ? "Regenerate AI Image" : "Auto-Generate Image"}</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Custom Image Prompt Input */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Custom Image Prompt <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Leave blank to auto-synthesize from article headline</span>
                  </div>
                  <Textarea
                    placeholder="e.g. Isometric 3D glowing neural network data conduits connecting microservices on dark obsidian glass..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    rows={2}
                    className="text-xs resize-none bg-white border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Visual Aesthetic Style</label>
                    <Select
                      value={imageStyle}
                      onChange={(e) => setImageStyle(e.target.value as typeof imageStyle)}
                      className="text-xs bg-white"
                    >
                      <option value="dark_tech">Dark Tech (Slate & Neon Conduits)</option>
                      <option value="isometric_3d">Isometric 3D (Cloud Architecture)</option>
                      <option value="minimalist_vector">Minimalist Vector (Swiss Editorial)</option>
                      <option value="architectural_blueprint">Architectural Blueprint (CAD Grid)</option>
                      <option value="editorial_photo">Editorial Photo (Executive Natural)</option>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Direct Image URL / Storage Key</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. uploads/blogs/banner.webp or https://..."
                        value={featuredImage}
                        onChange={(e) => setFeaturedImage(e.target.value)}
                        className="text-xs flex-1 bg-white"
                      />
                      {featuredImage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFeaturedImage("")}
                          className="h-9 px-2 text-xs text-rose-600 hover:bg-rose-50"
                          title="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Image Preview & Quick Actions */}
                {featuredImage && (
                  <div className="pt-2 space-y-2">
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-video max-h-52 flex items-center justify-center group shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={featuredImage}
                        alt={title || "Featured Image Preview"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono">
                        16:9 Featured Visual
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Attached as Blog Featured / OG Image
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const imgTag = `\n\n![${title || "Featured Visual"}](${featuredImage})\n\n`;
                          if (!content.includes(featuredImage)) {
                            setContent((prev) => imgTag + prev);
                            showToast("Hero image embedded into article content!");
                          } else {
                            showToast("Image already present in article markdown");
                          }
                        }}
                        className="text-[11px] h-7 px-2.5 bg-white border-slate-200 hover:bg-slate-50 gap-1 text-slate-700"
                      >
                        <ImageIcon className="h-3 w-3 text-orange-600" />
                        <span>Embed in Markdown Content</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags Chip Input */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-700">Tags (Press Enter to add)</label>
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md min-h-[38px]">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-xs font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="flex-1 min-w-[120px] bg-transparent border-none text-xs focus:outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Content Editor */}
        <TabsContent value="content" className="space-y-4">
          <Card className="border-slate-200 shadow-none">
            {/* Formatting Toolbar */}
            <div className="p-2 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown("## ", "\n")}
                className="h-7 px-2 text-xs"
                title="Heading 2"
              >
                <Heading2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown("### ", "\n")}
                className="h-7 px-2 text-xs"
                title="Heading 3"
              >
                <Heading3 className="h-3.5 w-3.5" />
              </Button>
              <div className="h-4 w-px bg-slate-300 mx-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown("**", "**")}
                className="h-7 px-2 text-xs font-bold"
                title="Bold"
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown("*", "*")}
                className="h-7 px-2 text-xs italic"
                title="Italic"
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <div className="h-4 w-px bg-slate-300 mx-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown("- ", "\n")}
                className="h-7 px-2 text-xs"
                title="Bullet List"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown("1. ", "\n")}
                className="h-7 px-2 text-xs"
                title="Numbered List"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown("> ", "\n")}
                className="h-7 px-2 text-xs"
                title="Blockquote"
              >
                <Quote className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown("```ts\n", "\n```")}
                className="h-7 px-2 text-xs"
                title="Code Block"
              >
                <Code className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  insertMarkdown(
                    "\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Data 1 | Data 2 | Data 3 |\n"
                  )
                }
                className="h-7 px-2 text-xs"
                title="Table"
              >
                <TableIcon className="h-3.5 w-3.5" />
              </Button>
            </div>

            <CardContent className="p-0">
              <Textarea
                ref={textareaRef}
                placeholder="Write your article body in markdown (use ## for sections, - for bullets, etc.)..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={22}
                className="w-full border-0 p-4 font-mono text-xs leading-relaxed focus:ring-0 rounded-none resize-y"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: SEO & Social */}
        <TabsContent value="seo" className="space-y-6">
          <Card className="border-slate-200 shadow-none">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-900">Search Engine Optimization</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Meta Title (Under 60 chars)</label>
                <Input
                  placeholder={title || "SEO optimized headline..."}
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="text-xs"
                />
                <span className="text-[10px] text-slate-400">
                  Length: {seoTitle.length}/60 characters
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Meta Description (Under 160 chars)</label>
                <Textarea
                  placeholder={shortDescription || "SEO summary..."}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                />
                <span className="text-[10px] text-slate-400">
                  Length: {metaDescription.length}/160 characters
                </span>
              </div>

              {/* Keywords Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Focus Keywords (Press Enter to add)</label>
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md min-h-[38px]">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-xs font-medium"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add a keyword..."
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleAddKeyword}
                    className="flex-1 min-w-[120px] bg-transparent border-none text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">OG Image URL</label>
                  <Input
                    placeholder="https://.../og-banner.png"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Canonical URL</label>
                  <Input
                    placeholder="https://neno.tech/blog-single/..."
                    value={canonicalUrl}
                    onChange={(e) => setCanonicalUrl(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Publishing Settings */}
        <TabsContent value="publishing" className="space-y-6">
          <Card className="border-slate-200 shadow-none">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-900">Publication & Release Controls</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Publication Status</label>
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "Draft" | "Published" | "Scheduled")}
                    className="text-xs"
                  >
                    <option value="Draft">Draft (Internal Only)</option>
                    <option value="Published">Published (Live on Website)</option>
                    <option value="Scheduled">Scheduled (Queued)</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Publish Date (YYYY-MM-DD)</label>
                  <Input
                    type="date"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-orange-50/60 border border-orange-200/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-900">
                  <Sparkles className="h-4 w-4 text-orange-600" />
                  <span>Target Publishing Endpoint</span>
                </div>
                <p className="text-xs text-orange-800 leading-relaxed">
                  Publishing synchronizes this article with <code className="bg-orange-100 px-1 py-0.5 rounded font-mono text-[11px]">POST http://localhost:3000/api/admin/blogs</code> and purges Next.js ISR tags (<code className="bg-orange-100 px-1 py-0.5 rounded font-mono text-[11px]">blogs</code>, <code className="bg-orange-100 px-1 py-0.5 rounded font-mono text-[11px]">published-blogs</code>).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Live Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Live Article Preview
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                {category}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">{title || "Untitled Article"}</h1>
              <p className="text-xs text-slate-500 mt-1">
                By {author} • {publishDate}
              </p>
              {shortDescription && (
                <p className="text-sm text-slate-600 mt-3 font-medium bg-slate-50 p-3 rounded border border-slate-200">
                  {shortDescription}
                </p>
              )}
            </div>

            <div
              className="prose prose-sm max-w-none text-slate-800 text-xs leading-relaxed space-y-3"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
