import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/server/auth-guard";
import { AUTO_BLOG_WORKSPACE, runAutoBlog } from "@/lib/auto-blog/run-auto-blog";

/**
 * "Run now": starts the same runAutoBlog() the scheduled task uses (skipping the enabled/interval checks, not the lock)
 * and returns at once; the page polls run history. Local only: a serverless function would be killed mid-run.
 */
export async function POST(req: NextRequest) {
  const auth = await requireWorkspaceAccess(req, AUTO_BLOG_WORKSPACE);
  if ("error" in auth) return auth.error;
  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Blog automation runs only on your PC (npm run dev), not on Vercel." }, { status: 400 });
  }
  void runAutoBlog({ trigger: "manual", force: true }).then((r) => console.log(`[auto-blog] Run now finished: ${r.status}`, r.reason || r.error || ""));
  return NextResponse.json({ started: true }, { status: 202 });
}
