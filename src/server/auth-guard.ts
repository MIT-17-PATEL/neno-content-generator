import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, TokenPayload } from "@/lib/auth";
import { dataStore } from "@/server/data-store";

export interface AuthenticatedContext {
  user: TokenPayload;
}

export interface WorkspaceAuthorizedContext extends AuthenticatedContext {
  workspaceId: string;
}

export async function getSessionUser(
  req: NextRequest
): Promise<TokenPayload | null> {
  const authHeader = req.headers.get("authorization");
  let token = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    token = req.cookies.get("ai_studio_session")?.value || "";
  }

  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAuth(
  req: NextRequest
): Promise<{ user: TokenPayload } | { error: NextResponse }> {
  const user = await getSessionUser(req);
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }
  return { user };
}

export async function requireWorkspaceAccess(
  req: NextRequest,
  workspaceId: string
): Promise<{ user: TokenPayload } | { error: NextResponse }> {
  const authResult = await requireAuth(req);
  if ("error" in authResult) return authResult;

  const isMember = await dataStore.isUserInWorkspace(
    authResult.user.userId,
    workspaceId
  );
  if (!isMember) {
    return {
      error: NextResponse.json(
        { error: "Access denied to requested workspace", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  return authResult;
}
