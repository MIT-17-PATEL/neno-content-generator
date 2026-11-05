import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/server/auth-guard";
import { AutoBlogService, SCHEDULE_FIELDS } from "@/services/auto-blog-service";
import { AUTO_BLOG_WORKSPACE } from "@/lib/auto-blog/run-auto-blog";
import { autoBlogError, settingsSchema } from "@/lib/auto-blog/api";

export async function GET(req: NextRequest) {
  const auth = await requireWorkspaceAccess(req, AUTO_BLOG_WORKSPACE);
  if ("error" in auth) return auth.error;
  try {
    const [settings, topics, runs] = await Promise.all([
      AutoBlogService.getSettings(AUTO_BLOG_WORKSPACE),
      AutoBlogService.listTopics(AUTO_BLOG_WORKSPACE),
      AutoBlogService.listRuns(AUTO_BLOG_WORKSPACE),
    ]);
    // The weekly plan needs migration 005; the rest of the page works without it.
    let plan = null;
    let planError: string | null = null;
    try {
      plan = await AutoBlogService.listPlan(AUTO_BLOG_WORKSPACE);
    } catch (err) {
      planError = err instanceof Error && /does not exist/.test(err.message) ? "Weekly plans need database migration 005, which hasn't been applied yet." : String(err);
    }
    return NextResponse.json({ settings, topics, runs, plan, planError, runsHere: !process.env.VERCEL });
  } catch (err) {
    return autoBlogError(err);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireWorkspaceAccess(req, AUTO_BLOG_WORKSPACE);
  if ("error" in auth) return auth.error;
  const parsed = settingsSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  try {
    const before = await AutoBlogService.getSettings(AUTO_BLOG_WORKSPACE);
    const settings = await AutoBlogService.updateSettings(AUTO_BLOG_WORKSPACE, parsed.data);
    // New schedule settings re-plan the rest of this week (posts already made are kept).
    const changed = SCHEDULE_FIELDS.some((k) => JSON.stringify(before[k]) !== JSON.stringify(settings[k]));
    if (changed && settings.schedule_type === "weekly") await AutoBlogService.replanWeek(settings);
    return NextResponse.json({ settings, replanned: changed && settings.schedule_type === "weekly" });
  } catch (err) {
    return autoBlogError(err);
  }
}
