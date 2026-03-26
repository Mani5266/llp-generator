/**
 * In-memory sliding-window rate limiter.
 *
 * Each key (typically `userId:routeName`) tracks an array of timestamps.
 * Old entries outside the window are pruned on every check.
 *
 * Limitations (acceptable for Vercel serverless):
 *   - State is per-instance and resets on cold start / redeploy.
 *   - Not shared across multiple serverless function instances.
 *   - For stronger guarantees, swap in Upstash Redis later.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup every 5 minutes to prevent memory leaks from expired entries
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function pruneExpiredEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  /** Requests remaining in this window */
  remaining: number;
  /** Unix ms timestamp when the oldest request in the window expires */
  retryAfterMs: number;
}

/**
 * Check whether a request from `key` is allowed under the given config.
 *
 * Usage:
 *   const { allowed, remaining, retryAfterMs } = rateLimit("userId:chat", { maxRequests: 20, windowMs: 60*60*1000 });
 *   if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const { maxRequests, windowMs } = config;

  // Lazy cleanup
  pruneExpiredEntries(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Prune timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    // Rate limited — calculate when the oldest request in the window expires
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 0),
    };
  }

  // Allowed — record this request
  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
  };
}

// ── Pre-configured limiters for each route ──────────────────────────

const ONE_HOUR = 60 * 60 * 1000;

export const RATE_LIMITS = {
  chat:        { maxRequests: 20,  windowMs: ONE_HOUR },
  renderDeed:  { maxRequests: 60,  windowMs: ONE_HOUR },
  downloadDocx:{ maxRequests: 30,  windowMs: ONE_HOUR },
  downloadPdf: { maxRequests: 30,  windowMs: ONE_HOUR },
} as const;

/**
 * Helper: build a 429 JSON response with standard headers.
 */
export function rateLimitResponse(retryAfterMs: number) {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfterSeconds: retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}
