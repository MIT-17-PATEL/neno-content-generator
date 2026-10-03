import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { VersionService } from "@/services/version-service";
import { z } from "zod";

const saveVersionSchema = z.object({
  workspaceId: z.string().min(1),
  content: z.string().min(1, "Content cannot be empty"),
  seoMetadata: z.record(z.unknown()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query parameter is required" },
      { status: 400 }
    );
  }

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  const versions = await VersionService.listByContent(params.id);
  return NextResponse.json({ versions });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = saveVersionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const wsAuth = await requireWorkspaceAccess(req, parsed.data.workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    const version = await VersionService.createVersion({
      contentId: params.id,
      content: parsed.data.content,
      seoMetadata: parsed.data.seoMetadata,
      createdBy: auth.user.userId,
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    console.error("Save version error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
