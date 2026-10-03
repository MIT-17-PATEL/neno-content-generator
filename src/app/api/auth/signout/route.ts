import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Signed out successfully" });
  response.cookies.delete("ai_studio_session");
  return response;
}
