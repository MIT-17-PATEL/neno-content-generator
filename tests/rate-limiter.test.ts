import { createSuite, assert, assertEquals } from "./test-utils";
import { checkRateLimit } from "../src/lib/security/rate-limiter";

export const { suite, test } = createSuite("Rate Limiter & IP Throttling");

test("should permit requests within rate limit tier", () => {
  const ip = "192.168.1.100";
  const res1 = checkRateLimit(ip, "auth");
  assertEquals(res1.allowed, true);
  assert(res1.remaining >= 0, "Remaining should be valid number");
});

test("should throttle requests exceeding the limit threshold", () => {
  const ip = "10.0.0.99";
  // auth limit is 15 req/min
  for (let i = 0; i < 15; i++) {
    const res = checkRateLimit(ip, "auth");
    assertEquals(res.allowed, true);
  }

  // 16th request must be throttled
  const throttledRes = checkRateLimit(ip, "auth");
  assertEquals(throttledRes.allowed, false);
  assertEquals(throttledRes.remaining, 0);
  assert((throttledRes.retryAfter || 0) > 0, "retryAfter seconds should be provided");
});

test("should maintain isolated rate limits across different categories", () => {
  const ip = "10.0.0.50";
  const authRes = checkRateLimit(ip, "auth");
  const aiRes = checkRateLimit(ip, "ai_generation");
  const apiRes = checkRateLimit(ip, "api");

  assertEquals(authRes.allowed, true);
  assertEquals(aiRes.allowed, true);
  assertEquals(apiRes.allowed, true);
  assertEquals(authRes.limit, 15);
  assertEquals(aiRes.limit, 10);
  assertEquals(apiRes.limit, 120);
});
