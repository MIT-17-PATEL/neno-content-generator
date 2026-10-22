import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth-guard";
import { dataStore } from "@/server/data-store";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const user = await dataStore.findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const workspaces = await dataStore.getUserWorkspaces(user.id);

  // Explicit allowlist so secret fields (e.g. passwordHash) can never leak
  const publicUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };

  return NextResponse.json({
    user: publicUser,
    workspaces,
    activeWorkspace: workspaces[0] || null,
    authenticated: true,
  });
}
