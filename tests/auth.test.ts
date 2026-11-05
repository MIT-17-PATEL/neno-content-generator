import { createSuite, assert, assertEquals } from "./test-utils";
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from "../src/lib/auth";

export const { suite, test } = createSuite("Authentication & JWT Sessions");

test("should hash password with bcrypt and verify correctly", async () => {
  const plainPassword = "SuperSecurePassword987!";
  const hash = await hashPassword(plainPassword);

  assert(hash.length > 20, "Hash should be generated");
  assert(hash !== plainPassword, "Hash must differ from plaintext");

  const isMatch = await verifyPassword(plainPassword, hash);
  assertEquals(isMatch, true, "Password verification should pass for identical plaintext");

  const isWrongMatch = await verifyPassword("WrongPassword123", hash);
  assertEquals(isWrongMatch, false, "Password verification must fail for wrong plaintext");
});

test("should sign and verify valid JWT session token", async () => {
  const payload = {
    userId: "usr_test_12345",
    email: "test.author@nenotechnology.com",
    name: "Test Author",
  };

  const token = await createSessionToken(payload);
  assert(typeof token === "string" && token.length > 30, "JWT token string should be created");

  const verified = await verifySessionToken(token);
  assert(verified !== null, "Verified payload should not be null");
  assertEquals(verified?.userId, payload.userId);
  assertEquals(verified?.email, payload.email);
  assertEquals(verified?.name, payload.name);
});

test("should reject tampered or corrupted JWT tokens", async () => {
  const payload = {
    userId: "usr_victim_01",
    email: "victim@domain.com",
    name: "Victim User",
  };

  const token = await createSessionToken(payload);
  const tamperedToken = token.slice(0, -5) + "abcde";

  const verified = await verifySessionToken(tamperedToken);
  assertEquals(verified, null, "Tampered token verification should return null");

  const emptyVerified = await verifySessionToken("invalid.junk.token");
  assertEquals(emptyVerified, null, "Malformed token verification should return null");
});

test("production refuses a missing, short or public-default AUTH_SECRET (fails closed)", async () => {
  const { getAuthSecret } = await import("../src/lib/auth-secret");
  const env = process.env as Record<string, string | undefined>;
  const prev = { NODE_ENV: env.NODE_ENV, AUTH_SECRET: env.AUTH_SECRET };
  try {
    env.NODE_ENV = "production";
    for (const s of [undefined, "short", "ai-content-studio-default-dev-secret-key-32chars"]) {
      env.AUTH_SECRET = s;
      assert(getAuthSecret() === null, `secret ${s ?? "(unset)"} must be rejected in production`);
    }
    env.AUTH_SECRET = "a".repeat(40);
    assert(getAuthSecret() !== null, "a real 32+ char secret is accepted");
    env.NODE_ENV = "development";
    env.AUTH_SECRET = undefined;
    assert(getAuthSecret() !== null, "dev falls back to the dev secret");
  } finally {
    env.NODE_ENV = prev.NODE_ENV;
    env.AUTH_SECRET = prev.AUTH_SECRET;
  }
});
