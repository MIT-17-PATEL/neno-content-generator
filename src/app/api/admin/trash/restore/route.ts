import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";
import { WebsiteSyncService } from "@/lib/export/website-sync";
import { ContentItem, ContentVersion } from "@/types";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const workspaceId = body.workspaceId || "ws_default_neno";
    const ids: string[] = body.ids || [];

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    let restoredCount = 0;
    for (const id of ids) {
      const item = await ContentService.getById(workspaceId, id, { allowDeleted: true });
      if (item) {
        const restored = await ContentService.restore(workspaceId, id);
        if (restored) {
          restoredCount++;

          if (restored.status === "approved" || restored.status === "exported") {
            const latestVer = await VersionService.getLatest(id);
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
                await WebsiteSyncService.publishBlog(itemFormatted, versionFormatted, workspaceId);
              } else if (restored.type === "case-study") {
                await WebsiteSyncService.publishCaseStudy(itemFormatted, versionFormatted, workspaceId);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Restored ${restoredCount} item(s) successfully`,
      restoredCount,
    });
  } catch (err: unknown) {
    console.error("Bulk restore route error:", err);
    const msg = err instanceof Error ? err.message : "Failed to bulk restore";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
