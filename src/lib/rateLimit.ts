/**
 * IP-based daily rate limiter for Next.js API routes (Vercel serverless).
 * Uses an in-memory Map per serverless instance — good enough for abuse prevention.
 * Limits reset at midnight UTC each day.
 *
 * Daily limits (IP-based, no auth):
 *   Free: 3/day  — default
 *   Pro:  15/day — pass plan="pro"
 *   YOLO: 30/day — pass plan="yolo"
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // midnight UTC timestamp
}

const store = new Map<string, RateLimitEntry>();

function midnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return midnight.getTime();
}

// Clean up expired entries every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (entry.resetAt < now) store.delete(key);
    });
  }, 30 * 60 * 1000);
}

const DAILY_LIMITS: Record<string, number> = {
  free: 3,
  pro:  15,
  yolo: 30,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(ip: string, plan: string = 'free'): RateLimitResult {
  const now = Date.now();
  const max = DAILY_LIMITS[plan] ?? DAILY_LIMITS.free;
  const key = `${ip}:${plan}`;
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = midnightUTC();
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

export function getIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

export function rateLimitResponse(resetAt: number): Response {
  const hoursLeft = Math.ceil((resetAt - Date.now()) / (60 * 60 * 1000));
  return new Response(
    JSON.stringify({
      error: `You've reached your daily AI limit. Resets in ~${hoursLeft}h (midnight UTC). Upgrade to Pro for 15/day or YOLO for 30/day.`,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
      },
    }
  );
}
