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
