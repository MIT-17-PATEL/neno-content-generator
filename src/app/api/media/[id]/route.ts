import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { MediaService } from "@/services/media-service";

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
    const asset = await MediaService.getById(params.id, workspaceId);
    if (!asset) {
      return NextResponse.json({ error: "Media asset not found" }, { status: 404 });
    }

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Get media asset error:", error);
    return NextResponse.json({ error: "Failed to get media asset" }, { status: 500 });
  }
}

export async function DELETE(
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
    const deleted = await MediaService.delete(params.id, workspaceId);
    if (!deleted) {
      return NextResponse.json({ error: "Media asset not found or delete failed" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Media asset deleted" });
  } catch (error) {
    console.error("Delete media asset error:", error);
    return NextResponse.json({ error: "Failed to delete media asset" }, { status: 500 });
  }
}
