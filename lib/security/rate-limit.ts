import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Check if Redis is configured
const isRedisConfigured =
  process.env.UPSTASH_REDIS_REST_URL?.startsWith('https://') &&
  process.env.UPSTASH_REDIS_REST_TOKEN

// Create Redis client only if configured
const redis = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Different rate limiters for different purposes (only create if Redis is available)
export const rateLimiters = redis
  ? {
      // Standard API: 100 requests per minute
      api: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        analytics: true,
        prefix: 'rl:api',
      }),

      // Auth: 5 attempts per 15 minutes
      auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '15 m'),
        analytics: true,
        prefix: 'rl:auth',
      }),

      // Strict: 3 attempts per hour (for sensitive operations)
      strict: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 h'),
        analytics: true,
        prefix: 'rl:strict',
      }),

      // Invite codes: 10 per day
      invite: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '24 h'),
        analytics: true,
        prefix: 'rl:invite',
      }),
    }
  : null

export type RateLimiterType = 'api' | 'auth' | 'strict' | 'invite'

export async function checkRateLimit(
  limiter: RateLimiterType,
  identifier: string
): Promise<{ success: boolean; reset: number; remaining: number }> {
  // If Redis is not configured, allow all requests (development mode)
  if (!rateLimiters) {
    return {
      success: true,
      reset: Date.now() + 60000,
      remaining: 100,
    }
  }

  const result = await rateLimiters[limiter].limit(identifier)
  return {
    success: result.success,
    reset: result.reset,
    remaining: result.remaining,
  }
}

// Helper to get client IP from request headers
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return 'unknown'
}
