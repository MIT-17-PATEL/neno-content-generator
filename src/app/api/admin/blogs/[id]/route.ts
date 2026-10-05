import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";
import { WebsiteSyncService } from "@/lib/export/website-sync";
import { ContentItem, ContentVersion } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || "ws_default_neno";

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  const item = await ContentService.getById(workspaceId, params.id);
  if (!item) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  }

  const currentVersion = await VersionService.getLatest(params.id);

  return NextResponse.json({
    item,
    version: currentVersion,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const workspaceId = body.workspaceId || "ws_default_neno";

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    const existing = await ContentService.getById(workspaceId, params.id);
    if (!existing) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    // Determine updated status
    let mappedStatus = existing.status;
    if (body.status === "Published" || body.status === "approved") {
      mappedStatus = "approved";
    } else if (body.status === "Scheduled" || body.status === "in_review") {
      mappedStatus = "in_review";
    } else if (body.status === "Draft" || body.status === "draft") {
      mappedStatus = "draft";
    }

    const updatedItem = await ContentService.updateItem(workspaceId, params.id, {
      title: body.title !== undefined ? body.title : existing.title,
      slug: body.slug !== undefined ? body.slug : existing.slug,
      category: body.category !== undefined ? body.category : existing.category,
      excerpt: body.shortDescription !== undefined ? body.shortDescription : existing.excerpt,
      status: mappedStatus,
    });

    // Create a new version if content or SEO metadata was updated
    const latestVersion = await VersionService.getLatest(params.id);
    const newContent = body.content !== undefined ? body.content : (latestVersion?.content || "");
    const existingMeta = (latestVersion?.seo_metadata || {}) as Record<string, unknown>;

    const updatedMeta = {
      ...existingMeta,
      seoTitle: body.seoTitle || existingMeta.seoTitle || body.title,
      metaDescription: body.metaDescription || existingMeta.metaDescription || body.shortDescription,
      keywords: body.keywords || existingMeta.keywords || [],
      featuredImageBrief: body.featuredImage !== undefined ? body.featuredImage : existingMeta.featuredImageBrief,
      ogImage: body.ogImage || existingMeta.ogImage,
      canonicalUrl: body.canonicalUrl || existingMeta.canonicalUrl,
      author: body.author || existingMeta.author || auth.user.name,
      tags: body.tags || existingMeta.tags || [],
    };

    const newVersion = await VersionService.createVersion({
      contentId: params.id,
      content: newContent,
      seoMetadata: updatedMeta,
      createdBy: auth.user.userId,
    });

    // If published, sync with website
    if (mappedStatus === "approved" || body.publishNow) {
      const itemFormatted: ContentItem = {
        id: updatedItem?.id || params.id,
        workspaceId,
        type: "blog",
        title: updatedItem?.title || body.title,
        slug: updatedItem?.slug || body.slug,
        status: "approved",
        category: updatedItem?.category || body.category,
        excerpt: updatedItem?.excerpt || body.shortDescription,
        currentVersionId: newVersion.id,
        createdBy: updatedItem?.created_by || auth.user.userId,
        createdAt: new Date(updatedItem?.created_at || Date.now()).toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const versionFormatted: ContentVersion = {
        id: newVersion.id,
        contentId: newVersion.content_id,
        versionNumber: newVersion.version_number,
        content: newVersion.content,
        seoMetadata: updatedMeta as ContentVersion["seoMetadata"],
        createdBy: newVersion.created_by,
        createdAt: new Date(newVersion.created_at).toISOString(),
      };
      await WebsiteSyncService.publishBlog(itemFormatted, versionFormatted, workspaceId, body.author || auth.user.name);
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
      version: newVersion,
    });
  } catch (error: unknown) {
    console.error("Admin blog update error:", error);
    const msg = error instanceof Error ? error.message : "Failed to update blog";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || "ws_default_neno";

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  const item = await ContentService.getById(workspaceId, params.id);
  if (!item) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  }

  // Delete from website first
  if (item.slug) {
    await WebsiteSyncService.deleteFromWebsite(item.slug);
  }
  await WebsiteSyncService.deleteFromWebsite(item.id);

  // Delete from local store
  await ContentService.delete(workspaceId, params.id);

  return NextResponse.json({ success: true, message: "Blog deleted successfully" });
}
