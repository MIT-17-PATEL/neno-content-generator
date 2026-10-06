import { NextRequest, NextResponse } from "next/server";
import { TrendingTopicsService } from "@/services/trending-topics-service";
import { z } from "zod";

const trendingTopicsSchema = z.object({
  category: z.string().optional(),
  count: z.number().min(1).max(10).optional().default(5),
  industry: z.string().optional(),
  focusArea: z.string().optional(),
  workspaceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = trendingTopicsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { category, count, industry, focusArea, workspaceId } = parsed.data;

    const result = await TrendingTopicsService.getTrendingTopics({
      category,
      count,
      industry,
      focusArea,
      workspaceId,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Trending topics route error:", err);
    const msg = err instanceof Error ? err.message : "Failed to fetch trending topics";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const count = parseInt(searchParams.get("count") || "5", 10);
    const industry = searchParams.get("industry") || undefined;
    const workspaceId = searchParams.get("workspaceId") || undefined;

    const result = await TrendingTopicsService.getTrendingTopics({
      category,
      count: isNaN(count) ? 5 : count,
      industry,
      workspaceId,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Trending topics GET error:", err);
    return NextResponse.json({ error: "Failed to fetch trending topics" }, { status: 500 });
  }
}
