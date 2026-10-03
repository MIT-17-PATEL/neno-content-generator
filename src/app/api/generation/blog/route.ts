import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { blogGenerationInputSchema } from "@/validation";
import { runBlogGenerationPipeline } from "@/lib/ai/blog-generator";
import { z } from "zod";

const requestBodySchema = blogGenerationInputSchema.extend({
  workspaceId: z.string().min(1, "Workspace ID is required"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = requestBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const wsAuth = await requireWorkspaceAccess(req, parsed.data.workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    const generationResult = await runBlogGenerationPipeline({
      workspaceId: parsed.data.workspaceId,
      userId: auth.user.userId,
      topic: parsed.data.topic,
      audience: parsed.data.audience,
      tone: parsed.data.tone,
      desiredLength: parsed.data.desiredLength,
      category: parsed.data.category,
      researchPreference: parsed.data.researchPreference,
    });

    return NextResponse.json({
      success: true,
      contentId: generationResult.contentId,
      runId: generationResult.runId,
      result: generationResult.result,
    });
  } catch (error: unknown) {
    console.error("Blog generation endpoint error:", error);
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
