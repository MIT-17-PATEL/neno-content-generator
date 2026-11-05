// Shared by src/lib/auth.ts (Node) and src/middleware.ts (Edge), so it imports nothing.
const DEV_SECRET = "ai-content-studio-default-dev-secret-key-32chars";

/**
 * JWT signing key. The dev default is public (it's in the repo), so production refuses to run with it:
 * without an AUTH_SECRET of 32+ characters, sessions can't be created and every existing cookie is rejected.
 */
export function getAuthSecret(): Uint8Array | null {
  const s = process.env.AUTH_SECRET?.trim();
  if (process.env.NODE_ENV === "production") {
    // The dev default is committed in the repo (and its history), so it never counts as a real secret.
    return s && s.length >= 32 && s !== DEV_SECRET ? new TextEncoder().encode(s) : null;
  }
  return new TextEncoder().encode(s || DEV_SECRET);
}
