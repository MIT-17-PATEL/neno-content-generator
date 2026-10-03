import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ResearchService } from "@/services/research-service";
import { sanitizeUntrustedInput } from "@/lib/security/sanitizer";
import { z } from "zod";

const addSourceSchema = z.object({
  workspaceId: z.string().min(1),
  contentId: z.string().min(1),
  url: z.string().url("Valid URL is required"),
  title: z.string().min(2, "Title is required"),
  publisher: z.string().optional(),
  notes: z.string().optional(),
  relevance: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const contentId = searchParams.get("contentId");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query parameter is required" },
      { status: 400 }
    );
  }

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  if (contentId) {
    const sources = await ResearchService.listByContent(contentId);
    return NextResponse.json({ sources });
  }

  const sources = await ResearchService.listByWorkspace(workspaceId);
  return NextResponse.json({ sources });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = addSourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const wsAuth = await requireWorkspaceAccess(req, parsed.data.workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    // Sanitize notes / untrusted text
    const sanitizedTitle = sanitizeUntrustedInput(parsed.data.title).sanitizedText;
    const sanitizedNotes = parsed.data.notes
      ? sanitizeUntrustedInput(parsed.data.notes).sanitizedText
      : undefined;

    const source = await ResearchService.addSource({
      contentId: parsed.data.contentId,
      url: parsed.data.url,
      title: sanitizedTitle,
      publisher: parsed.data.publisher,
      notes: sanitizedNotes,
      relevance: parsed.data.relevance || "Primary Empirical Reference",
    });

    return NextResponse.json({ source, success: true }, { status: 201 });
  } catch (error) {
    console.error("Add research source error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
