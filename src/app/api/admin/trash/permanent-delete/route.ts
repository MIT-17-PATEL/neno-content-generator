import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const workspaceId = body.workspaceId || "ws_default_neno";
    const ids: string[] = body.ids || [];

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    let deletedCount = 0;
    for (const id of ids) {
      const ok = await ContentService.permanentDelete(workspaceId, id);
      if (ok) deletedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Permanently deleted ${deletedCount} item(s) from database`,
      deletedCount,
    });
  } catch (err: unknown) {
    console.error("Bulk permanent delete route error:", err);
    const msg = err instanceof Error ? err.message : "Failed to permanently delete items";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
