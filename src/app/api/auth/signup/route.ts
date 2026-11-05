import { NextRequest, NextResponse } from "next/server";
import { signUpSchema } from "@/validation";
import { hashPassword, createSessionToken } from "@/lib/auth";
import { dataStore } from "@/server/data-store";

export async function POST(req: NextRequest) {
  // A public deployment must not let anyone create an account; enable deliberately with ALLOW_SIGNUP=true.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SIGNUP !== "true") {
    return NextResponse.json({ error: "Sign-up is disabled. Ask an administrator for access." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existingUser = await dataStore.findUserByEmail(parsed.data.email);
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const newUser = await dataStore.createUser({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
    });

    const token = await createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
    });

    const workspaces = await dataStore.getUserWorkspaces(newUser.id);

    const response = NextResponse.json({
      user: newUser,
      workspaces,
      activeWorkspace: workspaces[0] || null,
    });

    // Set secure HTTP-only session cookie
    response.cookies.set("ai_studio_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("SignUp Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
