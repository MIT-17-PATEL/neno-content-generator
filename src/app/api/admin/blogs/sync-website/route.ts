import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { WebsiteSyncService } from "@/lib/export/website-sync";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || "ws_default_neno";

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  const websiteBlogs = await WebsiteSyncService.listWebsiteBlogs();
  return NextResponse.json({
    success: true,
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

    if (action === "delete-from-website") {
      const ids: string[] = body.ids || [];
      const slugs: string[] = body.slugs || [];
      const titles: string[] = body.titles || [];

      let deletedCount = 0;
      for (let i = 0; i < Math.max(ids.length, slugs.length, titles.length); i++) {
        const idOrSlug = ids[i] || slugs[i];
        const title = titles[i];
        if (idOrSlug || title) {
          const ok = await WebsiteSyncService.deleteFromWebsite(idOrSlug || title, title);
          if (ok) deletedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} blog(s) from website`,
        deletedCount,
      });
    }

    if (action === "purge-all-website") {
      const websiteBlogs = await WebsiteSyncService.listWebsiteBlogs();
      let purgedCount = 0;
      for (const wb of websiteBlogs) {
        const ok = await WebsiteSyncService.deleteFromWebsite(wb.id || wb.slug, wb.title);
        if (ok) purgedCount++;
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
