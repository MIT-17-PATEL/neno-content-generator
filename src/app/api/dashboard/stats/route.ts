import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";

export async function GET(req: NextRequest) {
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

  const items = await ContentService.listByWorkspace(workspaceId);

  const total = items.length;
  const drafts = items.filter((i) => i.status === "draft" || i.status === "generating").length;
  const inReview = items.filter((i) => i.status === "in_review").length;
  const approved = items.filter((i) => i.status === "approved" || i.status === "exported").length;

  const recent = items.slice(0, 5);

  return NextResponse.json({
    stats: {
      total,
      drafts,
      inReview,
      approved,
    },
    recent,
  });
}
