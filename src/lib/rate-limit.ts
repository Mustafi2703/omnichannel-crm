import Redis from "ioredis";

const buckets = new Map<string, { count: number; reset: number }>();
type RateLimitResult = { ok: boolean; retryAfter: number };

function memoryRateLimit(key: string, limit = 30, windowMs = 60_000): RateLimitResult {
  const now = Date.now(); const bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) { buckets.set(key, { count: 1, reset: now + windowMs }); return { ok: true, retryAfter: 0 }; }
  bucket.count += 1;
  return { ok: bucket.count <= limit, retryAfter: Math.ceil((bucket.reset - now) / 1000) };
}

const globalForRedis = globalThis as typeof globalThis & { omniRateLimitRedis?: Redis };
function redisClient() {
  if (!process.env.REDIS_URL) return null;
  if (!globalForRedis.omniRateLimitRedis) {
    const client = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 1_000, lazyConnect: true });
    // Requests fall back to the local limiter during a Redis outage; do not
    // allow an EventEmitter "error" event to crash the web process.
    client.on("error", () => undefined);
    globalForRedis.omniRateLimitRedis = client;
  }
  return globalForRedis.omniRateLimitRedis;
}

/**
 * Atomically increments a shared Redis counter when Redis is configured.
 * The in-memory fallback keeps local development and a temporary Redis outage
 * usable, but production Compose should always have REDIS_URL set.
 */
export async function rateLimit(key: string, limit = 30, windowMs = 60_000): Promise<RateLimitResult> {
  const redis = redisClient();
  if (!redis) return memoryRateLimit(key, limit, windowMs);
  try {
    if (redis.status === "wait") await redis.connect();
    const count = await redis.incr(`rate-limit:${key}`);
    if (count === 1) await redis.pexpire(`rate-limit:${key}`, windowMs);
    const ttl = await redis.pttl(`rate-limit:${key}`);
    return { ok: count <= limit, retryAfter: ttl > 0 ? Math.ceil(ttl / 1000) : Math.ceil(windowMs / 1000) };
  } catch {
    return memoryRateLimit(key, limit, windowMs);
  }
}
export function clientIp(request: Request) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; }
