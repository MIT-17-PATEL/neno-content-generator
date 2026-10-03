import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { caseStudyInputSchema } from "@/validation";
import { runCaseStudyGenerationPipeline } from "@/lib/ai/case-study-generator";
import { z } from "zod";

const requestBodySchema = caseStudyInputSchema.extend({
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

    const generationResult = await runCaseStudyGenerationPipeline({
      workspaceId: parsed.data.workspaceId,
      userId: auth.user.userId,
      clientIndustry: parsed.data.clientIndustry,
      businessChallenge: parsed.data.businessChallenge,
      existingProcess: parsed.data.existingProcess,
      proposedSolution: parsed.data.proposedSolution,
      technology: parsed.data.technology,
      resultsMetrics: parsed.data.resultsMetrics,
      targetAudience: parsed.data.targetAudience,
    });

    return NextResponse.json({
      success: true,
      contentId: generationResult.contentId,
      runId: generationResult.runId,
      result: generationResult.result,
    });
  } catch (error: unknown) {
    console.error("Case study endpoint error:", error);
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
