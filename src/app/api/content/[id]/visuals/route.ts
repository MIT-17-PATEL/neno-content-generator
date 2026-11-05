import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";
import { MediaService } from "@/services/media-service";
import {
  BlogVisual,
  InlineType,
  coverFromUpload,
  coverMetadata,
  existingCoverHashes,
  makeCover,
  makeInline,
  planVisuals,
} from "@/lib/ai/blog-visuals";
import { findStockCandidates, selectStockPhoto, stockKey } from "@/lib/ai/stock-photos";

// Review-step visual actions. Each one saves a new content version; nothing here publishes.
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("regenerate-cover"), workspaceId: z.string().min(1), type: z.enum(["diagram", "photo"]) }),
  z.object({
    action: z.literal("upload-cover"),
    workspaceId: z.string().min(1),
    // ~10 MB of base64
    dataUri: z.string().max(14_000_000).regex(/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/, "Must be a PNG, JPEG, WebP or GIF image"),
    alt: z.string().max(300).optional(),
  }),
  z.object({ action: z.literal("regenerate-inline"), workspaceId: z.string().min(1), index: z.number().int().min(0).max(1) }),
  z.object({ action: z.literal("stock-search"), workspaceId: z.string().min(1), query: z.string().trim().max(100).optional() }),
  z.object({
    action: z.literal("stock-select"),
    workspaceId: z.string().min(1),
    provider: z.enum(["pexels", "unsplash"]),
    id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, "Invalid photo id"),
  }),
]);

type InlineMeta = { kind: string; dataUri: string; alt: string; caption?: string; afterHeading?: string; inlineType?: InlineType; mermaid?: string };

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const wsAuth = await requireWorkspaceAccess(req, body.workspaceId);
  if ("error" in wsAuth) return wsAuth.error;

  const item = await ContentService.getById(body.workspaceId, params.id);
  if (!item) return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  const version = await VersionService.getLatest(params.id);
  if (!version) return NextResponse.json({ error: "No draft to update" }, { status: 404 });

  try {
    const meta = { ...((version.seo_metadata || {}) as Record<string, unknown>) };
    const post = { title: item.title, article: version.content, workspaceId: body.workspaceId };
    const warnings: string[] = [];
    let newCover: BlogVisual | null = null;

    if (body.action === "regenerate-cover") {
      const used = await existingCoverHashes(body.workspaceId);
      used.add(String(meta.coverHash || "")); // a regenerate must actually change the cover
      newCover = await makeCover(post, body.type, warnings, used);
      if (!newCover) return NextResponse.json({ error: warnings.join(" ") || "Cover generation failed" }, { status: 502 });
    } else if (body.action === "stock-search") {
      // Search only: nothing is saved until a photo is picked.
      return NextResponse.json(await findStockCandidates(post, params.id, body.query));
    } else if (body.action === "stock-select") {
      newCover = await selectStockPhoto(body.provider, body.id, body.workspaceId, params.id);
    } else if (body.action === "upload-cover") {
      newCover = await coverFromUpload(body.dataUri, body.alt?.trim() || `Cover image for ${item.title}`);
    } else {
      const inline = [...((meta.inlineVisuals as InlineMeta[]) || [])];
      const cur = inline[body.index];
      const spec = cur?.afterHeading
        ? { type: cur.inlineType || "flow", after_heading: cur.afterHeading, caption: cur.caption || cur.alt }
        : (await planVisuals(post)).inline[body.index];
      if (!spec) return NextResponse.json({ error: "No section in this post calls for an inline visual" }, { status: 422 });
      const v = await makeInline(post, spec, warnings);
      if (!v) return NextResponse.json({ error: warnings.join(" ") || "Inline visual failed" }, { status: 502 });
      inline[body.index] = { kind: v.kind, dataUri: v.dataUri, alt: v.alt, caption: v.caption, afterHeading: v.afterHeading, inlineType: v.inlineType, mermaid: v.mermaid };
      meta.inlineVisuals = inline.filter(Boolean);
    }

    if (newCover) {
      Object.assign(meta, coverMetadata(newCover));
      await MediaService.create({
        workspaceId: body.workspaceId,
        contentId: params.id,
        type: "featured_image",
        title: `${item.title} — Cover (${newCover.kind})`,
        prompt: newCover.mermaid || newCover.caption || newCover.alt,
        altText: newCover.alt,
        aspectRatio: "16:9",
        style: newCover.kind === "diagram" ? "dark_tech" : "editorial_photo",
        storageKey: `generated/${params.id}_${newCover.hash.slice(0, 12)}.webp`,
        publicUrl: newCover.dataUri,
        fileSize: Math.round((newCover.dataUri.length * 3) / 4),
        mimeType: newCover.dataUri.startsWith("data:") ? "image/webp" : "image/jpeg",
        // provider + photo id, so the same stock photo is never used as another post's cover
        metadata: newCover.stock ? { stockKey: stockKey(newCover.stock.provider, newCover.stock.id), credit: newCover.credit } : undefined,
      });
    }
    meta.visualWarnings = warnings;

    await VersionService.createVersion({
      contentId: params.id,
      content: version.content,
      seoMetadata: meta,
      createdBy: auth.user.userId,
    });
    return NextResponse.json({ success: true, warnings });
  } catch (err) {
    console.error("Visual action failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Visual action failed" }, { status: 500 });
  }
}

// LLM / image / publish work can take minutes; 300s is the Vercel max with Fluid compute (Hobby).
export const maxDuration = 300;
