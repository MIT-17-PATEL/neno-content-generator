import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";
import { ExportService } from "@/services/export-service";
import { ExportFormatter } from "@/lib/export/export-formatter";
import { dataStore } from "@/server/data-store";
import { ExportFormat, ContentItem, ContentVersion } from "@/types";
import { z } from "zod";

const exportSchema = z.object({
  workspaceId: z.string().min(1),
  format: z.enum(["markdown", "html", "json"]).default("markdown"),
  versionId: z.string().optional(),
  includeFrontmatter: z.boolean().default(true),
  standaloneHtml: z.boolean().default(true),
  markAsExported: z.boolean().default(true),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = exportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { workspaceId, format, versionId, includeFrontmatter, standaloneHtml, markAsExported } =
      parsed.data;

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    const dbItem = await ContentService.getById(workspaceId, params.id);
    if (!dbItem) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
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

    const dbVersions = await VersionService.listByContent(params.id);
    const targetDbVersion = versionId
      ? dbVersions.find((v) => v.id === versionId)
      : dbVersions[0];

    if (!targetDbVersion) {
      return NextResponse.json(
        { error: "No version found to export for this document" },
        { status: 400 }
      );
    }

    const targetVersion: ContentVersion = {
      id: targetDbVersion.id,
      contentId: targetDbVersion.content_id,
      versionNumber: targetDbVersion.version_number,
      content: targetDbVersion.content,
      seoMetadata: (targetDbVersion.seo_metadata || {}) as ContentVersion["seoMetadata"],
      generationRunId: targetDbVersion.generation_run_id,
      createdBy: targetDbVersion.created_by,
      createdAt: new Date(targetDbVersion.created_at).toISOString(),
    };

    const brand = await dataStore.getBrandSettings(workspaceId);

    // Format content
    const formattedResult = ExportFormatter.format({
      item,
      version: targetVersion,
      format: format as ExportFormat,
      includeFrontmatter,
      standaloneHtml,
      brandName: brand?.brand_name,
      authorName: auth.user.name || "Content Engineering Team",
    });

    // Record export
    const exportRecord = await ExportService.recordExport({
      contentId: params.id,
      format: format as ExportFormat,
    });

    // Optionally mark status as exported
    if (markAsExported && item.status !== "exported") {
      await ContentService.updateStatus(workspaceId, params.id, "exported");
    }

    return NextResponse.json({
      success: true,
      export: exportRecord,
      result: formattedResult,
    });
  } catch (error) {
    console.error("Export generation error:", error);
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const wsAuth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in wsAuth) return wsAuth.error;

  try {
    const exports = await ExportService.listByContent(params.id);
    return NextResponse.json({ exports });
  } catch (error) {
    console.error("Get export history error:", error);
    return NextResponse.json({ error: "Failed to list exports" }, { status: 500 });
  }
}
