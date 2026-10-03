import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth-guard";
import { dataStore } from "@/server/data-store";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    // If no session exists in development, fallback to default user context
    const defaultUser = await dataStore.findUserByEmail("mitpatel@nenotechnology.com");
    if (defaultUser) {
      const workspaces = await dataStore.getUserWorkspaces(defaultUser.id);
      const { passwordHash: _, ...publicUser } = defaultUser;
      return NextResponse.json({
        user: publicUser,
        workspaces,
        activeWorkspace: workspaces[0] || null,
        authenticated: true,
      });
    }
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const user = await dataStore.findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const workspaces = await dataStore.getUserWorkspaces(user.id);

  return NextResponse.json({
    user,
    workspaces,
    activeWorkspace: workspaces[0] || null,
    authenticated: true,
  });
}
