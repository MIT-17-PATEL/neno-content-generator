import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { analyzeSeo } from "@/lib/analysis/seo-analyzer";
import { analyzeQa } from "@/lib/analysis/qa-analyzer";
import { dataStore } from "@/server/data-store";
import { ResearchService } from "@/services/research-service";
import { z } from "zod";

const analyzeSchema = z.object({
  workspaceId: z.string().min(1),
  content: z.string(),
  seoTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  slug: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = analyzeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const wsAuth = await requireWorkspaceAccess(req, parsed.data.workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    const brand = await dataStore.getBrandSettings(parsed.data.workspaceId);
    const sources = await ResearchService.listByContent(params.id);

    const seoResult = analyzeSeo(
      parsed.data.content,
      parsed.data.seoTitle || "Draft Title",
      parsed.data.metaDescription || "Draft description",
      parsed.data.slug || "draft-slug",
      parsed.data.keywords || []
    );

    const qaResult = analyzeQa(
      parsed.data.content,
      brand?.prohibited_terms || [],
      brand?.preferred_terms || [],
      sources.length > 0
    );

    return NextResponse.json({
      seo: seoResult,
      qa: qaResult,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
