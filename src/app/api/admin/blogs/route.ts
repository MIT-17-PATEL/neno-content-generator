import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";
import { WebsiteSyncService } from "@/lib/export/website-sync";
import { ContentItem, ContentVersion } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") || "ws_default_neno";

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  const status = searchParams.get("status") || undefined;
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;
  const sort = searchParams.get("sort") || "newest";

  const rawItems = await ContentService.listByWorkspace(workspaceId, {
    type: "blog",
    status: status === "all" ? undefined : status,
    search,
  });

  let items = rawItems;
  if (category && category !== "all") {
    items = items.filter((item) =>
      item.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  // Sorting
  if (sort === "oldest") {
    items = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (sort === "az") {
    items = [...items].sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === "za") {
    items = [...items].sort((a, b) => b.title.localeCompare(a.title));
  } else {
    // newest / updated
    items = [...items].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  // Fetch all blogs to calculate accurate stats
  const allBlogs = await ContentService.listByWorkspace(workspaceId, { type: "blog" });
  const stats = {
    total: allBlogs.length,
    published: allBlogs.filter((b) => b.status === "approved" || b.status === "exported").length,
    drafts: allBlogs.filter((b) => b.status === "draft" || b.status === "generating").length,
    scheduled: allBlogs.filter((b) => b.status === "in_review").length,
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

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const item = await ContentService.create({
      workspaceId,
      type: "blog",
      title: body.title,
      category: body.category || "AI Architecture",
      excerpt: body.shortDescription || body.excerpt || "",
      createdBy: auth.user.userId,
    });

    if (body.slug) {
      await ContentService.updateItem(workspaceId, item.id, { slug: body.slug });
      item.slug = body.slug;
    }

    // Create Initial Version
    const version = await VersionService.createVersion({
      contentId: item.id,
      content: body.content || `# ${item.title}\n\n${item.excerpt || "Enter blog content..."}`,
      seoMetadata: {
        seoTitle: body.seoTitle || item.title,
        metaDescription: body.metaDescription || item.excerpt || "",
        keywords: body.keywords || [],
        featuredImageBrief: body.featuredImage || body.thumb || "",
        ogImage: body.ogImage || body.featuredImage || "",
        canonicalUrl: body.canonicalUrl || "",
        author: body.author || auth.user.name || "Neno AI Lab",
        tags: body.tags || [],
      },
      createdBy: auth.user.userId,
    });

    // If publishing immediately
    if (body.status === "Published" || body.status === "approved" || body.publishNow) {
      await ContentService.updateStatus(workspaceId, item.id, "approved");
      item.status = "approved";
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
        updatedAt: new Date().toISOString(),
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
      await WebsiteSyncService.publishBlog(itemFormatted, versionFormatted, workspaceId, body.author || auth.user.name);
    }

    return NextResponse.json({
      success: true,
      item,
      version,
    });
  } catch (error: unknown) {
    console.error("Admin blog creation error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create blog";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
