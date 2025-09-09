/**
 * API Request Validation Schemas and Utilities
 * Centralized validation for security hardening
 */

import { z } from 'zod'
import { NextRequest } from 'next/server'

// Standard API Response Structure
export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  metadata: z
    .object({
      page: z.number().optional(),
      total: z.number().optional(),
      timestamp: z.string().optional(),
    })
    .optional(),
})

export type APIResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    page?: number
    total?: number
    timestamp?: string
  }
}

// User Management Validation Schemas
export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  role: z.enum(['ADMIN', 'USER', 'VIEWER']),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(255, 'Password too long'),
})

export const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  role: z.enum(['ADMIN', 'USER', 'VIEWER']).optional(),
})

// Project Management Validation Schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  totalBudget: z.number().positive('Budget must be positive').max(999999999, 'Budget too large'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('NZD'),
  startDate: z.string().datetime('Invalid start date').optional(),
  endDate: z.string().datetime('Invalid end date').optional(),
})

// Authentication Validation Schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  password: z.string().min(1, 'Password is required').max(255, 'Password too long'),
})

// Request Parameter Validation
export const IDParamSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
})

// Pagination Schema
export const PaginationSchema = z.object({
  page: z.number().positive().max(1000, 'Page number too large').default(1),
  limit: z.number().positive().max(100, 'Limit too large').default(10),
})

/**
 * Validate request body against schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    const validatedData = schema.parse(body)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      return { success: false, error: `Validation error: ${errorMessage}` }
    }
    return { success: false, error: 'Invalid request body format' }
  }
}

/**
 * Validate request parameters
 */
export function validateParams<T>(
  params: any,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(params)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      return { success: false, error: `Parameter validation error: ${errorMessage}` }
    }
    return { success: false, error: 'Invalid request parameters' }
  }
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(
  url: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const searchParams = new URL(url).searchParams
    const queryObject: any = {}

    for (const [key, value] of searchParams.entries()) {
      // Convert numeric strings to numbers
      if (/^\d+$/.test(value)) {
        queryObject[key] = parseInt(value, 10)
      } else if (/^\d*\.\d+$/.test(value)) {
        queryObject[key] = parseFloat(value)
      } else if (value === 'true' || value === 'false') {
        queryObject[key] = value === 'true'
      } else {
        queryObject[key] = value
      }
    }

    const validatedData = schema.parse(queryObject)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      return { success: false, error: `Query validation error: ${errorMessage}` }
    }
    return { success: false, error: 'Invalid query parameters' }
  }
}

/**
 * Create standardized API response
 */
export function createAPIResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  metadata?: { page?: number; total?: number }
): APIResponse<T> {
  return {
    success,
    data,
    error,
    metadata: metadata ? { ...metadata, timestamp: new Date().toISOString() } : undefined,
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(error: string, statusCode: number = 400): Response {
  return new Response(JSON.stringify(createAPIResponse(false, undefined, error)), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  metadata?: { page?: number; total?: number },
  statusCode: number = 200
): Response {
  return new Response(JSON.stringify(createAPIResponse(true, data, undefined, metadata)), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  })
}
