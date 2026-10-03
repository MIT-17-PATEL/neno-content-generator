import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth-guard";
import { AgentOrchestrator } from "@/agents/orchestrator";
import { z } from "zod";

const retrySchema = z.object({
  stage: z.enum(["research", "strategy", "writing", "seo", "qa", "image"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = retrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid stage to retry", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updatedState = await AgentOrchestrator.retryStage(params.id, parsed.data.stage);
    return NextResponse.json({ success: true, runId: params.id, state: updatedState });
  } catch (err: unknown) {
    console.error("Retry stage error:", err);
    const msg = err instanceof Error ? err.message : "Retry failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
