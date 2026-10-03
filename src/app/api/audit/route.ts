import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { AuditService } from "@/services/audit-service";
import { AuditAction } from "@/types";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const action = searchParams.get("action") as AuditAction | null;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  if (workspaceId) {
    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;
  }

  try {
    const events = AuditService.list({
      workspaceId: workspaceId || undefined,
      action: action || undefined,
      limit,
    });

    return NextResponse.json({
      events,
      totalCount: events.length,
    });
  } catch (error) {
    console.error("Fetch audit events error:", error);
    return NextResponse.json({ error: "Failed to fetch audit events" }, { status: 500 });
  }
}
