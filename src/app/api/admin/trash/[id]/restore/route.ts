import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";
import { WebsiteSyncService } from "@/lib/export/website-sync";
import { ContentItem, ContentVersion } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const workspaceId = body.workspaceId || searchParams.get("workspaceId") || "ws_default_neno";

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    const item = await ContentService.getById(workspaceId, params.id, { allowDeleted: true });
    if (!item) {
      return NextResponse.json({ error: "Item not found in Trash" }, { status: 404 });
    }

    const restored = await ContentService.restore(workspaceId, params.id);
    if (!restored) {
      return NextResponse.json({ error: "Failed to restore item" }, { status: 500 });
    }

    let rePublishedToWebsite = false;
    // If it was previously published, re-publish it to website
    if (restored.status === "approved" || restored.status === "exported") {
      const latestVer = await VersionService.getLatest(params.id);
      if (latestVer) {
        const itemFormatted: ContentItem = {
          id: restored.id,
          workspaceId,
          type: restored.type,
          title: restored.title,
          slug: restored.slug,
          status: restored.status,
          category: restored.category,
          excerpt: restored.excerpt,
          currentVersionId: latestVer.id,
          createdBy: restored.created_by,
          createdAt: new Date(restored.created_at).toISOString(),
          updatedAt: new Date(restored.updated_at).toISOString(),
        };
        const versionFormatted: ContentVersion = {
          id: latestVer.id,
          contentId: latestVer.content_id,
          versionNumber: latestVer.version_number,
          content: latestVer.content,
          seoMetadata: latestVer.seo_metadata as ContentVersion["seoMetadata"],
          createdBy: latestVer.created_by,
          createdAt: new Date(latestVer.created_at).toISOString(),
        };

        if (restored.type === "blog") {
          const res = await WebsiteSyncService.publishBlog(itemFormatted, versionFormatted, workspaceId);
          rePublishedToWebsite = res.success;
        } else if (restored.type === "case-study") {
          const res = await WebsiteSyncService.publishCaseStudy(itemFormatted, versionFormatted, workspaceId);
          rePublishedToWebsite = res.success;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `"${restored.title}" restored successfully${rePublishedToWebsite ? " and republished to website" : ""}.`,
      item: restored,
      rePublishedToWebsite,
    });
  } catch (err: unknown) {
    console.error("Single restore route error:", err);
    const msg = err instanceof Error ? err.message : "Failed to restore";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
