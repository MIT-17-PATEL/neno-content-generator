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
    return NextResponse.json({ error: "Case study not found" }, { status: 404 });
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
      return NextResponse.json({ error: "Case study not found" }, { status: 404 });
    }

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
      category: body.industry || body.category || existing.category,
      excerpt: body.description !== undefined ? body.description : existing.excerpt,
      status: mappedStatus,
    });

    const latestVersion = await VersionService.getLatest(params.id);
    const existingMeta = (latestVersion?.seo_metadata || {}) as Record<string, unknown>;

    let compiledContent = body.content;
    const sections = Array.isArray(body.sections) ? body.sections : (existingMeta.sections as Array<{ title: string; content: string }> || []);

    if (!compiledContent && sections.length > 0) {
      compiledContent = `# ${body.title || existing.title}\n\n` +
        sections.map((s: { title: string; content: string }) => `## ${s.title}\n\n${s.content}`).join("\n\n---\n\n");
    } else if (!compiledContent) {
      compiledContent = latestVersion?.content || `# ${body.title || existing.title}`;
    }

    const updatedMeta = {
      ...existingMeta,
      clientName: body.clientName !== undefined ? body.clientName : existingMeta.clientName,
      industry: body.industry || updatedItem?.category,
      location: body.location !== undefined ? body.location : existingMeta.location,
      coverImage: body.coverImage !== undefined ? body.coverImage : existingMeta.coverImage,
      featuredImageBrief: body.coverImage !== undefined ? body.coverImage : existingMeta.coverImage,
      sections: sections,
      techStack: body.techStack !== undefined ? body.techStack : existingMeta.techStack,
      impactMetrics: body.impactMetrics !== undefined ? body.impactMetrics : existingMeta.impactMetrics,
    };

    const newVersion = await VersionService.createVersion({
      contentId: params.id,
      content: compiledContent,
      seoMetadata: updatedMeta,
      createdBy: auth.user.userId,
    });

    // If published, sync with website
    if (mappedStatus === "approved" || body.publishNow) {
      const itemFormatted: ContentItem = {
        id: updatedItem?.id || params.id,
        workspaceId,
        type: "case-study",
        title: updatedItem?.title || body.title,
        slug: updatedItem?.slug || body.slug,
        status: "approved",
        category: updatedItem?.category || body.category,
        excerpt: updatedItem?.excerpt || body.description,
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
      await WebsiteSyncService.publishCaseStudy(itemFormatted, versionFormatted, workspaceId);
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
      version: newVersion,
    });
  } catch (error: unknown) {
    console.error("Admin case study update error:", error);
    const msg = error instanceof Error ? error.message : "Failed to update case study";
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
    return NextResponse.json({ error: "Case study not found" }, { status: 404 });
  }

  // 1. Immediately delete from live website
  if (item.slug) {
    await WebsiteSyncService.deleteCaseStudyFromWebsite(item.slug, item.title);
  }
  await WebsiteSyncService.deleteCaseStudyFromWebsite(item.id, item.title);

  // 2. Soft-delete locally into Trash (7-day recovery period)
  await ContentService.softDelete(workspaceId, params.id, auth.user.userId);

  return NextResponse.json({
    success: true,
    message: "Case study moved to Trash (retained for 7 days)",
    trashed: true,
  });
}
