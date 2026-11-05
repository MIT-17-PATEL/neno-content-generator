import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/server/auth-guard";
import { AutoBlogService } from "@/services/auto-blog-service";
import { AUTO_BLOG_WORKSPACE } from "@/lib/auto-blog/run-auto-blog";
import { autoBlogError, planActionSchema } from "@/lib/auto-blog/api";

/** "Re-plan this week" ({ action: "replan" }) and "Skip this slot" ({ action: "skip", id }). */
export async function POST(req: NextRequest) {
  const auth = await requireWorkspaceAccess(req, AUTO_BLOG_WORKSPACE);
  if ("error" in auth) return auth.error;
  const parsed = planActionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  try {
    if (parsed.data.action === "replan") {
      const settings = await AutoBlogService.getSettings(AUTO_BLOG_WORKSPACE);
      return NextResponse.json({ plan: await AutoBlogService.replanWeek(settings) });
    }
    if (!(await AutoBlogService.skipSlot(AUTO_BLOG_WORKSPACE, parsed.data.id))) {
      return NextResponse.json({ error: "Only a pending slot can be skipped" }, { status: 409 });
    }
    return NextResponse.json({ plan: await AutoBlogService.listPlan(AUTO_BLOG_WORKSPACE) });
  } catch (err) {
    return autoBlogError(err);
  }
}
