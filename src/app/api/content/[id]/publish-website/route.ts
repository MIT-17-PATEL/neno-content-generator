import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";
import { ExportFormatter } from "@/lib/export/export-formatter";
import { dataStore } from "@/server/data-store";
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
      status: dbItem.status,
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

    const brand = await dataStore.getBrandSettings(workspaceId);
    const brandName = brand?.brand_name || "Neno Technology";

    // Format into 1:1 Website Form Schema
    const exportResult = ExportFormatter.format({
      item,
      version: currentVersion,
      format: "json",
      brandName,
      authorName: auth.user.name || "Mit Patel",
    });

    const blogPayload = JSON.parse(exportResult.content);

    // Target Neno Website API endpoints
    const websiteTargetUrls = [
      process.env.NENO_WEBSITE_API_URL,
      "http://localhost:3000/api/admin/blogs",
      "http://localhost:3000/api/blogs",
    ].filter(Boolean) as string[];

    let publishedSuccessfully = false;
    let targetResponse: unknown = null;
    let targetEndpointUsed = "";

    for (const url of websiteTargetUrls) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: blogPayload.title,
            slug: blogPayload.slug,
            category: blogPayload.category,
            author: blogPayload.author,
            publishDate: blogPayload.publishDate,
            readingTime: blogPayload.readingTime,
            status: "Published",
            shortDescription: blogPayload.shortDescription,
            blogContent: blogPayload.blogContent,
            content: blogPayload.blogContent,
            buttonText: blogPayload.buttonText || "Read article",
            buttonLink: blogPayload.buttonLink || `/blog-single/${blogPayload.slug}`,
            featuredImage: blogPayload.featuredImage || "",
          }),
        });

        if (response.ok) {
          publishedSuccessfully = true;
          targetEndpointUsed = url;
          targetResponse = await response.json().catch(() => ({ success: true }));
          break;
        }
      } catch {
        // Continue trying next endpoint
      }
    }

    // Update status in local database to approved
    await ContentService.updateStatus(workspaceId, params.id, "approved");

    return NextResponse.json({
      success: true,
      publishedToWebsite: publishedSuccessfully,
      endpointUsed: targetEndpointUsed,
      blogPayload,
      websiteUrl: `http://localhost:3000/blog-single/${item.slug}`,
      responseFromWebsite: targetResponse,
    });
  } catch (error: unknown) {
    console.error("Publish to website error:", error);
    const message = error instanceof Error ? error.message : "Publishing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
