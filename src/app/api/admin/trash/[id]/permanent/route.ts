import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || "ws_default_neno";

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    const ok = await ContentService.permanentDelete(workspaceId, params.id);
    if (!ok) {
      return NextResponse.json({ error: "Item not found in database" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Item permanently deleted from database",
    });
  } catch (err: unknown) {
    console.error("Permanent delete route error:", err);
    const msg = err instanceof Error ? err.message : "Failed to permanently delete";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
