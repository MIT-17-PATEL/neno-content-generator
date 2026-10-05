import { NextRequest, NextResponse } from "next/server";
import { ContentService } from "@/services/content-service";

export const revalidate = 60; // ISR cache for 60 seconds

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const blog = await ContentService.getPublicBlogBySlugOrId(slug);

    if (!blog || (blog.status !== "approved" && blog.status !== "exported")) {
      return NextResponse.json({ error: "Blog not found or not published" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        blog,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Public blog by slug API error:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch blog";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
