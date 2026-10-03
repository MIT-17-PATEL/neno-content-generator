import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth-guard";
import { createWorkspaceSchema } from "@/validation";
import { dataStore } from "@/server/data-store";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const workspaces = await dataStore.getUserWorkspaces(auth.user.userId);
  return NextResponse.json({ workspaces });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = createWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const workspace = await dataStore.createWorkspace({
      ownerId: auth.user.userId,
      name: parsed.data.name,
      description: parsed.data.description,
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error("Create Workspace Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
