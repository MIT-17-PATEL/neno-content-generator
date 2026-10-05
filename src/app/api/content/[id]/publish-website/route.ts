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
    const htmlBody = ExportFormatter.markdownToHtmlBody(currentVersion.content);

    // Target Neno Website Base URL & Config
    const websiteBaseUrl = (
      process.env.NENO_WEBSITE_URL ||
      process.env.NENO_WEBSITE_API_URL ||
      "http://localhost:3000"
    ).replace(/\/+$/, "").replace(/\/api\/admin\/blogs$/, "").replace(/\/api\/blogs$/, "");

    const adminEmail = body.adminEmail || process.env.NENO_WEBSITE_ADMIN_EMAIL || "admin@neno.tech";
    const adminPassword = body.adminPassword || process.env.NENO_WEBSITE_ADMIN_PASSWORD || "admin123";

    let sessionCookie = process.env.NENO_ADMIN_SESSION || "";
    let authErrorDetail = "";

    // 1. Authenticate to obtain neno-admin-session cookie if not already set
    if (!sessionCookie) {
      try {
        const authRes = await fetch(`${websiteBaseUrl}/api/admin/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
          }),
        });

        if (authRes.ok) {
          const setCookieHeader = authRes.headers.get("set-cookie");
          if (setCookieHeader) {
            const match = setCookieHeader.match(/neno-admin-session=([^;]+)/);
            sessionCookie = match ? `neno-admin-session=${match[1]}` : setCookieHeader.split(";")[0];
          }
        } else {
          const errBody = await authRes.text().catch(() => "");
          authErrorDetail = `Auth status ${authRes.status}: ${errBody || authRes.statusText}`;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        authErrorDetail = `Cannot reach ${websiteBaseUrl}/api/admin/auth: ${msg}`;
      }
    }

    // 2. Prepare payload exactly matching website schema with clean formatting
    const cleanCategory = ExportFormatter.cleanCategoryName(item.category);
    const cleanContent = ExportFormatter.formatCleanArticleMarkdown(currentVersion.content, item.title);

    const targetPayload = {
      title: item.title,
      slug: item.slug,
      category: cleanCategory,
      author: auth.user.name || brandName || "Neno AI Lab",
      shortDescription: item.excerpt || "",
      content: cleanContent,
      blogContent: cleanContent,
      status: "Published",
      publishDate: blogPayload.publishDate,
      readingTime: blogPayload.readingTime,
      thumb: currentVersion.seoMetadata?.featuredImageBrief || "",
      thumbFull: currentVersion.seoMetadata?.featuredImageBrief || "",
      buttonText: "Read Article",
      buttonLink: `/blog-single/${item.slug}`,
    };

    let publishedSuccessfully = false;
    let targetResponse: unknown = null;
    let targetEndpointUsed = `${websiteBaseUrl}/api/admin/blogs`;
    let publishErrorDetail = "";

    // 3. Dispatch POST /api/admin/blogs
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionCookie) {
        headers["Cookie"] = sessionCookie;
      }

      const response = await fetch(targetEndpointUsed, {
        method: "POST",
        headers,
        body: JSON.stringify(targetPayload),
      });

      if (response.ok) {
        publishedSuccessfully = true;
        targetResponse = await response.json().catch(() => ({ success: true }));
      } else {
        const errBody = await response.text().catch(() => "");
        publishErrorDetail = `Website rejected request (${response.status}): ${errBody || response.statusText}`;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      publishErrorDetail = `Connection to ${targetEndpointUsed} failed: ${msg}`;
    }

    // Update status in local database
    if (publishedSuccessfully) {
      await ContentService.updateStatus(workspaceId, params.id, "approved");
    }

    return NextResponse.json({
      success: true,
      publishedToWebsite: publishedSuccessfully,
      endpointUsed: targetEndpointUsed,
      blogPayload: targetPayload,
      websiteUrl: `${websiteBaseUrl}/blog-single/${item.slug}`,
      websiteListingUrl: `${websiteBaseUrl}/blog`,
      responseFromWebsite: targetResponse,
      errorDetail: publishErrorDetail || authErrorDetail || null,
    });
  } catch (error: unknown) {
    console.error("Publish to website error:", error);
    const message = error instanceof Error ? error.message : "Publishing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
