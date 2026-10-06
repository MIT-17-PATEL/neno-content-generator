import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { WebsiteSyncService } from "@/lib/export/website-sync";
import { VersionService } from "@/services/version-service";

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
      return NextResponse.json({ error: "No case study ID(s) provided" }, { status: 400 });
    }

    const results = [];
    for (const id of ids) {
      const dbItem = await ContentService.getById(workspaceId, id);
      if (!dbItem) continue;

      const latestVersion = await VersionService.getLatest(id);
      if (latestVersion) {
        try {
          await WebsiteSyncService.publishCaseStudy(dbItem, latestVersion, workspaceId);
        } catch (syncErr) {
          console.warn(`[Publish Route] Sync to website warning for "${dbItem.title}":`, syncErr);
        }
      }

      await ContentService.updateStatus(workspaceId, id, "approved");
      results.push({ id, title: dbItem.title, success: true });
    }

    return NextResponse.json({
      success: true,
      publishedCount: results.length,
      totalRequested: ids.length,
      results,
    });
  } catch (error: unknown) {
    console.error("Bulk publish case studies error:", error);
    const msg = error instanceof Error ? error.message : "Publishing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
