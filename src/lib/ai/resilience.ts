/**
 * AI Content Studio — Failure Handling & Resilience Engine
 * Provides Exponential Backoff with Jitter, Circuit Breaker, and Typed Errors.
 */

export class AiProviderError extends Error {
  constructor(message: string, public status?: number, public isRetryable = true) {
    super(message);
    this.name = "AiProviderError";
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message = "AI Provider Circuit Breaker is OPEN. Using offline heuristic engine.") {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: unknown, nextDelayMs: number) => void;
}

/**
 * Executes an async operation with exponential backoff and randomized jitter
 */
export async function executeWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 4000;
  const backoffMultiplier = options.backoffMultiplier ?? 2;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt <= maxRetries) {
    try {
      return await operation(attempt);
    } catch (err: unknown) {
      attempt++;
      if (attempt > maxRetries) {
        throw err;
      }

      // Check if error is explicitly non-retryable (e.g. 400 Bad Request, 401 Unauthorized)
      if (err instanceof AiProviderError && !err.isRetryable) {
        throw err;
      }

      // Calculate jittered delay: delay * (0.8 + 0.4 * Math.random())
      const jitter = 0.8 + Math.random() * 0.4;
      const actualDelay = Math.min(maxDelayMs, Math.round(delay * jitter));

      if (options.onRetry) {
        options.onRetry(attempt, err, actualDelay);
      }

      await new Promise((resolve) => setTimeout(resolve, actualDelay));
      delay = Math.min(maxDelayMs, delay * backoffMultiplier);
    }
  }

  throw new Error("Retry loop exhausted");
}

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: number;
  totalExecutions: number;
}

/**
 * Circuit Breaker pattern preventing continuous hammering of failing downstream APIs
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime = 0;
  private totalExecutions = 0;

  constructor(
    private failureThreshold = 3,
    private cooldownPeriodMs = 30000,
    private halfOpenSuccessThreshold = 2
  ) {}

  getState(): CircuitState {
    const now = Date.now();
    if (this.state === "OPEN" && now - this.lastFailureTime > this.cooldownPeriodMs) {
      this.state = "HALF_OPEN";
      this.consecutiveSuccesses = 0;
    }
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.getState(),
      failures: this.failureCount,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime || undefined,
      totalExecutions: this.totalExecutions,
    };
  }

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    this.totalExecutions++;
    const currentState = this.getState();

    if (currentState === "OPEN") {
      if (fallback) {
        return await fallback();
      }
      throw new CircuitBreakerOpenError();
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) {
        return await fallback();
      }
      throw err;
    }
  }

  private onSuccess() {
    if (this.state === "HALF_OPEN") {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.halfOpenSuccessThreshold) {
        this.state = "CLOSED";
        this.failureCount = 0;
        this.consecutiveSuccesses = 0;
      }
    } else if (this.state === "CLOSED") {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.state === "HALF_OPEN" || this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }

  reset() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = 0;
  }
}

// Global AI Provider Circuit Breaker singleton
export const aiCircuitBreaker = new CircuitBreaker(3, 30000, 2);
