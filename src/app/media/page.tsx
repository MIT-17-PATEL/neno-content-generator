/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Image as ImageIcon,
  Sparkles,
  Upload,
  Search,
  Trash2,
  Copy,
  Check,
  Download,
  Layers,
  Wand2,
  RefreshCw,
  Eye,
  X,
  FileText,
  HardDrive,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MediaAsset, MediaType, ImageAspectRatio, ImageStylePreset, ContentItem } from "@/types";

const STYLE_OPTIONS: Array<{ id: ImageStylePreset; label: string; desc: string }> = [
  { id: "dark_tech", label: "Dark Tech Isometric", desc: "Slate glass, glowing data channels, volumetric lighting" },
  { id: "minimalist_vector", label: "Minimalist Vector", desc: "Swiss modernist flat vector shapes, refined palette" },
  { id: "architectural_blueprint", label: "Architectural Blueprint", desc: "Technical CAD schematics, wireframes, engineering aesthetic" },
  { id: "editorial_photo", label: "Editorial Photo", desc: "Corporate studio lighting, natural depth of field" },
  { id: "isometric_3d", label: "Isometric 3D Cloud", desc: "Floating infrastructure platforms, microchips, data conduits" },
];

const ASPECT_RATIOS: Array<{ id: ImageAspectRatio; label: string; ratioClass: string }> = [
  { id: "16:9", label: "16:9 (Hero)", ratioClass: "aspect-video" },
  { id: "1:1", label: "1:1 (Square)", ratioClass: "aspect-square" },
  { id: "4:3", label: "4:3 (Card)", ratioClass: "aspect-[4/3]" },
  { id: "9:16", label: "9:16 (Mobile)", ratioClass: "aspect-[9/16]" },
];

