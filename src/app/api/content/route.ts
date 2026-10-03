import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess, requireAuth } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";
import { z } from "zod";

const createContentSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  type: z.enum(["blog", "case-study"]),
  title: z.string().min(2, "Title must be at least 2 characters"),
  category: z.string().optional(),
  excerpt: z.string().optional(),
  initialContent: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const type = searchParams.get("type") || undefined;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query parameter is required" },
      { status: 400 }
    );
  }

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  const items = await ContentService.listByWorkspace(workspaceId, {
    type,
    status,
    search,
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = createContentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const wsAuth = await requireWorkspaceAccess(req, parsed.data.workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    const item = await ContentService.create({
      workspaceId: parsed.data.workspaceId,
      type: parsed.data.type,
      title: parsed.data.title,
      category: parsed.data.category || "General",
      excerpt: parsed.data.excerpt || "",
      createdBy: auth.user.userId,
    });

    // Create initial Version 1
    const initialText =
      parsed.data.initialContent ||
      `# ${parsed.data.title}\n\n*Draft created on ${new Date().toLocaleDateString()}*\n\nStart writing or initiate an autonomous AI generation run.`;

    const version = await VersionService.createVersion({
      contentId: item.id,
      content: initialText,
      seoMetadata: {
        seoTitle: parsed.data.title,
        metaDescription: parsed.data.excerpt || "",
        slug: item.slug,
        keywords: [],
      },
      createdBy: auth.user.userId,
    });

    return NextResponse.json({ item, version }, { status: 201 });
  } catch (error) {
    console.error("Create content error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
