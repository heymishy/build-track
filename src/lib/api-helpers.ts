/**
 * API Helper Functions
 * Standardized response builders and error handlers
 */

import { NextResponse } from 'next/server'
import {
  ApiResponse,
  ApiError,
  SuccessStatusCode,
  ErrorStatusCode,
  ValidationError,
} from '@/types/api'
import { logger } from './logger'
import { errorReporter } from './error-reporter'

// Success response builders
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: SuccessStatusCode = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(response, { status })
}

export function createCreatedResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return createSuccessResponse(data, message || 'Resource created successfully', 201)
}

export function createNoContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

// Error response builders
export function createErrorResponse(
  message: string,
  status: ErrorStatusCode = 500,
  code?: string,
  details?: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  const response: ApiResponse<never> = {
    success: false,
    error: message,
    code: code || getDefaultErrorCode(status),
    timestamp: new Date().toISOString(),
  }

  // Add details if provided
  if (details) {
    ;(response as any).details = details
  }

  // Log error for debugging
  logger.error(`API Error: ${message}`, {
    component: 'API',
    metadata: { status, code, details },
  })

  return NextResponse.json(response, { status })
}

export function createBadRequestResponse(
  message: string = 'Bad Request',
  details?: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(message, 400, 'BAD_REQUEST', details)
}

export function createUnauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(message, 401, 'UNAUTHORIZED')
}

export function createForbiddenResponse(
  message: string = 'Forbidden'
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(message, 403, 'FORBIDDEN')
}

export function createNotFoundResponse(
  message: string = 'Resource not found'
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(message, 404, 'NOT_FOUND')
}

export function createConflictResponse(
  message: string = 'Conflict',
  details?: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(message, 409, 'CONFLICT', details)
}

export function createValidationErrorResponse(
  errors: ValidationError[],
  message: string = 'Validation failed'
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(message, 422, 'VALIDATION_ERROR', { errors })
}

export function createTooManyRequestsResponse(
  message: string = 'Too many requests'
): NextResponse<ApiResponse<never>> {
  return createErrorResponse(message, 429, 'TOO_MANY_REQUESTS')
}

export function createInternalServerErrorResponse(
  message: string = 'Internal server error',
  error?: Error
): NextResponse<ApiResponse<never>> {
  // Report the error for monitoring
  if (error) {
    errorReporter.reportError({
      error,
      severity: 'high',
      context: {
        component: 'API',
        action: 'error_response_creation',
      },
      tags: ['api-error', 'server-error'],
    })
  }

  return createErrorResponse(message, 500, 'INTERNAL_SERVER_ERROR')
}

// Validation helpers
export function validateRequiredFields<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[]
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const field of requiredFields) {
    const value = data[field]
    if (value === null || value === undefined || value === '') {
      errors.push({
        field: String(field),
        message: `Field '${String(field)}' is required`,
        code: 'REQUIRED_FIELD_MISSING',
        value,
      })
    }
  }

  return errors
}

export function validateEmail(email: string): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!email) {
    return {
      field: 'email',
      message: 'Email is required',
      code: 'REQUIRED_FIELD_MISSING',
      value: email,
    }
  }

  if (!emailRegex.test(email)) {
    return {
      field: 'email',
      message: 'Invalid email format',
      code: 'INVALID_EMAIL_FORMAT',
      value: email,
    }
  }

  return null
}

export function validateStringLength(
  field: string,
  value: string,
  minLength?: number,
  maxLength?: number
): ValidationError | null {
  if (minLength && value.length < minLength) {
    return {
      field,
      message: `Field '${field}' must be at least ${minLength} characters long`,
      code: 'MIN_LENGTH_VIOLATION',
      value,
    }
  }

  if (maxLength && value.length > maxLength) {
    return {
      field,
      message: `Field '${field}' must be no more than ${maxLength} characters long`,
      code: 'MAX_LENGTH_VIOLATION',
      value,
    }
  }

  return null
}

export function validateNumber(
  field: string,
  value: number,
  min?: number,
  max?: number
): ValidationError | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      field,
      message: `Field '${field}' must be a valid number`,
      code: 'INVALID_NUMBER',
      value,
    }
  }

  if (min !== undefined && value < min) {
    return {
      field,
      message: `Field '${field}' must be at least ${min}`,
      code: 'MIN_VALUE_VIOLATION',
      value,
    }
  }

  if (max !== undefined && value > max) {
    return {
      field,
      message: `Field '${field}' must be no more than ${max}`,
      code: 'MAX_VALUE_VIOLATION',
      value,
    }
  }

  return null
}

export function validateDate(field: string, value: string): ValidationError | null {
  const date = new Date(value)

  if (isNaN(date.getTime())) {
    return {
      field,
      message: `Field '${field}' must be a valid date`,
      code: 'INVALID_DATE',
      value,
    }
  }

  return null
}

// Error handling utilities
export async function handleApiError(
  error: unknown,
  context: {
    operation: string
    userId?: string
    requestId?: string
  }
): Promise<NextResponse<ApiResponse<never>>> {
  // Log the error with context
  logger.error(
    `API operation failed: ${context.operation}`,
    {
      userId: context.userId,
      requestId: context.requestId,
      component: 'API',
      metadata: { operation: context.operation },
    },
    error instanceof Error ? error : new Error(String(error))
  )

  // Report critical errors
  if (error instanceof Error) {
    await errorReporter.reportApiError(error, {
      method: 'unknown',
      url: context.operation,
      userId: context.userId,
    })
  }

  // Return appropriate error response
  if (error instanceof Error) {
    if (error.message.includes('validation')) {
      return createBadRequestResponse(error.message)
    }
    if (error.message.includes('unauthorized') || error.message.includes('auth')) {
      return createUnauthorizedResponse(error.message)
    }
    if (error.message.includes('forbidden') || error.message.includes('permission')) {
      return createForbiddenResponse(error.message)
    }
    if (error.message.includes('not found')) {
      return createNotFoundResponse(error.message)
    }
  }

  return createInternalServerErrorResponse('An unexpected error occurred')
}

// Utility functions
export function getDefaultErrorCode(status: ErrorStatusCode): string {
  const codeMap: Record<ErrorStatusCode, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
  }

  return codeMap[status] || 'UNKNOWN_ERROR'
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as any).message)
  }
  return 'An unknown error occurred'
}

// Request parsing helpers
export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request
): Promise<T | null> {
  try {
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return null
    }
    return await request.json()
  } catch (error) {
    logger.warn('Failed to parse JSON body', {
      component: 'API',
      metadata: { error: extractErrorMessage(error) },
    })
    return null
  }
}

export async function parseFormData(request: Request): Promise<FormData | null> {
  try {
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return null
    }
    return await request.formData()
  } catch (error) {
    logger.warn('Failed to parse form data', {
      component: 'API',
      metadata: { error: extractErrorMessage(error) },
    })
    return null
  }
}

export function getSearchParams(request: Request): URLSearchParams {
  const url = new URL(request.url)
  return url.searchParams
}

export function parseIntParam(value: string | null, defaultValue?: number): number | undefined {
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

export function parseBooleanParam(
  value: string | null,
  defaultValue?: boolean
): boolean | undefined {
  if (!value) return defaultValue
  return value.toLowerCase() === 'true' || value === '1'
}

// Response timing helper
export function createTimedResponse<T>(
  response: NextResponse<ApiResponse<T>>,
  startTime: number
): NextResponse<ApiResponse<T>> {
  const duration = Date.now() - startTime
  response.headers.set('X-Response-Time', `${duration}ms`)
  return response
}
