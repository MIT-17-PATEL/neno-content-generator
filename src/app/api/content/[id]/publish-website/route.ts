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
    const body = await req.json().catch(() => ({}));
    const workspaceId = body.workspaceId || "ws_default_neno";

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    const dbItem = await ContentService.getById(workspaceId, params.id);
    if (!dbItem) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    let dbVersion = await VersionService.getLatest(params.id);
    if (!dbVersion) {
      dbVersion = await VersionService.createVersion({
        contentId: params.id,
        content: `# ${dbItem.title}\n\n> **Executive Summary**: ${dbItem.excerpt || "Technical documentation and strategic implementation guide."}\n\n## 1. Overview\n\n${dbItem.excerpt || "Comprehensive guide."}`,
        createdBy: auth.user.userId,
      });
    }

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
      updatedAt: new Date(dbItem.updated_at).toISOString(),
    };

    const currentVersion: ContentVersion = {
      id: dbVersion.id,
      contentId: dbVersion.content_id,
      versionNumber: dbVersion.version_number,
      content: dbVersion.content,
      seoMetadata: (dbVersion.seo_metadata || {}) as ContentVersion["seoMetadata"],
      generationRunId: dbVersion.generation_run_id,
      createdBy: dbVersion.created_by,
      createdAt: new Date(dbVersion.created_at).toISOString(),
    };

    // Update status in local database
    await ContentService.updateStatus(workspaceId, params.id, "approved");

    try {
      const syncResult = await WebsiteSyncService.publishBlog(item, currentVersion, workspaceId, auth.user.name);
      await ContentService.updateSyncState(workspaceId, params.id, {
        website_synced_at: new Date(),
        website_sync_error: null,
      });

      return NextResponse.json({
        success: true,
        savedLocally: true,
        websiteSync: "synced",
        publishedToWebsite: true,
        endpointUsed: syncResult.endpointUsed,
        websiteUrl: syncResult.websiteUrl,
        responseFromWebsite: syncResult.response,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await ContentService.updateSyncState(workspaceId, params.id, {
        website_synced_at: null,
        website_sync_error: errMsg,
      });

      return NextResponse.json(
        {
          success: false,
          savedLocally: true,
          websiteSync: "failed",
          error: errMsg,
          errorDetail: errMsg,
          publishedToWebsite: false,
        },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    console.error("Publish to website error:", error);
    const message = error instanceof Error ? error.message : "Publishing failed";
    return NextResponse.json({ error: message, success: false, savedLocally: false }, { status: 500 });
  }
}
