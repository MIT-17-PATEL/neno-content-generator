export type RateLimitType = "auth" | "ai_generation" | "api";

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> = {
  auth: { limit: 15, windowMs: 60 * 1000 }, // 15 req/min
  ai_generation: { limit: 10, windowMs: 60 * 1000 }, // 10 req/min
  api: { limit: 120, windowMs: 60 * 1000 }, // 120 req/min
};

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      const validTimestamps = entry.timestamps.filter((t) => now - t < 5 * 60 * 1000);
      if (validTimestamps.length === 0) {
        rateLimitStore.delete(key);
      } else {
        entry.timestamps = validTimestamps;
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfter?: number; // Seconds until next slot
}

export function checkRateLimit(
  identifier: string,
  type: RateLimitType = "api"
): RateLimitResult {
  const config = LIMIT_CONFIGS[type];
  const key = `${type}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(key, entry);
  }

  // Filter timestamps within current sliding window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const count = entry.timestamps.length;
  const resetTime = Math.ceil((now + config.windowMs) / 1000);

  if (count >= config.limit) {
    const oldestTimestamp = entry.timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldestTimestamp + config.windowMs - now) / 1000));
    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      reset: resetTime,
      retryAfter,
    };
  }

  // Record current request
  entry.timestamps.push(now);

  return {
    allowed: true,
    limit: config.limit,
    remaining: config.limit - entry.timestamps.length,
    reset: resetTime,
  };
}
