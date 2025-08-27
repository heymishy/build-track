/**
 * Security Middleware and Utilities
 * CSRF protection, input validation, and security hardening
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'

// CSRF Protection
export class CSRFProtection {
  private static readonly SECRET =
    process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production'
  private static readonly TOKEN_LENGTH = 32
  private static readonly HEADER_NAME = 'x-csrf-token'
  private static readonly COOKIE_NAME = 'csrf-token'

  static generateToken(sessionId?: string): string {
    const randomBytes = crypto.randomBytes(CSRFProtection.TOKEN_LENGTH)
    const timestamp = Date.now().toString()
    const data = sessionId ? `${sessionId}:${timestamp}` : timestamp

    const hmac = crypto.createHmac('sha256', CSRFProtection.SECRET)
    hmac.update(data + randomBytes.toString('hex'))

    const token = hmac.digest('hex')
    return `${randomBytes.toString('hex')}.${timestamp}.${token}`
  }

  static verifyToken(token: string, sessionId?: string): boolean {
    if (!token || typeof token !== 'string') {
      return false
    }

    const parts = token.split('.')
    if (parts.length !== 3) {
      return false
    }

    const [randomBytes, timestamp, providedToken] = parts

    // Check token age (valid for 1 hour)
    const tokenAge = Date.now() - parseInt(timestamp)
    if (tokenAge > 3600000) {
      // 1 hour in milliseconds
      return false
    }

    // Verify token
    const data = sessionId ? `${sessionId}:${timestamp}` : timestamp
    const hmac = crypto.createHmac('sha256', CSRFProtection.SECRET)
    hmac.update(data + randomBytes)

    const expectedToken = hmac.digest('hex')

    // Use timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(providedToken, 'hex'),
      Buffer.from(expectedToken, 'hex')
    )
  }

  static middleware() {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      // Skip CSRF for GET, HEAD, OPTIONS
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return null
      }

      // Skip CSRF for API routes that don't need it (like webhooks)
      const url = new URL(req.url)
      if (url.pathname.startsWith('/api/portal/') || url.pathname.includes('/webhook')) {
        return null
      }

      const token =
        req.headers.get(CSRFProtection.HEADER_NAME) ||
        req.cookies.get(CSRFProtection.COOKIE_NAME)?.value

      if (!token || !CSRFProtection.verifyToken(token)) {
        return NextResponse.json(
          {
            error: 'CSRF token validation failed',
            code: 'CSRF_INVALID',
          },
          { status: 403 }
        )
      }

      return null
    }
  }

  static addTokenToResponse(response: NextResponse, sessionId?: string): NextResponse {
    const token = CSRFProtection.generateToken(sessionId)

    response.headers.set(CSRFProtection.HEADER_NAME, token)
    response.cookies.set({
      name: CSRFProtection.COOKIE_NAME,
      value: token,
      httpOnly: false, // Need to be accessible by JavaScript for API calls
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600, // 1 hour
    })

    return response
  }
}

// Input Validation Schemas
export const ValidationSchemas = {
  // User input validation
  email: z.string().email().max(254),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
      message:
        'Password must contain at least one uppercase, one lowercase, one number and one special character',
    }),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z\s'-]+$/, {
      message: 'Name can only contain letters, spaces, hyphens and apostrophes',
    }),

  // Project validation
  projectName: z.string().min(1).max(200).trim(),
  projectDescription: z.string().max(1000).optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'NZD']),
  amount: z.number().positive().max(999999999.99),

  // File validation
  filename: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/, {
      message: 'Filename can only contain letters, numbers, dots, underscores and hyphens',
    }),
  fileSize: z
    .number()
    .positive()
    .max(20 * 1024 * 1024), // 20MB

  // API validation
  id: z.string().cuid(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, {
      message: 'Slug can only contain lowercase letters, numbers and hyphens',
    }),

  // Pagination
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),

  // Common patterns
  url: z.string().url().max(2048),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, {
    message: 'Invalid phone number format',
  }),

  // Business logic validation
  invoiceNumber: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, {
      message: 'Invoice number can only contain letters, numbers, hyphens and underscores',
    }),
  supplierName: z.string().min(1).max(200).trim(),
  tradeType: z.string().min(1).max(100).trim(),
  workDescription: z.string().min(1).max(500).trim(),
}

// Request validation middleware
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (
    req: NextRequest
  ): Promise<{
    success: boolean
    data?: T
    errors?: z.ZodError
    response?: NextResponse
  }> => {
    try {
      let data: any

      if (req.method === 'GET') {
        // Validate query parameters
        const url = new URL(req.url)
        const queryParams: Record<string, any> = {}

        for (const [key, value] of url.searchParams.entries()) {
          queryParams[key] = value
        }

        data = queryParams
      } else {
        // Validate request body
        try {
          data = await req.json()
        } catch (error) {
          return {
            success: false,
            response: NextResponse.json(
              {
                error: 'Invalid JSON in request body',
                code: 'INVALID_JSON',
              },
              { status: 400 }
            ),
          }
        }
      }

      const result = schema.safeParse(data)

      if (!result.success) {
        return {
          success: false,
          errors: result.error,
          response: NextResponse.json(
            {
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: result.error.format(),
            },
            { status: 400 }
          ),
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      console.error('[Security] Validation error:', error)
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Internal validation error',
            code: 'VALIDATION_INTERNAL_ERROR',
          },
          { status: 500 }
        ),
      }
    }
  }
}

// Content Security Policy
export class ContentSecurityPolicy {
  static generate(): string {
    const nonce = crypto.randomBytes(16).toString('base64')

    const directives = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-eval' 'nonce-${nonce}' https://vercel.live`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob: https: *.vercel-storage.com`,
      `connect-src 'self' https: wss: ${process.env.NODE_ENV === 'development' ? 'ws: http:' : ''}`,
      `frame-src 'self' https://vercel.live`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `upgrade-insecure-requests`,
    ]

    if (process.env.CSP_REPORT_URI) {
      directives.push(`report-uri ${process.env.CSP_REPORT_URI}`)
    }

    return directives.join('; ')
  }

  static middleware() {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      const response = NextResponse.next()

      response.headers.set('Content-Security-Policy', ContentSecurityPolicy.generate())

      return response
    }
  }
}

// Security headers middleware
export function securityHeaders() {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const response = NextResponse.next()

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    if (process.env.NODE_ENV === 'production') {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      )
    }

    return response
  }
}

// Sanitize user input
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    .trim()
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .slice(0, 1000) // Limit length
}

// SQL injection protection (additional layer)
export function sanitizeSQLInput(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Remove SQL injection patterns
  return input
    .replace(/[';\\x00\\n\\r\\x1a]/g, '') // Remove dangerous SQL characters
    .replace(/\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi, '') // Remove SQL keywords
    .trim()
    .slice(0, 500)
}

// Check for suspicious patterns in requests
export function detectSuspiciousActivity(req: NextRequest): {
  suspicious: boolean
  reasons: string[]
  severity: 'low' | 'medium' | 'high'
} {
  const reasons: string[] = []
  const url = req.url.toLowerCase()
  const userAgent = req.headers.get('user-agent')?.toLowerCase() || ''
  const body = req.body?.toString().toLowerCase() || ''

  // Check for common attack patterns
  const sqlInjectionPatterns = /(\bunion\b|\bselect\b|\binsert\b|\bdrop\b|\b--\b|\b\/\*)/i
  const xssPatterns = /(<script|javascript:|vbscript:|onload=|onerror=)/i
  const pathTraversalPatterns = /(\.\.\/)|(\.\.\\)/
  const commandInjectionPatterns = /(\b(cat|ls|pwd|whoami|id|uname)\b)/i

  if (sqlInjectionPatterns.test(url) || sqlInjectionPatterns.test(body)) {
    reasons.push('SQL injection attempt detected')
  }

  if (xssPatterns.test(url) || xssPatterns.test(body)) {
    reasons.push('XSS attempt detected')
  }

  if (pathTraversalPatterns.test(url)) {
    reasons.push('Path traversal attempt detected')
  }

  if (commandInjectionPatterns.test(url) || commandInjectionPatterns.test(body)) {
    reasons.push('Command injection attempt detected')
  }

  // Check user agent
  if (!userAgent || userAgent.length < 10) {
    reasons.push('Suspicious or missing user agent')
  }

  // Check for too many special characters
  const specialCharCount = (url.match(/[^a-zA-Z0-9\-._~:\/?#\[\]@!$&'()*+,;=]/g) || []).length
  if (specialCharCount > url.length * 0.3) {
    reasons.push('Too many special characters in URL')
  }

  // Determine severity
  let severity: 'low' | 'medium' | 'high' = 'low'
  if (reasons.some(r => r.includes('injection'))) {
    severity = 'high'
  } else if (reasons.length > 2) {
    severity = 'medium'
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
    severity,
  }
}

// Higher-order function to add security to API routes
export function withSecurity<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>,
  options: {
    validateCSRF?: boolean
    validateInput?: z.ZodSchema<any>
    requireAuth?: boolean
    detectSuspicious?: boolean
  } = {}
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Detect suspicious activity
      if (options.detectSuspicious !== false) {
        const suspiciousCheck = detectSuspiciousActivity(req)
        if (suspiciousCheck.suspicious && suspiciousCheck.severity === 'high') {
          console.error('[Security] High severity suspicious activity detected:', {
            url: req.url,
            method: req.method,
            reasons: suspiciousCheck.reasons,
            userAgent: req.headers.get('user-agent'),
            ip: req.headers.get('x-forwarded-for'),
          })

          return NextResponse.json(
            { error: 'Request blocked for security reasons' },
            { status: 403 }
          )
        }
      }

      // CSRF validation
      if (options.validateCSRF) {
        const csrfResult = await CSRFProtection.middleware()(req)
        if (csrfResult) {
          return csrfResult
        }
      }

      // Input validation
      if (options.validateInput) {
        const validation = await validateRequest(options.validateInput)(req)
        if (!validation.success && validation.response) {
          return validation.response
        }
      }

      // Execute handler
      const response = await handler(req, ...args)

      // Add security headers
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('X-XSS-Protection', '1; mode=block')

      return response
    } catch (error) {
      console.error('[Security] Security middleware error:', error)
      return NextResponse.json({ error: 'Security validation failed' }, { status: 500 })
    }
  }
}
