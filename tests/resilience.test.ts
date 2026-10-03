import { createSuite, assert, assertEquals, assertThrows } from "./test-utils";
import {
  executeWithRetry,
  CircuitBreaker,
  AiProviderError,
  CircuitBreakerOpenError,
} from "../src/lib/ai/resilience";

export const { suite, test } = createSuite("Resilience, Backoff & Circuit Breaker");

test("should execute successfully on the first attempt", async () => {
  let attempts = 0;
  const result = await executeWithRetry(async (attempt) => {
    attempts++;
    return `Success on attempt ${attempt}`;
  }, { maxRetries: 3, initialDelayMs: 10 });

  assertEquals(attempts, 1);
  assertEquals(result, "Success on attempt 0");
});

test("should retry on transient failures and succeed when recovered", async () => {
  let callCount = 0;
  const result = await executeWithRetry(
    async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error("Temporary network timeout");
      }
      return "Recovered data";
    },
    { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 50 }
  );

  assertEquals(callCount, 3);
  assertEquals(result, "Recovered data");
});

test("should immediately abort on non-retryable AiProviderError", async () => {
  let callCount = 0;
  let caughtError: unknown = null;

  try {
    await executeWithRetry(
      async () => {
        callCount++;
        throw new AiProviderError("Invalid API Key / Unauthorized", 401, false);
      },
      { maxRetries: 3, initialDelayMs: 10 }
    );
  } catch (err) {
    caughtError = err;
  }

  assertEquals(callCount, 1, "Should not retry non-retryable errors");
  assert(caughtError instanceof AiProviderError);
});

test("should trip CircuitBreaker to OPEN after threshold failures and trigger fallback", async () => {
  const breaker = new CircuitBreaker(2, 500, 1);
  assertEquals(breaker.getState(), "CLOSED");

  // Failure 1
  try {
    await breaker.execute(async () => {
      throw new Error("Downstream service 503");
    });
  } catch {
    // expected
  }
  assertEquals(breaker.getState(), "CLOSED");

  // Failure 2 (trips breaker)
  try {
    await breaker.execute(async () => {
      throw new Error("Downstream service 503");
    });
  } catch {
    // expected
  }
  assertEquals(breaker.getState(), "OPEN");

  // Next call with fallback when OPEN
  const fallbackResult = await breaker.execute(
    async () => "Primary",
    async () => "Fallback Result"
  );
  assertEquals(fallbackResult, "Fallback Result");
});
