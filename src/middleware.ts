import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RateLimitType } from "@/lib/security/rate-limiter";

const PUBLIC_PATHS = ["/auth/signin", "/auth/signup", "/_next", "/favicon.ico", "/api/auth/signin", "/api/auth/signup"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.ip || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

  // 1. Rate Limiting for API routes
  if (pathname.startsWith("/api/")) {
    let rateType: RateLimitType = "api";

    if (pathname.startsWith("/api/auth/")) {
      rateType = "auth";
    } else if (
      pathname.startsWith("/api/generation/") ||
      pathname === "/api/media/generate" ||
      pathname.endsWith("/revise")
    ) {
      rateType = "ai_generation";
    }

    const rateResult = checkRateLimit(ip, rateType);

    if (!rateResult.allowed) {
      const response = NextResponse.json(
        {
          error: "Rate limit exceeded. Too many requests.",
          retryAfterSeconds: rateResult.retryAfter,
        },
        { status: 429 }
      );

      response.headers.set("X-RateLimit-Limit", String(rateResult.limit));
      response.headers.set("X-RateLimit-Remaining", "0");
      response.headers.set("X-RateLimit-Reset", String(rateResult.reset));
      if (rateResult.retryAfter) {
        response.headers.set("Retry-After", String(rateResult.retryAfter));
      }
      applySecurityHeaders(response);
      return response;
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(rateResult.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateResult.remaining));
    response.headers.set("X-RateLimit-Reset", String(rateResult.reset));
    applySecurityHeaders(response);
    return response;
  }

  // 2. Auth Session Guard for Protected Dashboard Pages
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
  const sessionToken = req.cookies.get("ai_studio_session")?.value;

  if (!isPublic && !sessionToken && !pathname.startsWith("/api")) {
    const signInUrl = new URL("/auth/signin", req.url);
    const response = NextResponse.redirect(signInUrl);
    applySecurityHeaders(response);
    return response;
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

function applySecurityHeaders(res: NextResponse) {
  // OWASP Security Headers
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
