import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { WebsiteSyncService } from "@/lib/export/website-sync";
import { ContentItem } from "@/types";

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

      await ContentService.updateStatus(workspaceId, id, "draft");

      const item: ContentItem = {
        id: dbItem.id,
        workspaceId: dbItem.workspace_id,
        type: dbItem.type,
        title: dbItem.title,
        slug: dbItem.slug,
        status: "draft",
        category: dbItem.category,
        excerpt: dbItem.excerpt,
        currentVersionId: dbItem.current_version_id,
        createdBy: dbItem.created_by,
        createdAt: new Date(dbItem.created_at).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const syncResult = await WebsiteSyncService.unpublishBlog(item);
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
      unpublishedCount: results.length,
      results,
    });
  } catch (error: unknown) {
    console.error("Unpublish error:", error);
    const msg = error instanceof Error ? error.message : "Unpublish failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
