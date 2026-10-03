import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { VersionService } from "@/services/version-service";
import { dataStore } from "@/server/data-store";
import { z } from "zod";

const fixQaSchema = z.object({
  workspaceId: z.string().min(1),
  content: z.string().min(1),
  issueTitle: z.string().min(1),
  suggestion: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = fixQaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const wsAuth = await requireWorkspaceAccess(req, parsed.data.workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    const brand = await dataStore.getBrandSettings(parsed.data.workspaceId);
    const brandName = brand?.brand_name || "Enterprise";

    let fixedContent = parsed.data.content;

    // Apply auto-fix logic (e.g. replace prohibited terms)
    if (parsed.data.issueTitle.includes("Prohibited Term:")) {
      const match = parsed.data.issueTitle.match(/Prohibited Term:\s*"([^"]+)"/);
      if (match && match[1]) {
        const regex = new RegExp(`\\b${match[1]}\\b`, "gi");
        fixedContent = fixedContent.replace(regex, "engineered solution");
      }
    } else if (parsed.data.issueTitle.includes("Missing Main Title")) {
      fixedContent = `# Technical Blueprint: Architectural Overview\n\n${fixedContent}`;
    }

    // Save as new version
    const newVersion = await VersionService.createVersion({
      contentId: params.id,
      content: fixedContent,
      seoMetadata: {
        autoFixNote: `Auto-resolved QA issue: ${parsed.data.issueTitle}`,
      },
      createdBy: auth.user.userId,
    });

    return NextResponse.json({
      success: true,
      fixedContent,
      version: newVersion,
    });
  } catch (error) {
    console.error("Fix QA error:", error);
    return NextResponse.json({ error: "QA auto-fix failed" }, { status: 500 });
  }
}
