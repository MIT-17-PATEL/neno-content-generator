import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth-guard";
import { aiCircuitBreaker } from "@/lib/ai/resilience";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const metrics = aiCircuitBreaker.getMetrics();
  return NextResponse.json({
    status: metrics.state,
    provider: process.env.AI_PROVIDER_API_KEY ? "OpenAI API Active" : "Offline Heuristic Mode",
    circuitBreaker: metrics,
    timestamp: new Date().toISOString(),
  });
}
