import { NextRequest, NextResponse } from "next/server";
import { signInSchema } from "@/validation";
import { verifyPassword, createSessionToken } from "@/lib/auth";
import { dataStore } from "@/server/data-store";
import { AuditService } from "@/services/audit-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await dataStore.findUserByEmail(parsed.data.email);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const workspaces = await dataStore.getUserWorkspaces(user.id);
    const { passwordHash: _, ...publicUser } = user;

    AuditService.record({
      userId: user.id,
      userEmail: user.email,
      action: "AUTH_LOGIN",
      details: {
        workspaceCount: workspaces.length,
      },
    });

    const response = NextResponse.json({
      user: publicUser,
      workspaces,
      activeWorkspace: workspaces[0] || null,
    });

    response.cookies.set("ai_studio_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("SignIn Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
