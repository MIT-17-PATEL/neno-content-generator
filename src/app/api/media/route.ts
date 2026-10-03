import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { MediaService } from "@/services/media-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const type = searchParams.get("type") || undefined;
  const contentId = searchParams.get("contentId") || undefined;

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const wsAuth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in wsAuth) return wsAuth.error;

  try {
    let assets = [];
    if (contentId) {
      assets = await MediaService.listByContent(contentId);
    } else {
      assets = await MediaService.listByWorkspace(workspaceId, type);
    }

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("List media error:", error);
    return NextResponse.json({ error: "Failed to list media assets" }, { status: 500 });
  }
}