export default function MediaPage() {
  const { activeWorkspace } = useAuth();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStyle, setSelectedStyle] = useState<string>("all");

  // Modals
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

  // Generate State
  const [genTopic, setGenTopic] = useState("");
  const [genContentId, setGenContentId] = useState("");
  const [genCategory] = useState("Engineering");
  const [genStyle, setGenStyle] = useState<ImageStylePreset>("minimalist_vector");
  const [genRatio, setGenRatio] = useState<ImageAspectRatio>("16:9");
  const [genCustomPrompt, setGenCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAltText, setUploadAltText] = useState("");
  const [uploadType, setUploadType] = useState<MediaType>("featured_image");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMedia = useCallback(async () => {
    if (!activeWorkspace) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/media?workspaceId=${activeWorkspace.id}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (err) {
      console.error("Fetch media error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace]);

  const fetchContentItems = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const res = await fetch(`/api/content?workspaceId=${activeWorkspace.id}`);
      if (res.ok) {
        const data = await res.json();
        setContentItems(data.items || []);
      }
    } catch (err) {
      console.error("Fetch content error:", err);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchMedia();
    fetchContentItems();
  }, [fetchMedia, fetchContentItems]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !genTopic.trim()) return;

    setIsGenerating(true);
    setGenError("");

    try {
      const res = await fetch("/api/media/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          contentId: genContentId || undefined,
          topic: genTopic,
          category: genCategory,
          style: genStyle,
          aspectRatio: genRatio,
          customPrompt: genCustomPrompt || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || "Failed to generate image");
        return;
      }

      setAssets((prev) => [data.asset, ...prev]);
      setIsGenerateOpen(false);
      setGenTopic("");
      setGenCustomPrompt("");
      setPreviewAsset(data.asset);
    } catch {
      setGenError("Network error during image generation");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !uploadFile) return;

    setIsUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("workspaceId", activeWorkspace.id);
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle || uploadFile.name);
      formData.append("altText", uploadAltText || uploadTitle || uploadFile.name);
      formData.append("type", uploadType);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        return;
      }

      setAssets((prev) => [data.asset, ...prev]);
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadTitle("");
      setUploadAltText("");
    } catch {
      setUploadError("Network error during file upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!activeWorkspace) return;
    if (!confirm("Are you sure you want to delete this media asset?")) return;

    try {
      const res = await fetch(`/api/media/${assetId}?workspaceId=${activeWorkspace.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
        if (previewAsset?.id === assetId) {
          setPreviewAsset(null);
        }
      }
    } catch (err) {
      console.error("Delete asset error:", err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.prompt && asset.prompt.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (asset.altText && asset.altText.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === "all" || asset.type === selectedType;
    const matchesStyle = selectedStyle === "all" || asset.style === selectedStyle;

    return matchesSearch && matchesType && matchesStyle;
  });

  const featuredCount = assets.filter((a) => a.type === "featured_image").length;
  const diagramCount = assets.filter((a) => a.type === "inline_diagram" || a.type === "infographic").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Media & Assets
            </h1>
            <Badge variant="outline" className="text-[11px] font-normal text-slate-600 bg-slate-100">
              Media Library
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Generate and manage featured hero imagery, diagrams, and media for your articles.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2 text-slate-500" />
            Upload Asset
          </Button>

          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium"
            onClick={() => setIsGenerateOpen(true)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Image
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Assets</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{assets.length}</p>
            </div>
            <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600">
              <ImageIcon className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Featured Images</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{featuredCount}</p>
            </div>
            <div className="p-2.5 bg-orange-50 rounded-lg text-orange-600">
              <Wand2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Diagrams & Vectors</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{diagramCount}</p>
            </div>
            <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Storage Engine</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">S3 Cloud Storage</p>
              <p className="text-[11px] text-slate-400">Zero data-loss storage</p>
            </div>
            <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets by title, prompt, or alt text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-orange-500 transition-colors"
          >
            <option value="all">All Types</option>
            <option value="featured_image">Featured Images</option>
            <option value="inline_diagram">Inline Diagrams</option>
            <option value="infographic">Infographics</option>
            <option value="attachment">Attachments</option>
          </select>

          {/* Style Filter */}
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-orange-500 transition-colors"
          >
            <option value="all">All Styles</option>
            <option value="dark_tech">Dark Tech</option>
            <option value="minimalist_vector">Minimalist Vector</option>
            <option value="architectural_blueprint">Blueprint</option>
            <option value="editorial_photo">Editorial Photo</option>
            <option value="isometric_3d">Isometric 3D</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchMedia}
            className="text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Asset Grid */}
      {isLoading ? (
        <Card className="p-16 text-center text-slate-500 text-sm bg-white border-slate-200">
          <RefreshCw className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
          Loading media library assets...
        </Card>
      ) : filteredAssets.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white p-16 text-center">
          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No media assets found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Generate custom visuals, diagrams, or upload brand illustrations for your content.
          </p>
          <div className="flex justify-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="border-slate-200 text-slate-700"
            >
              Upload Asset
            </Button>
            <Button
              size="sm"
              onClick={() => setIsGenerateOpen(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Generate Image
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssets.map((asset) => (
            <Card
              key={asset.id}
              className="bg-white border-slate-200 overflow-hidden group hover:border-slate-300 hover:shadow-sm transition-all flex flex-col"
            >
              {/* Image Preview Container */}
              <div
                className="relative aspect-video bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border-b border-slate-100"
                onClick={() => setPreviewAsset(asset)}
              >
                <img
                  src={asset.publicUrl}
                  alt={asset.altText || asset.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />

                {/* Overlay Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                  <Badge variant="outline" className="bg-white/90 backdrop-blur-sm text-[10px] text-slate-800 border-slate-200">
                    {asset.aspectRatio || "16:9"}
                  </Badge>
                  {asset.style && (
                    <Badge variant="outline" className="bg-orange-50/90 backdrop-blur-sm text-[10px] text-orange-700 border-orange-200 font-medium">
                      {asset.style.replace("_", " ")}
                    </Badge>
                  )}
                </div>

                {/* Action Hover Buttons */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white text-slate-800 hover:bg-slate-100 h-8 px-2.5 border-transparent shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewAsset(asset);
                    }}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 text-slate-600" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white text-slate-800 hover:bg-slate-100 h-8 px-2.5 border-transparent shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(asset.publicUrl, `url_${asset.id}`);
                    }}
                  >
                    {copiedId === `url_${asset.id}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Card Content Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-900 truncate" title={asset.title}>
                      {asset.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-mono bg-slate-100 text-slate-600 border-slate-200 shrink-0"
                    >
                      {asset.type.replace("_", " ")}
                    </Badge>
                  </div>

                  {asset.prompt && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2" title={asset.prompt}>
                      {asset.prompt}
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
                  <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center space-x-1">
                    {asset.prompt && (
                      <button
                        onClick={() => copyToClipboard(asset.prompt!, `p_${asset.id}`)}
                        className="p-1 hover:text-slate-700 text-slate-400 transition-colors"
                        title="Copy AI Prompt"
                      >
                        {copiedId === `p_${asset.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="p-1 hover:text-red-600 text-slate-400 transition-colors"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* GENERATE MODAL */}
      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Generate Image</h3>
                <p className="text-xs text-slate-500 mt-0.5">Create visuals and hero graphics for articles</p>
              </div>
              <button
                onClick={() => setIsGenerateOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {genError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                {genError}
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Concept Topic */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Visual Topic / Subject <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Cloud Architecture and Microservices"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Link to Content Item */}
              {contentItems.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Associated Content Article (Optional)
                  </label>
                  <select
                    value={genContentId}
                    onChange={(e) => setGenContentId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">None (Standalone Asset)</option>
                    {contentItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} ({item.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Style Presets */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Visual Style
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STYLE_OPTIONS.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setGenStyle(style.id)}
                      className={`p-2.5 rounded-lg text-left border transition-all ${
                        genStyle === style.id
                          ? "bg-orange-50 border-orange-500 text-orange-950 ring-1 ring-orange-500"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-xs font-semibold">{style.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setGenRatio(ratio.id)}
                      className={`p-2 rounded-md text-center border text-xs font-medium transition-all ${
                        genRatio === ratio.id
                          ? "bg-orange-600 border-orange-600 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt Modifier */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Custom Prompt Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Minimal vector shapes, clean white background..."
                  value={genCustomPrompt}
                  onChange={(e) => setGenCustomPrompt(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGenerateOpen(false)}
                  className="border-slate-200 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isGenerating || !genTopic.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Generate Asset
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Upload Media Asset</h3>
                <p className="text-xs text-slate-500 mt-0.5">Add images, diagrams, or graphics to your library</p>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Select File (PNG, JPEG, WebP, SVG, GIF up to 5MB)
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-lg p-5 text-center bg-slate-50 transition-colors">
                  <input
                    type="file"
                    required
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFile(file);
                        if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
                      }
                    }}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer"
                  />
                  {uploadFile && (
                    <p className="text-xs text-emerald-600 mt-2 font-medium">
                      Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Asset Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Architecture Diagram"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Alt Text */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Alt Text
                </label>
                <input
                  type="text"
                  placeholder="Describe image for SEO and accessibility"
                  value={uploadAltText}
                  onChange={(e) => setUploadAltText(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Asset Type */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Asset Type
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as MediaType)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                >
                  <option value="featured_image">Featured Image</option>
                  <option value="inline_diagram">Inline Diagram</option>
                  <option value="infographic">Infographic</option>
                  <option value="attachment">Attachment / Resource</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadOpen(false)}
                  className="border-slate-200 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUploading || !uploadFile}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Upload Asset
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-6 shadow-xl space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{previewAsset.title}</h3>
                <p className="text-xs text-slate-500">
                  {previewAsset.type.replace("_", " ")} • {previewAsset.aspectRatio || "16:9"} • {previewAsset.style?.replace("_", " ") || "Custom"}
                </p>
              </div>
              <button
                onClick={() => setPreviewAsset(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Image Frame */}
            <div className="w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
              <img
                src={previewAsset.publicUrl}
                alt={previewAsset.altText || previewAsset.title}
                className="w-full max-h-[55vh] object-contain"
              />
            </div>

            {/* Metadata & Prompts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {previewAsset.prompt && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-700">AI Prompt</span>
                    <button
                      onClick={() => copyToClipboard(previewAsset.prompt!, "prev_prompt")}
                      className="text-orange-600 hover:text-orange-700 flex items-center"
                    >
                      {copiedId === "prev_prompt" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-slate-600 leading-relaxed font-mono text-[11px]">
                    {previewAsset.prompt}
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div>
                  <span className="font-semibold text-slate-700 block">Alt Text:</span>
                  <span className="text-slate-600">{previewAsset.altText || "None"}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block">Storage Key:</span>
                  <span className="text-slate-500 font-mono text-[10px] break-all">{previewAsset.storageKey}</span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(previewAsset.id)}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Asset
              </Button>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(previewAsset.publicUrl, "prev_url")}
                  className="border-slate-200 text-slate-700"
                >
                  {copiedId === "prev_url" ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                      Copied URL
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copy URL
                    </>
                  )}
                </Button>

                <a
                  href={previewAsset.publicUrl}
                  download={`${previewAsset.title.replace(/[^a-zA-Z0-9]/g, "_")}.png`}
                  className="inline-flex items-center justify-center text-xs font-medium px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
