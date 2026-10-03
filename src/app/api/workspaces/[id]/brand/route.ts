import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/server/auth-guard";
import { brandSettingsSchema } from "@/validation";
import { dataStore } from "@/server/data-store";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireWorkspaceAccess(req, params.id);
  if ("error" in auth) return auth.error;

  const brand = await dataStore.getBrandSettings(params.id);
  if (!brand) {
    return NextResponse.json({ error: "Brand settings not found" }, { status: 404 });
  }

  return NextResponse.json({ brand });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireWorkspaceAccess(req, params.id);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = brandSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await dataStore.updateBrandSettings(params.id, {
      brandName: parsed.data.brandName,
      industry: parsed.data.industry,
      audience: parsed.data.audience,
      tone: parsed.data.tone,
      styleGuidelines: parsed.data.styleGuidelines,
      preferredTerms: parsed.data.preferredTerms,
      prohibitedTerms: parsed.data.prohibitedTerms,
    });

    return NextResponse.json({ brand: updated, success: true });
  } catch (error) {
    console.error("Update Brand Settings Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
