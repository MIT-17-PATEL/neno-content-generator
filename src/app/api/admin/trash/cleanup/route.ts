import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ContentService } from "@/services/content-service";

/**
 * Permanently deletes trash older than 7 days. Called daily by Vercel Cron (vercel.json), which sends
 * `Authorization: Bearer <CRON_SECRET>`. Fails closed: without CRON_SECRET configured, every call is rejected.
 */
function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
