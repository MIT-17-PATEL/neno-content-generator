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

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    const ids: string[] = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "No blog ID(s) provided" }, { status: 400 });
    }

    const results = [];
    for (const id of ids) {
      const dbItem = await ContentService.getById(workspaceId, id);
      if (!dbItem) continue;

      let dbVersion = await VersionService.getLatest(id);
      if (!dbVersion) {
        dbVersion = await VersionService.createVersion({
          contentId: id,
          content: `# ${dbItem.title}\n\n${dbItem.excerpt || ""}`,
          createdBy: auth.user.userId,
        });
      }

      await ContentService.updateStatus(workspaceId, id, "approved");

      const item: ContentItem = {
        id: dbItem.id,
        workspaceId: dbItem.workspace_id,
        type: dbItem.type,
        title: dbItem.title,
        slug: dbItem.slug,
        status: "approved",
        category: dbItem.category,
        excerpt: dbItem.excerpt,
        currentVersionId: dbItem.current_version_id,
        createdBy: dbItem.created_by,
        createdAt: new Date(dbItem.created_at).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const version: ContentVersion = {
        id: dbVersion.id,
        contentId: dbVersion.content_id,
        versionNumber: dbVersion.version_number,
        content: dbVersion.content,
        seoMetadata: (dbVersion.seo_metadata || {}) as ContentVersion["seoMetadata"],
        createdBy: dbVersion.created_by,
        createdAt: new Date(dbVersion.created_at).toISOString(),
      };

      const syncResult = await WebsiteSyncService.publishBlog(item, version, workspaceId, auth.user.name);
      results.push({ id, title: item.title, ...syncResult });

      try {
        const { revalidateBlogCache } = await import("@/lib/cache/revalidate");
        await revalidateBlogCache(item.slug);
      } catch (e) {
        console.warn("Revalidation warning:", e);
      }
    }

    return NextResponse.json({
      success: true,
      publishedCount: results.filter((r) => r.success).length,
      totalRequested: ids.length,
      results,
    });
  } catch (error: unknown) {
    console.error("Bulk publish error:", error);
    const msg = error instanceof Error ? error.message : "Publishing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
