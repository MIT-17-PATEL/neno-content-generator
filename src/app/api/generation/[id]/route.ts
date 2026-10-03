import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth-guard";
import { AgentOrchestrator } from "@/agents/orchestrator";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const state = AgentOrchestrator.getState(params.id);
  if (!state) {
    return NextResponse.json({ error: "Generation run not found" }, { status: 404 });
  }

  return NextResponse.json({ runId: params.id, state });
}
