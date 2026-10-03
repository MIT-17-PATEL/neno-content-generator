import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/server/auth-guard";
import { updateWorkspaceSchema } from "@/validation";
import { dataStore } from "@/server/data-store";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireWorkspaceAccess(req, params.id);
  if ("error" in auth) return auth.error;

  const workspace = await dataStore.getWorkspaceById(params.id);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  return NextResponse.json({ workspace });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireWorkspaceAccess(req, params.id);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = updateWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await dataStore.updateWorkspace(params.id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json({ workspace: updated });
  } catch (error) {
    console.error("Update Workspace Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
