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

// In-memory rate limiter for when Redis is not available
// This provides basic protection in development/fallback scenarios
interface RateLimitEntry {
  count: number
  resetAt: number
}

const inMemoryStore = new Map<string, RateLimitEntry>()
const CLEANUP_INTERVAL = 60000 // Clean up expired entries every minute

// Cleanup old entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of inMemoryStore.entries()) {
      if (entry.resetAt < now) {
        inMemoryStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

// Rate limit configurations for in-memory fallback
const inMemoryLimits: Record<string, { maxRequests: number; windowMs: number }> = {
  api: { maxRequests: 100, windowMs: 60000 }, // 100 per minute
  auth: { maxRequests: 5, windowMs: 900000 }, // 5 per 15 minutes
  strict: { maxRequests: 3, windowMs: 3600000 }, // 3 per hour
  invite: { maxRequests: 10, windowMs: 86400000 }, // 10 per day
}

function checkInMemoryRateLimit(
  limiter: string,
  identifier: string
): { success: boolean; reset: number; remaining: number } {
  const config = inMemoryLimits[limiter] || inMemoryLimits.api
  const key = `${limiter}:${identifier}`
  const now = Date.now()

  const entry = inMemoryStore.get(key)

  if (!entry || entry.resetAt < now) {
    // Create new entry
    inMemoryStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return {
      success: true,
      reset: now + config.windowMs,
      remaining: config.maxRequests - 1,
    }
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      reset: entry.resetAt,
      remaining: 0,
    }
  }

  entry.count++
  return {
    success: true,
    reset: entry.resetAt,
    remaining: config.maxRequests - entry.count,
  }
}

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
  // If Redis is not configured, use in-memory rate limiter as fallback
  if (!rateLimiters) {
    return checkInMemoryRateLimit(limiter, identifier)
  }

  const result = await rateLimiters[limiter].limit(identifier)
  return {
    success: result.success,
    reset: result.reset,
    remaining: result.remaining,
  }
}

// Validate IP address format
function isValidIp(ip: string): boolean {
  // IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  // IPv6 validation (simplified)
  const ipv6Regex = /^([a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$/
  // IPv6 compressed format
  const ipv6CompressedRegex = /^([a-fA-F0-9]{0,4}:){1,7}[a-fA-F0-9]{0,4}$/

  if (ipv4Regex.test(ip)) {
    // Additional check for valid IPv4 octets
    const octets = ip.split('.').map(Number)
    return octets.every((octet) => octet >= 0 && octet <= 255)
  }

  return ipv6Regex.test(ip) || ipv6CompressedRegex.test(ip)
}

// Helper to get client IP from request headers with validation
export function getClientIp(request: Request): string {
  // In production, trust x-forwarded-for from Vercel/proxy
  // Only trust the first IP (client IP) and validate format
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const clientIp = forwarded.split(',')[0].trim()
    if (isValidIp(clientIp)) {
      return clientIp
    }
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp && isValidIp(realIp)) {
    return realIp
  }

  // Fallback - use a hash of other identifying headers for uniqueness
  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  const fallbackId = `unknown-${hashString(userAgent + acceptLanguage)}`

  return fallbackId
}

// Simple string hash for fallback identification
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}
