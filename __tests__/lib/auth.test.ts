/**
 * Test Suite for Authentication Utilities
 * Testing password hashing, user creation, and authentication logic
 */

// Mock Prisma first
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}))

import { hashPassword, verifyPassword, createUser, authenticateUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Type assertion for mocked Prisma client
const mockedPrisma = {
  user: {
    create: prisma.user.create as jest.MockedFunction<any>,
    findUnique: prisma.user.findUnique as jest.MockedFunction<any>,
    findFirst: prisma.user.findFirst as jest.MockedFunction<any>,
  },
}

describe('Auth Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testpassword123'
      const hashed = await hashPassword(password)

      expect(hashed).toBeDefined()
      expect(hashed).not.toBe(password)
      expect(hashed.length).toBeGreaterThan(50) // bcrypt hashes are typically 60+ chars
    })

    it('should generate different hashes for the same password', async () => {
      const password = 'testpassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testpassword123'
      const hashed = await hashPassword(password)

      const isValid = await verifyPassword(password, hashed)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'testpassword123'
      const wrongPassword = 'wrongpassword'
      const hashed = await hashPassword(password)

      const isValid = await verifyPassword(wrongPassword, hashed)
      expect(isValid).toBe(false)
    })
  })

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User',
        role: 'USER' as const,
      }

      const mockUser = {
        id: 'user-123',
        ...userData,
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockedPrisma.user.findUnique.mockResolvedValue(null) // Email doesn't exist
      mockedPrisma.user.create.mockResolvedValue(mockUser)

      const result = await createUser(userData)

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email },
      })

      expect(mockedPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: userData.email,
          name: userData.name,
          role: userData.role,
          password: expect.any(String),
        }),
      })

      expect(result).toEqual({
        success: true,
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        }),
      })

      // Password should not be in returned user object
      expect(result.user).not.toHaveProperty('password')
    })

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'testpassword123',
        name: 'Test User',
        role: 'USER' as const,
      }

      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: userData.email,
        password: 'hashed',
        name: 'Existing User',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await createUser(userData)

      expect(result).toEqual({
        success: false,
        error: 'Email already exists',
      })

      expect(mockedPrisma.user.create).not.toHaveBeenCalled()
    })

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'testpassword123',
        name: 'Test User',
        role: 'USER' as const,
      }

      const result = await createUser(userData)

      expect(result).toEqual({
        success: false,
        error: 'Invalid email format',
      })

      expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled()
      expect(mockedPrisma.user.create).not.toHaveBeenCalled()
    })

    it('should validate password strength', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123', // Too short
        name: 'Test User',
        role: 'USER' as const,
      }

      const result = await createUser(userData)

      expect(result).toEqual({
        success: false,
        error: 'Password must be at least 8 characters long',
      })

      expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled()
      expect(mockedPrisma.user.create).not.toHaveBeenCalled()
    })
  })

  describe('authenticateUser', () => {
    it('should authenticate valid credentials', async () => {
      const email = 'test@example.com'
      const password = 'testpassword123'
      const hashedPassword = await hashPassword(password)

      const mockUser = {
        id: 'user-123',
        email,
        password: hashedPassword,
        name: 'Test User',
        role: 'USER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await authenticateUser(email, password)

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      })

      expect(result).toEqual({
        success: true,
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        }),
      })

      // Password should not be in returned user object
      expect(result.user).not.toHaveProperty('password')
    })

    it('should reject invalid email', async () => {
      const email = 'nonexistent@example.com'
      const password = 'testpassword123'

      mockedPrisma.user.findUnique.mockResolvedValue(null)

      const result = await authenticateUser(email, password)

      expect(result).toEqual({
        success: false,
        error: 'Invalid credentials',
      })
    })

    it('should reject invalid password', async () => {
      const email = 'test@example.com'
      const password = 'wrongpassword'
      const correctPassword = 'correctpassword'
      const hashedPassword = await hashPassword(correctPassword)

      const mockUser = {
        id: 'user-123',
        email,
        password: hashedPassword,
        name: 'Test User',
        role: 'USER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await authenticateUser(email, password)

      expect(result).toEqual({
        success: false,
        error: 'Invalid credentials',
      })
    })
  })
})
