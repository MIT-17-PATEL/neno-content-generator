import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { dataStore } from "@/server/data-store";
import { MediaService } from "@/services/media-service";
import { ImageGenerator } from "@/lib/ai/image-generator";
import { z } from "zod";

const generateImageSchema = z.object({
  workspaceId: z.string().min(1),
  contentId: z.string().optional(),
  topic: z.string().min(2, "Topic must be at least 2 characters"),
  category: z.string().optional(),
  summary: z.string().optional(),
  keyConcepts: z.array(z.string()).optional(),
  industry: z.string().optional(),
  articleType: z.enum(["blog", "case-study", "research", "technical-guide"]).optional(),
  style: z
    .enum(["dark_tech", "minimalist_vector", "architectural_blueprint", "editorial_photo", "isometric_3d"])
    .default("dark_tech"),
  aspectRatio: z.enum(["16:9", "1:1", "4:3", "9:16"]).default("16:9"),
  customPrompt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = generateImageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      workspaceId,
      contentId,
      topic,
      category,
      summary,
      keyConcepts,
      industry,
      articleType,
      style,
      aspectRatio,
      customPrompt,
    } = parsed.data;

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    const brand = await dataStore.getBrandSettings(workspaceId);

    // Generate image and semantic prompts
    const generated = await ImageGenerator.generate({
      topic,
      category,
      summary,
      keyConcepts,
      industry,
      articleType,
      style,
      aspectRatio,
      customPrompt,
      brandName: brand?.brand_name,
    });

    // Store in Media Service
    const asset = await MediaService.create({
      workspaceId,
      contentId,
      type: "featured_image",
      title: generated.title,
      prompt: generated.prompt,
      altText: generated.altText,
      aspectRatio: generated.aspectRatio,
      style: generated.style,
      storageKey: generated.storageKey,
      publicUrl: generated.publicUrl,
      fileSize: 45200,
      mimeType: generated.publicUrl.startsWith("data:image/svg") ? "image/svg+xml" : "image/png",
    });

    return NextResponse.json({
      success: true,
      asset,
      visualConcept: generated.visualConcept,
      colorPalette: generated.colorPalette,
    });
  } catch (error) {
    console.error("Generate media asset error:", error);
    return NextResponse.json({ error: "Failed to generate media asset" }, { status: 500 });
  }
}
