import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth-guard";
import { AgentOrchestrator } from "@/agents/orchestrator";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const resumedState = await AgentOrchestrator.resumePipeline(params.id);
    return NextResponse.json({
      success: true,
      state: resumedState,
    });
  } catch (error) {
    console.error("Resume pipeline error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resume pipeline" },
      { status: 500 }
    );
  }
}
