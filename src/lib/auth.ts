/**
 * Authentication utilities for user management
 */

import bcrypt from 'bcryptjs'
import { getDatabase } from '@/lib/db-pool'
import { UserRole } from '@prisma/client'

export interface CreateUserData {
  email: string
  password: string
  name: string
  role?: UserRole
}

export interface AuthResult {
  success: boolean
  user?: {
    id: string
    email: string
    name: string
    role: UserRole
    createdAt: Date
    updatedAt: Date
  }
  error?: string
}

// Password validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Validate email format
 */
function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

/**
 * Validate password strength
 */
function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
  }
  return null
}

/**
 * Create a new user
 */
export async function createUser(userData: CreateUserData): Promise<AuthResult> {
  const { email, password, name, role = 'USER' } = userData

  // Validate email format
  if (!validateEmail(email)) {
    return {
      success: false,
      error: 'Invalid email format',
    }
  }

  // Validate password
  const passwordError = validatePassword(password)
  if (passwordError) {
    return {
      success: false,
      error: passwordError,
    }
  }

  try {
    const db = await getDatabase()
    
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return {
        success: false,
        error: 'Email already exists',
      }
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    })

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user
    return {
      success: true,
      user: userWithoutPassword,
    }
  } catch (error) {
    console.error('Error creating user:', error)
    return {
      success: false,
      error: 'Failed to create user',
    }
  }
}

/**
 * Authenticate a user with email and password
 */
export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  try {
    const db = await getDatabase()
    
    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      return {
        success: false,
        error: 'Invalid credentials',
      }
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return {
        success: false,
        error: 'Invalid credentials',
      }
    }

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user
    return {
      success: true,
      user: userWithoutPassword,
    }
  } catch (error) {
    console.error('Error authenticating user:', error)
    return {
      success: false,
      error: 'Authentication failed',
    }
  }
}
