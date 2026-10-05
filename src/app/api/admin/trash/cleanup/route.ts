import { NextRequest, NextResponse } from "next/server";
import { ContentService } from "@/services/content-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || undefined;

    const purgedCount = await ContentService.cleanupExpiredTrash(workspaceId);
    return NextResponse.json({
      success: true,
      message: `Trash auto-cleanup completed. Permanently removed ${purgedCount} item(s) older than 7 days.`,
      purgedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("Trash cleanup job error:", err);
    const msg = err instanceof Error ? err.message : "Cleanup failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
