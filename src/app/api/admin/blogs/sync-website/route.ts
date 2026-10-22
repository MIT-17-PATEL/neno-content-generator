import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { WebsiteSyncService } from "@/lib/export/website-sync";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";
import { ContentItem, ContentVersion } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || "ws_default_neno";

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  const targetWebsiteUrl = WebsiteSyncService.getTargetWebsiteUrl();
  const websiteBlogs = await WebsiteSyncService.listWebsiteBlogs();
  return NextResponse.json({
    success: true,
    targetWebsiteUrl,
    websiteBlogs,
    count: websiteBlogs.length,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const workspaceId = body.workspaceId || "ws_default_neno";
    const action = body.action || "import";

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    // 1. Backfill / Push approved blogs to website
    if (action === "push-missing" || action === "push-all") {
      const allApproved = await ContentService.listByWorkspace(workspaceId, {
        type: "blog",
        status: "approved",
      });

      let pushedCount = 0;
      let failedCount = 0;
      const errors: Array<{ id: string; title: string; slug: string; reason: string }> = [];

      for (const item of allApproved) {
        let version = await VersionService.getLatest(item.id);
        if (!version) {
          version = await VersionService.createVersion({
            contentId: item.id,
            content: `# ${item.title}\n\n${item.excerpt || ""}`,
            createdBy: auth.user.userId,
          });
        }

        const itemFormatted: ContentItem = {
          id: item.id,
          workspaceId: item.workspace_id,
          type: item.type,
          title: item.title,
          slug: item.slug,
          status: "approved",
          category: item.category,
          excerpt: item.excerpt,
          currentVersionId: version.id,
          createdBy: item.created_by,
          createdAt: new Date(item.created_at).toISOString(),
          updatedAt: new Date(item.updated_at).toISOString(),
        };

        const versionFormatted: ContentVersion = {
          id: version.id,
          contentId: version.content_id,
          versionNumber: version.version_number,
          content: version.content,
          seoMetadata: (version.seo_metadata || {}) as ContentVersion["seoMetadata"],
          createdBy: version.created_by,
          createdAt: new Date(version.created_at).toISOString(),
        };

        try {
          await WebsiteSyncService.publishBlog(itemFormatted, versionFormatted, workspaceId, auth.user.name);
          await ContentService.updateSyncState(workspaceId, item.id, {
            website_synced_at: new Date(),
            website_sync_error: null,
          });
          pushedCount++;
        } catch (err: unknown) {
          failedCount++;
          const reason = err instanceof Error ? err.message : String(err);
          await ContentService.updateSyncState(workspaceId, item.id, {
            website_synced_at: null,
            website_sync_error: reason,
          });
          errors.push({ id: item.id, title: item.title, slug: item.slug, reason });
        }
      }

      return NextResponse.json({
        success: failedCount === 0,
        message: `Pushed ${pushedCount} blog(s) to website${failedCount > 0 ? ` (${failedCount} failed)` : ""}`,
        pushedCount,
        failedCount,
        totalAttempted: allApproved.length,
        errors,
      });
    }

    // 2. Import from website into Content Studio
    if (action === "import") {
      const websiteBlogs = await WebsiteSyncService.listWebsiteBlogs();
      const existingStudioBlogs = await ContentService.listByWorkspace(workspaceId, { type: "blog" });
      const existingSlugs = new Set(existingStudioBlogs.map((b) => b.slug));

      let importedCount = 0;
      for (const wb of websiteBlogs) {
        if (!existingSlugs.has(wb.slug)) {
          const item = await ContentService.create({
            workspaceId,
            type: "blog",
            title: wb.title || "Untitled Blog",
            category: (wb.category as string) || "AI Architecture",
            excerpt: (wb.shortDescription as string) || (wb.excerpt as string) || "",
            createdBy: auth.user.userId,
          });

          await ContentService.updateItem(workspaceId, item.id, {
            slug: wb.slug,
            status: "approved",
          });

          await ContentService.updateSyncState(workspaceId, item.id, {
            website_synced_at: new Date(),
            website_sync_error: null,
          });

          const content = (wb.content as string) || (wb.blogContent as string) || `# ${wb.title}\n\n${wb.shortDescription || ""}`;
          await VersionService.createVersion({
            contentId: item.id,
            content,
            seoMetadata: {
              seoTitle: (wb.seoTitle as string) || wb.title,
              metaDescription: (wb.metaDescription as string) || (wb.shortDescription as string),
              featuredImageBrief: (wb.thumb as string) || (wb.thumbFull as string) || "",
              ogImage: (wb.thumb as string) || (wb.thumbFull as string) || "",
              featuredImageUrl: (wb.thumb as string) || (wb.thumbFull as string) || "",
              author: (wb.author as string) || "Mit Patel",
            },
            createdBy: auth.user.userId,
          });
          importedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Imported ${importedCount} blog(s) from website into Content Studio`,
        importedCount,
      });
    }

    // 3. Delete single / specific blogs from website
    if (action === "delete-from-website") {
      const slugs: string[] = body.slugs || [];
      const ids: string[] = body.ids || [];

      let deletedCount = 0;
      for (let i = 0; i < Math.max(ids.length, slugs.length); i++) {
        const slugOrId = slugs[i] || ids[i];
        if (slugOrId) {
          try {
            const ok = await WebsiteSyncService.deleteFromWebsite(slugOrId);
            if (ok) deletedCount++;
          } catch (e) {
            console.warn(`Failed to delete ${slugOrId} from website:`, e);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} blog(s) from website`,
        deletedCount,
      });
    }

    // 4. Purge all blogs from live website
    if (action === "purge-all-website") {
      const websiteBlogs = await WebsiteSyncService.listWebsiteBlogs();
      let purgedCount = 0;
      for (const wb of websiteBlogs) {
        const slug = wb.slug || wb.id;
        if (slug) {
          try {
            const ok = await WebsiteSyncService.deleteFromWebsite(slug);
            if (ok) purgedCount++;
          } catch (e) {
            console.warn(`Purge deletion error for ${slug}:`, e);
          }
        }
      }
      return NextResponse.json({
        success: true,
        message: `Purged ${purgedCount} blog(s) from website`,
        purgedCount,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Website sync route error:", error);
    const msg = error instanceof Error ? error.message : "Sync operation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
