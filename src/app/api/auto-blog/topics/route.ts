import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceAccess } from "@/server/auth-guard";
import { AutoBlogService } from "@/services/auto-blog-service";
import { AUTO_BLOG_WORKSPACE } from "@/lib/auto-blog/run-auto-blog";
import { autoBlogError, topicSchema } from "@/lib/auto-blog/api";

/** Add a topic to the end of the queue. */
export async function POST(req: NextRequest) {
  const auth = await requireWorkspaceAccess(req, AUTO_BLOG_WORKSPACE);
  if ("error" in auth) return auth.error;
  const parsed = topicSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json({ topic: await AutoBlogService.addTopic(AUTO_BLOG_WORKSPACE, parsed.data) });
  } catch (err) {
    return autoBlogError(err);
  }
}

/** Reorder: body { ids: [...] } in the new order. */
export async function PUT(req: NextRequest) {
  const auth = await requireWorkspaceAccess(req, AUTO_BLOG_WORKSPACE);
  if ("error" in auth) return auth.error;
  const parsed = z.object({ ids: z.array(z.string().max(64)).max(500) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  try {
    await AutoBlogService.reorderTopics(AUTO_BLOG_WORKSPACE, parsed.data.ids);
    return NextResponse.json({ success: true });
  } catch (err) {
    return autoBlogError(err);
  }
}
