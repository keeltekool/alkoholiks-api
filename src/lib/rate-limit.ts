import { Redis } from "@upstash/redis";

const RATE_LIMIT = 100; // requests per hour
const WINDOW = 3600; // 1 hour in seconds

let redis: Redis | null = null;
function getRedis(): Redis {
  if (redis) return redis;
  redis = Redis.fromEnv();
  return redis;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp
  retryAfter: number | null; // seconds
}

export async function checkRateLimit(consumerId: string): Promise<RateLimitResult> {
  const r = getRedis();
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % WINDOW); // Align to hour boundary
  const key = `ratelimit:${consumerId}:${windowStart}`;

  const current = await r.incr(key);

  // Set expiry on first request in window
  if (current === 1) {
    await r.expire(key, WINDOW);
  }

  const resetAt = windowStart + WINDOW;
  const remaining = Math.max(0, RATE_LIMIT - current);
  const allowed = current <= RATE_LIMIT;

  return {
    allowed,
    remaining,
    resetAt,
    retryAfter: allowed ? null : resetAt - now,
  };
}
