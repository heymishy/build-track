/**
 * Role-based access control middleware
 * Handles user permissions and project-level access control
 */

import { UserRole, ProjectRole } from '@prisma/client'
import { NextRequest } from 'next/server'

// Define available resources and actions
export type Resource =
  | 'users'
  | 'projects'
  | 'invoices'
  | 'estimates'
  | 'milestones'
  | 'settings'
  | 'suppliers'
export type Action = 'create' | 'read' | 'update' | 'delete' | 'write'

// User with role information
export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

// Project user association
export interface ProjectUser {
  userId: string
  projectId: string
  role: ProjectRole
  user: { id: string; role: UserRole }
}

// Middleware options
export interface MiddlewareOptions {
  resource: Resource
  action: Action
  requireAuth: boolean
  projectId?: string
}

// Middleware result
export interface MiddlewareResult {
  allowed: boolean
  reason?: string
  user?: AuthUser
}

/**
 * Permission matrix defining what each role can do with each resource
 */
const PERMISSION_MATRIX: Record<UserRole, Record<Resource, Action[]>> = {
  ADMIN: {
    users: ['create', 'read', 'update', 'delete', 'write'],
    projects: ['create', 'read', 'update', 'delete', 'write'],
    invoices: ['create', 'read', 'update', 'delete', 'write'],
    estimates: ['create', 'read', 'update', 'delete', 'write'],
    milestones: ['create', 'read', 'update', 'delete', 'write'],
    settings: ['create', 'read', 'update', 'delete', 'write'],
    suppliers: ['create', 'read', 'update', 'delete', 'write'],
  },
  USER: {
    users: ['read'], // Can only read their own user info
    projects: ['create', 'read', 'update'], // Cannot delete projects
    invoices: ['create', 'read', 'update', 'write'],
    estimates: ['create', 'read', 'update', 'write'],
    milestones: ['read', 'update'],
    settings: ['create', 'read', 'update'], // Users can manage their own settings
    suppliers: [], // Only admins can manage suppliers
  },
  VIEWER: {
    users: [],
    projects: ['read'],
    invoices: ['read'],
    estimates: ['read'],
    milestones: ['read'],
    settings: ['read'], // Viewers can only read settings
    suppliers: [], // Only admins can manage suppliers
  },
}

/**
 * Check if a user role has permission for a specific resource and action
 */
export function checkPermission(userRole: UserRole, resource: Resource, action: Action): boolean {
  const allowedActions = PERMISSION_MATRIX[userRole][resource]
  return allowedActions.includes(action) || allowedActions.includes('write')
}

/**
 * Check if a user has access to a specific project
 */
export function hasProjectAccess(
  userId: string,
  userRole: UserRole,
  projectUsers: ProjectUser[],
  action: Action
): boolean {
  // Admins have access to all projects
  if (userRole === 'ADMIN') {
    return true
  }

  // Find user's role in this project
  const projectUser = projectUsers.find(pu => pu.userId === userId)
  if (!projectUser) {
    return false
  }

  // Check project-level permissions
  const { role: projectRole } = projectUser

  switch (projectRole) {
    case 'OWNER':
      return true // Owners can do everything
    case 'CONTRACTOR':
      return ['create', 'read', 'update', 'write'].includes(action) // Cannot delete
    case 'VIEWER':
      return action === 'read' // Read-only access
    default:
      return false
  }
}

/**
 * Create authentication middleware for route protection
 */
export function createAuthMiddleware(options: MiddlewareOptions) {
  return async function middleware(
    request: NextRequest,
    user: AuthUser | null
  ): Promise<MiddlewareResult> {
    const { resource, action, requireAuth } = options

    // Allow public access if authentication is not required
    if (!requireAuth) {
      return { allowed: true }
    }

    // Require authentication
    if (!user) {
      return {
        allowed: false,
        reason: 'Authentication required',
      }
    }

    // Check user permissions for the resource
    const hasPermission = checkPermission(user.role, resource, action)

    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'Insufficient permissions',
      }
    }

    return {
      allowed: true,
      user,
    }
  }
}

/**
 * Extract user from JWT token in request cookies
 */
export function getUserFromRequest(request: NextRequest): AuthUser | null {
  try {
    // Try to get token from cookie first
    const cookieToken = request.cookies.get('auth-token')?.value

    // Fallback to Authorization header
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    const token = cookieToken || bearerToken

    // Debug logging only in development mode
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH === 'true') {
      console.log('[AUTH DEBUG]', {
        hasCookieToken: !!cookieToken,
        hasBearerToken: !!bearerToken,
        hasToken: !!token,
        cookieNames: request.cookies.getAll().map(cookie => cookie.name),
        url: request.url,
        userAgent: request.headers.get('user-agent')?.substring(0, 50),
      })
    }

    if (!token) {
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('[AUTH DEBUG] No token found in request')
      }
      return null
    }

    // Decode and verify JWT token
    const jwt = require('jsonwebtoken')
    const JWT_SECRET = process.env.JWT_SECRET

    if (!JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set')
      // Only provide fallback in development
      if (process.env.NODE_ENV !== 'development') {
        return null
      }
    }

    const secret = JWT_SECRET || 'fallback-secret-for-development-only'

    const decoded = jwt.verify(token, secret) as {
      userId: string
      email: string
      role: UserRole
      iat: number
      exp: number
    }

    const user = {
      id: decoded.userId,
      email: decoded.email,
      name: '', // We don't store name in the token, but it's not needed for authorization
      role: decoded.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Debug logging only in development mode
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH === 'true') {
      console.log('[AUTH DEBUG] Successfully authenticated user:', {
        id: user.id,
        email: user.email,
        role: user.role,
      })
    }
    return user
  } catch (error) {
    console.error('Error verifying JWT token:', error)
    return null
  }
}

/**
 * Higher-order function to protect API routes
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthUser, context?: any) => Promise<Response>,
  options: MiddlewareOptions
) {
  return async function protectedHandler(request: NextRequest, context?: any): Promise<Response> {
    const user = getUserFromRequest(request)
    const middleware = createAuthMiddleware(options)
    const result = await middleware(request, user)

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.reason || 'Access denied',
        }),
        {
          status: result.reason === 'Authentication required' ? 401 : 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return handler(request, result.user!, context)
  }
}
