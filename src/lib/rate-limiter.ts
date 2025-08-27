/**
 * Rate Limiting Middleware
 * Production-ready rate limiting with Redis backend and security features
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCache } from './cache'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: NextRequest) => string
  onLimitReached?: (req: NextRequest, identifier: string) => void
  headers?: boolean // Include rate limit headers
  standardHeaders?: boolean // RFC compliant headers
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  resetTime: Date
  totalHits: number
  windowStart: Date
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  totalRequests: number
}

class RateLimiter {
  private cache = getCache()
  private config: Required<RateLimitConfig>

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
      skipFailedRequests: config.skipFailedRequests ?? false,
      keyGenerator: config.keyGenerator ?? this.defaultKeyGenerator,
      onLimitReached: config.onLimitReached ?? (() => {}),
      headers: config.headers ?? true,
      standardHeaders: config.standardHeaders ?? true,
    }
  }

  private defaultKeyGenerator(req: NextRequest): string {
    // Use multiple identifiers for more accurate rate limiting
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const real = req.headers.get('x-real-ip')
    const connecting = req.headers.get('x-connecting-ip')

    const ip = forwarded || real || connecting || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Create a composite key for better tracking
    return `rate_limit:${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 16)}`
  }

  private getCurrentWindow(): number {
    return Math.floor(Date.now() / this.config.windowMs)
  }

  private getResetTime(window: number): number {
    return (window + 1) * this.config.windowMs
  }

  async checkLimit(req: NextRequest): Promise<{
    allowed: boolean
    info: RateLimitInfo
    headers: Record<string, string>
  }> {
    const identifier = this.config.keyGenerator(req)
    const currentWindow = this.getCurrentWindow()
    const cacheKey = {
      prefix: 'ratelimit',
      identifier: `${identifier}:${currentWindow}`,
      version: 'v1',
    }

    try {
      // Get current usage
      const current = (await this.cache.get<{
        count: number
        windowStart: number
      }>(cacheKey)) || { count: 0, windowStart: currentWindow }

      const isAllowed = current.count < this.config.maxRequests
      const remaining = Math.max(0, this.config.maxRequests - current.count - (isAllowed ? 1 : 0))
      const resetTime = new Date(this.getResetTime(currentWindow))
      const windowStart = new Date(current.windowStart * this.config.windowMs)

      // Only increment if request is allowed
      if (isAllowed) {
        await this.cache.set(
          cacheKey,
          {
            count: current.count + 1,
            windowStart: currentWindow,
          },
          Math.ceil(this.config.windowMs / 1000) // TTL in seconds
        )
      }

      const info: RateLimitInfo = {
        limit: this.config.maxRequests,
        remaining,
        resetTime,
        totalHits: current.count + (isAllowed ? 1 : 0),
        windowStart,
      }

      // Generate headers
      const headers: Record<string, string> = {}

      if (this.config.headers) {
        headers['X-RateLimit-Limit'] = this.config.maxRequests.toString()
        headers['X-RateLimit-Remaining'] = remaining.toString()
        headers['X-RateLimit-Reset'] = Math.ceil(resetTime.getTime() / 1000).toString()
        headers['X-RateLimit-Used'] = info.totalHits.toString()
      }

      if (this.config.standardHeaders) {
        headers['RateLimit-Limit'] = this.config.maxRequests.toString()
        headers['RateLimit-Remaining'] = remaining.toString()
        headers['RateLimit-Reset'] = Math.ceil(resetTime.getTime() / 1000).toString()
      }

      // Trigger callback if limit reached
      if (!isAllowed && this.config.onLimitReached) {
        this.config.onLimitReached(req, identifier)
      }

      return {
        allowed: isAllowed,
        info,
        headers,
      }
    } catch (error) {
      console.error('[RateLimit] Error checking rate limit:', error)

      // Fail open in case of cache errors
      return {
        allowed: true,
        info: {
          limit: this.config.maxRequests,
          remaining: this.config.maxRequests - 1,
          resetTime: new Date(this.getResetTime(currentWindow)),
          totalHits: 1,
          windowStart: new Date(currentWindow * this.config.windowMs),
        },
        headers: {},
      }
    }
  }

  // Create middleware function
  middleware() {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      const result = await this.checkLimit(req)

      // Add headers to response
      const response = result.allowed
        ? NextResponse.next()
        : NextResponse.json(
            {
              error: 'Too Many Requests',
              message: `Rate limit exceeded. Try again in ${Math.ceil((result.info.resetTime.getTime() - Date.now()) / 1000)} seconds.`,
              retryAfter: Math.ceil((result.info.resetTime.getTime() - Date.now()) / 1000),
            },
            {
              status: 429,
              headers: {
                'Retry-After': Math.ceil(
                  (result.info.resetTime.getTime() - Date.now()) / 1000
                ).toString(),
                ...result.headers,
              },
            }
          )

      // Apply headers to response
      Object.entries(result.headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      return result.allowed ? null : response
    }
  }
}

// Predefined rate limiters for different use cases
export const createRateLimiters = () => ({
  // General API rate limiting
  api: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    skipSuccessfulRequests: false,
    onLimitReached: (req, identifier) => {
      console.warn(`[Security] Rate limit exceeded for ${identifier} on ${req.url}`)
    },
  }),

  // Strict rate limiting for authentication endpoints
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // Very restrictive for auth
    skipSuccessfulRequests: false,
    onLimitReached: (req, identifier) => {
      console.warn(`[Security] Auth rate limit exceeded for ${identifier}`)
    },
  }),

  // File upload rate limiting
  upload: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    skipSuccessfulRequests: true,
    onLimitReached: (req, identifier) => {
      console.warn(`[Security] Upload rate limit exceeded for ${identifier}`)
    },
  }),

  // Generous rate limiting for static content
  static: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: true,
  }),

  // Very strict rate limiting for sensitive operations
  sensitive: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    skipSuccessfulRequests: false,
    onLimitReached: (req, identifier) => {
      console.error(`[Security] Sensitive operation rate limit exceeded for ${identifier}`)
      // Could trigger additional security measures here
    },
  }),
})

// Export rate limiting function for use in API routes
export async function rateLimit(
  req: NextRequest,
  limiter: RateLimiter
): Promise<{
  success: boolean
  response?: NextResponse
  info: RateLimitInfo
}> {
  const result = await limiter.checkLimit(req)

  if (!result.allowed) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil((result.info.resetTime.getTime() - Date.now()) / 1000)} seconds.`,
          retryAfter: Math.ceil((result.info.resetTime.getTime() - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (result.info.resetTime.getTime() - Date.now()) / 1000
            ).toString(),
            ...result.headers,
          },
        }
      ),
      info: result.info,
    }
  }

  return {
    success: true,
    info: result.info,
  }
}

// Higher-order function to wrap API handlers with rate limiting
export function withRateLimit(
  rateLimiter: RateLimiter,
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const result = await rateLimit(req, rateLimiter)

    if (!result.success && result.response) {
      return result.response
    }

    // Add rate limit headers to successful responses
    const response = await handler(req, ...args)

    // Add rate limit info to response headers
    const { info } = result
    response.headers.set('X-RateLimit-Limit', info.limit.toString())
    response.headers.set('X-RateLimit-Remaining', info.remaining.toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(info.resetTime.getTime() / 1000).toString())

    return response
  }
}

// Helper for checking if IP is suspicious
export function checkSuspiciousIP(req: NextRequest): {
  suspicious: boolean
  reasons: string[]
} {
  const reasons: string[] = []
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const userAgent = req.headers.get('user-agent') || ''

  // Check for common bot patterns
  if (userAgent.toLowerCase().includes('bot') || userAgent.toLowerCase().includes('crawler')) {
    reasons.push('Bot user agent detected')
  }

  // Check for missing or suspicious user agent
  if (!userAgent || userAgent.length < 10) {
    reasons.push('Missing or suspicious user agent')
  }

  // Check for local/private IP ranges (shouldn't appear in x-forwarded-for in production)
  if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    reasons.push('Private IP address range')
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  }
}

export { RateLimiter }
export default createRateLimiters
