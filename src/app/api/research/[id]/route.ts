import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ResearchService } from "@/services/research-service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query parameter is required" },
      { status: 400 }
    );
  }

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  const deleted = await ResearchService.deleteSource(params.id);
  if (!deleted) {
    return NextResponse.json({ error: "Research source not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Source removed" });
}
