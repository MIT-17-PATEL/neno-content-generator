import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/server/auth-guard";
import { AutoBlogService } from "@/services/auto-blog-service";
import { AUTO_BLOG_WORKSPACE } from "@/lib/auto-blog/run-auto-blog";
import { autoBlogError, topicPatchSchema } from "@/lib/auto-blog/api";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireWorkspaceAccess(req, AUTO_BLOG_WORKSPACE);
  if ("error" in auth) return auth.error;
  const parsed = topicPatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  try {
    const topic = await AutoBlogService.updateTopic(AUTO_BLOG_WORKSPACE, params.id, parsed.data);
    if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    return NextResponse.json({ topic });
  } catch (err) {
    return autoBlogError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireWorkspaceAccess(req, AUTO_BLOG_WORKSPACE);
  if ("error" in auth) return auth.error;
  try {
    await AutoBlogService.deleteTopic(AUTO_BLOG_WORKSPACE, params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return autoBlogError(err);
  }
}
