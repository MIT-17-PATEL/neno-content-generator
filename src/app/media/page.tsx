/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Image as ImageIcon,
  Sparkles,
  Upload,
  Search,
  Filter,
  Trash2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Layers,
  Wand2,
  RefreshCw,
  Eye,
  X,
  FileText,
  SlidersHorizontal,
  HardDrive,
  Info,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MediaAsset, MediaType, ImageAspectRatio, ImageStylePreset, ContentItem } from "@/types";

const STYLE_OPTIONS: Array<{ id: ImageStylePreset; label: string; desc: string }> = [
  { id: "dark_tech", label: "Dark Tech Isometric", desc: "Slate glass, glowing cyan/emerald data channels, volumetric lighting" },
  { id: "minimalist_vector", label: "Minimalist Vector", desc: "Swiss modernist flat vector shapes, refined monochrome palette" },
  { id: "architectural_blueprint", label: "Architectural Blueprint", desc: "Technical CAD schematics, cyan grid wireframes, engineering aesthetic" },
  { id: "editorial_photo", label: "Editorial Photo", desc: "Corporate studio lighting, natural depth of field, executive look" },
  { id: "isometric_3d", label: "Isometric 3D Cloud", desc: "Floating infrastructure platforms, microchips, data conduits" },
];

const ASPECT_RATIOS: Array<{ id: ImageAspectRatio; label: string; ratioClass: string }> = [
  { id: "16:9", label: "16:9 Landscape (Hero)", ratioClass: "aspect-video" },
  { id: "1:1", label: "1:1 Square (Social)", ratioClass: "aspect-square" },
  { id: "4:3", label: "4:3 Standard (Card)", ratioClass: "aspect-[4/3]" },
  { id: "9:16", label: "9:16 Story (Mobile)", ratioClass: "aspect-[9/16]" },
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
  const [genCategory, setGenCategory] = useState("Engineering");
  const [genStyle, setGenStyle] = useState<ImageStylePreset>("dark_tech");
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
    } catch (err) {
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
    } catch (err) {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-studio-800/60 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Media & Visual Assets
            </h1>
            <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              Phase 10 Active
            </Badge>
          </div>
          <p className="text-sm text-studio-400 mt-1">
            Generate featured hero imagery, architectural diagrams, vector infographics, and manage S3 media.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            className="border-studio-700 bg-studio-900/50 hover:bg-studio-800 text-studio-200"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Asset
          </Button>

          <Button
            variant="primary"
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
            onClick={() => setIsGenerateOpen(true)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Image
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-studio-900/40 border-studio-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-studio-400 font-medium">Total Assets</p>
              <p className="text-2xl font-bold text-white mt-1">{assets.length}</p>
            </div>
            <div className="p-3 bg-studio-800/50 rounded-lg text-studio-300">
              <ImageIcon className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-studio-900/40 border-studio-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-studio-400 font-medium">Featured Visuals</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{featuredCount}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Wand2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-studio-900/40 border-studio-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-studio-400 font-medium">Diagrams & Vectors</p>
              <p className="text-2xl font-bold text-indigo-400 mt-1">{diagramCount}</p>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-studio-900/40 border-studio-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-studio-400 font-medium">Storage Engine</p>
              <p className="text-sm font-semibold text-studio-200 mt-1">S3 / Vector Data</p>
              <p className="text-[11px] text-studio-500">Zero data-loss storage</p>
            </div>
            <div className="p-3 bg-studio-800/50 rounded-lg text-studio-400">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-studio-900/30 p-4 rounded-xl border border-studio-800/60">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-studio-400" />
          <input
            type="text"
            placeholder="Search assets by title, prompt, or alt text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-studio-950/60 border border-studio-800 rounded-lg text-sm text-white placeholder-studio-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-studio-950 border border-studio-800 rounded-lg px-3 py-2 text-xs text-studio-200 focus:outline-none focus:border-indigo-500"
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
            className="bg-studio-950 border border-studio-800 rounded-lg px-3 py-2 text-xs text-studio-200 focus:outline-none focus:border-indigo-500"
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
            className="text-studio-400 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Asset Grid */}
      {isLoading ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-studio-400">Loading media library assets...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card className="border-dashed border-studio-800 bg-studio-950/20 p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-studio-900 border border-studio-800 flex items-center justify-center mx-auto mb-4 text-studio-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No media assets found</h3>
          <p className="text-xs text-studio-400 max-w-md mx-auto mt-1 mb-6">
            Generate custom featured visuals, diagrams, or upload brand illustrations for your content.
          </p>
          <div className="flex justify-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="border-studio-700 text-studio-300"
            >
              Upload Asset
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsGenerateOpen(true)}
              className="bg-indigo-600 text-white"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Generate Image
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssets.map((asset) => {
            const isSvg = asset.publicUrl.startsWith("data:image/svg");
            return (
              <Card
                key={asset.id}
                className="bg-studio-900/50 border-studio-800/80 overflow-hidden group hover:border-studio-700 transition-all flex flex-col"
              >
                {/* Image Preview Container */}
                <div
                  className="relative aspect-video bg-studio-950 overflow-hidden cursor-pointer flex items-center justify-center border-b border-studio-800/50"
                  onClick={() => setPreviewAsset(asset)}
                >
                  <img
                    src={asset.publicUrl}
                    alt={asset.altText || asset.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Overlay Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                    <Badge variant="outline" className="bg-black/70 backdrop-blur-sm text-[10px] text-studio-200 border-white/10">
                      {asset.aspectRatio || "16:9"}
                    </Badge>
                    {asset.style && (
                      <Badge variant="outline" className="bg-indigo-950/80 backdrop-blur-sm text-[10px] text-indigo-300 border-indigo-500/20">
                        {asset.style.replace("_", " ")}
                      </Badge>
                    )}
                  </div>

                  {/* Action Hover Buttons */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-studio-900/90 border-studio-700 text-white hover:bg-studio-800 h-8 px-2.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewAsset(asset);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-studio-900/90 border-studio-700 text-white hover:bg-studio-800 h-8 px-2.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(asset.publicUrl, `url_${asset.id}`);
                      }}
                    >
                      {copiedId === `url_${asset.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Card Content Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-white truncate" title={asset.title}>
                        {asset.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-mono bg-studio-800/40 text-studio-400 border-studio-700/50 shrink-0"
                      >
                        {asset.type.replace("_", " ")}
                      </Badge>
                    </div>

                    {asset.prompt && (
                      <p className="text-xs text-studio-400 mt-1 line-clamp-2" title={asset.prompt}>
                        {asset.prompt}
                      </p>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-studio-800/60 text-xs text-studio-500">
                    <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-1">
                      {asset.prompt && (
                        <button
                          onClick={() => copyToClipboard(asset.prompt!, `p_${asset.id}`)}
                          className="p-1 hover:text-studio-200 transition-colors"
                          title="Copy AI Prompt"
                        >
                          {copiedId === `p_${asset.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="p-1 hover:text-red-400 transition-colors"
                        title="Delete Asset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* GENERATE MODAL */}
      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-studio-900 border border-studio-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-studio-800 pb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Generate Featured Visual</h3>
                  <p className="text-xs text-studio-400">Multi-style AI visual engine for blogs and case studies</p>
                </div>
              </div>
              <button
                onClick={() => setIsGenerateOpen(false)}
                className="text-studio-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {genError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                {genError}
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Concept Topic */}
              <div>
                <label className="block text-xs font-semibold text-studio-200 mb-1.5">
                  Visual Concept / Topic <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus in Multi-Region Kubernetes Architecture"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-studio-950 border border-studio-800 rounded-lg text-sm text-white placeholder-studio-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Link to Content Item */}
              {contentItems.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-studio-200 mb-1.5">
                    Link to Content Article (Optional)
                  </label>
                  <select
                    value={genContentId}
                    onChange={(e) => setGenContentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-studio-950 border border-studio-800 rounded-lg text-xs text-studio-200 focus:outline-none focus:border-indigo-500"
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
                <label className="block text-xs font-semibold text-studio-200 mb-2">
                  Visual Style Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STYLE_OPTIONS.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setGenStyle(style.id)}
                      className={`p-3 rounded-lg text-left border transition-all ${
                        genStyle === style.id
                          ? "bg-indigo-950/40 border-indigo-500 text-white shadow-sm shadow-indigo-500/10"
                          : "bg-studio-950/60 border-studio-800/80 text-studio-400 hover:border-studio-700 hover:text-studio-200"
                      }`}
                    >
                      <p className="text-xs font-bold text-studio-100">{style.label}</p>
                      <p className="text-[11px] text-studio-400 mt-1 line-clamp-2">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-xs font-semibold text-studio-200 mb-2">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setGenRatio(ratio.id)}
                      className={`p-2.5 rounded-lg text-center border text-xs font-medium transition-all ${
                        genRatio === ratio.id
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-studio-950 border-studio-800 text-studio-400 hover:border-studio-700 hover:text-white"
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt Modifier */}
              <div>
                <label className="block text-xs font-semibold text-studio-200 mb-1.5">
                  Custom Prompt Directions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Emphasize deep purple volumetric lighting and clean glass reflections..."
                  value={genCustomPrompt}
                  onChange={(e) => setGenCustomPrompt(e.target.value)}
                  className="w-full px-3.5 py-2 bg-studio-950 border border-studio-800 rounded-lg text-xs text-white placeholder-studio-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-studio-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGenerateOpen(false)}
                  className="border-studio-700 text-studio-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isGenerating || !genTopic.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Synthesizing Visual...
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-studio-900 border border-studio-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-studio-800 pb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-studio-800 rounded-lg text-studio-200">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Upload Media Asset</h3>
                  <p className="text-xs text-studio-400">Securely ingest images, diagrams, or charts into workspace</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-studio-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-studio-200 mb-1.5">
                  Select File (PNG, JPEG, WebP, SVG, GIF up to 5MB)
                </label>
                <div className="border-2 border-dashed border-studio-800 hover:border-indigo-500/50 rounded-xl p-6 text-center bg-studio-950/40 transition-colors">
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
                    className="w-full text-xs text-studio-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                  {uploadFile && (
                    <p className="text-xs text-emerald-400 mt-2">
                      Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-studio-200 mb-1.5">
                  Asset Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Architecture Topology Diagram"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-studio-950 border border-studio-800 rounded-lg text-sm text-white placeholder-studio-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Alt Text */}
              <div>
                <label className="block text-xs font-semibold text-studio-200 mb-1.5">
                  Accessibility Alt Text
                </label>
                <input
                  type="text"
                  placeholder="Describe image for SEO and screen readers"
                  value={uploadAltText}
                  onChange={(e) => setUploadAltText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-studio-950 border border-studio-800 rounded-lg text-sm text-white placeholder-studio-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Asset Type */}
              <div>
                <label className="block text-xs font-semibold text-studio-200 mb-1.5">
                  Asset Classification
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as MediaType)}
                  className="w-full px-3.5 py-2.5 bg-studio-950 border border-studio-800 rounded-lg text-xs text-studio-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="featured_image">Featured Image</option>
                  <option value="inline_diagram">Inline Diagram</option>
                  <option value="infographic">Infographic</option>
                  <option value="attachment">Attachment / Resource</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-studio-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadOpen(false)}
                  className="border-studio-700 text-studio-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isUploading || !uploadFile}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Upload to Library
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-studio-900 border border-studio-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-studio-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{previewAsset.title}</h3>
                <p className="text-xs text-studio-400">
                  {previewAsset.type.replace("_", " ")} • {previewAsset.aspectRatio || "16:9"} • {previewAsset.style?.replace("_", " ") || "Custom"}
                </p>
              </div>
              <button
                onClick={() => setPreviewAsset(null)}
                className="text-studio-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Image Frame */}
            <div className="w-full bg-studio-950 rounded-xl overflow-hidden border border-studio-800 flex items-center justify-center">
              <img
                src={previewAsset.publicUrl}
                alt={previewAsset.altText || previewAsset.title}
                className="w-full max-h-[55vh] object-contain"
              />
            </div>

            {/* Metadata & Prompts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {previewAsset.prompt && (
                <div className="p-3 bg-studio-950/60 rounded-xl border border-studio-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-studio-200">AI Diffusion Prompt</span>
                    <button
                      onClick={() => copyToClipboard(previewAsset.prompt!, "prev_prompt")}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center"
                    >
                      {copiedId === "prev_prompt" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-studio-400 leading-relaxed font-mono text-[11px]">
                    {previewAsset.prompt}
                  </p>
                </div>
              )}

              <div className="p-3 bg-studio-950/60 rounded-xl border border-studio-800/80 space-y-2">
                <div>
                  <span className="font-semibold text-studio-200 block">Accessibility Alt Text:</span>
                  <span className="text-studio-400">{previewAsset.altText || "None"}</span>
                </div>
                <div>
                  <span className="font-semibold text-studio-200 block">Storage Key:</span>
                  <span className="text-studio-500 font-mono text-[10px] break-all">{previewAsset.storageKey}</span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-studio-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(previewAsset.id)}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Asset
              </Button>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(previewAsset.publicUrl, "prev_url")}
                  className="border-studio-700 text-studio-300"
                >
                  {copiedId === "prev_url" ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      Copied URL
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copy Public URL
                    </>
                  )}
                </Button>

                <a
                  href={previewAsset.publicUrl}
                  download={`${previewAsset.title.replace(/[^a-zA-Z0-9]/g, "_")}.png`}
                  className="inline-flex items-center justify-center text-xs font-semibold px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
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
