import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess, requireAuth } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";
import { WebsiteSyncService } from "@/lib/export/website-sync";
import { ContentItem, ContentVersion } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || "ws_default_neno";
  const type = searchParams.get("type") || "all";
  const search = searchParams.get("search") || undefined;
  const sort = searchParams.get("sort") || "deleted_desc";

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  // Auto-cleanup items older than 7 days
  await ContentService.cleanupExpiredTrash(workspaceId);

  const rawItems = await ContentService.listByWorkspace(workspaceId, {
    onlyDeleted: true,
    type: type === "all" ? undefined : type,
    search,
  });

  let items = rawItems;

  // Sorting
  if (sort === "deleted_asc") {
    items = [...items].sort((a, b) => {
      const timeA = a.deleted_at ? new Date(a.deleted_at).getTime() : 0;
      const timeB = b.deleted_at ? new Date(b.deleted_at).getTime() : 0;
      return timeA - timeB;
    });
  } else if (sort === "created_desc") {
    items = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sort === "created_asc") {
    items = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (sort === "az") {
    items = [...items].sort((a, b) => a.title.localeCompare(b.title));
  } else {
    // deleted_desc (newest deleted first)
    items = [...items].sort((a, b) => {
      const timeA = a.deleted_at ? new Date(a.deleted_at).getTime() : 0;
      const timeB = b.deleted_at ? new Date(b.deleted_at).getTime() : 0;
      return timeB - timeA;
    });
  }

  // Get total stats for tabs
  const allTrashed = await ContentService.listByWorkspace(workspaceId, { onlyDeleted: true });
  const stats = {
    total: allTrashed.length,
    blogs: allTrashed.filter((i) => i.type === "blog").length,
    caseStudies: allTrashed.filter((i) => i.type === "case-study").length,
  };

  return NextResponse.json({
    items,
    stats,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const workspaceId = body.workspaceId || "ws_default_neno";
    const action = body.action;

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    if (action === "empty" || action === "empty-all") {
      const count = await ContentService.emptyTrash(workspaceId);
      return NextResponse.json({
        success: true,
        message: `Permanently removed ${count} item(s) from Trash`,
        count,
      });
    }

    if (action === "restore") {
      const ids: string[] = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);
      let restoredCount = 0;

      for (const id of ids) {
        const item = await ContentService.getById(workspaceId, id, { allowDeleted: true });
        if (item) {
          const restored = await ContentService.restore(workspaceId, id);
          if (restored) {
            restoredCount++;

            // If item was previously published, re-publish to website
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
    }

    if (action === "permanent-delete") {
      const ids: string[] = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);
      let deletedCount = 0;

      for (const id of ids) {
        const ok = await ContentService.permanentDelete(workspaceId, id);
        if (ok) deletedCount++;
      }

      return NextResponse.json({
        success: true,
        message: `Permanently deleted ${deletedCount} item(s)`,
        deletedCount,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Trash route error:", error);
    const msg = error instanceof Error ? error.message : "Trash action failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
