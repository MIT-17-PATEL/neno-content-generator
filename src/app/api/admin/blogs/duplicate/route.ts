import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const workspaceId = body.workspaceId || "ws_default_neno";

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    if (!body.id) {
      return NextResponse.json({ error: "Blog ID is required" }, { status: 400 });
    }

    const duplicated = await ContentService.duplicate(workspaceId, body.id, auth.user.userId);
    if (!duplicated) {
      return NextResponse.json({ error: "Failed to duplicate blog" }, { status: 404 });
    }

    // Copy latest version content
    const originalVersion = await VersionService.getLatest(body.id);
    if (originalVersion) {
      await VersionService.createVersion({
        contentId: duplicated.id,
        content: originalVersion.content,
        seoMetadata: originalVersion.seo_metadata || {},
        createdBy: auth.user.userId,
      });
    }

    return NextResponse.json({
      success: true,
      item: duplicated,
    });
  } catch (error: unknown) {
    console.error("Blog duplicate error:", error);
    const msg = error instanceof Error ? error.message : "Failed to duplicate blog";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
