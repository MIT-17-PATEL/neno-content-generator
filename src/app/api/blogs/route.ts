import { NextRequest, NextResponse } from "next/server";
import { ContentService } from "@/services/content-service";

export const revalidate = 60; // ISR cache for 60 seconds

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const sortBy = (searchParams.get("sortBy") as "newest" | "oldest" | "title") || "newest";

    const data = await ContentService.listPublicBlogs({
      search,
      category,
      page,
      limit,
      sortBy,
    });

    return NextResponse.json(
      {
        success: true,
        ...data,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Public blogs API error:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch public blogs";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
