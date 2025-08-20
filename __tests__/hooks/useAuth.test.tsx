/**
 * Test Suite for useAuth Hook
 * Testing authentication state management and API calls
 */

import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'
import { AuthProvider } from '@/contexts/AuthContext'
import { ReactNode } from 'react'

// Mock fetch for API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear localStorage
    localStorage.clear()
  })

  it('should initialize with no user and not loading', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
  })

  describe('login', () => {
    it('should login successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          user: mockUser,
        }),
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: 'Invalid credentials',
        }),
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        try {
          await result.current.login({
            email: 'test@example.com',
            password: 'wrongpassword',
          })
        } catch (error) {
          expect(error.message).toBe('Invalid credentials')
        }
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should set loading state during login', async () => {
      let resolvePromise: (value: any) => void
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(mockPromise)

      const { result } = renderHook(() => useAuth(), { wrapper })

      act(() => {
        result.current.login({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            user: { id: '1', email: 'test@example.com', name: 'Test', role: 'USER' },
          }),
        })
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('register', () => {
    it('should register successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'new@example.com',
        name: 'New User',
        role: 'USER',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          user: mockUser,
        }),
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.register({
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
        })
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
        }),
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should handle registration failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: 'Email already exists',
        }),
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        try {
          await result.current.register({
            name: 'New User',
            email: 'existing@example.com',
            password: 'password123',
          })
        } catch (error) {
          expect(error.message).toBe('Email already exists')
        }
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('logout', () => {
    it('should logout successfully', async () => {
      // First login
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      }

      localStorage.setItem('user', JSON.stringify(mockUser))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(localStorage.getItem('user')).toBeNull()
    })
  })

  describe('persistence', () => {
    it('should restore user from localStorage on initialization', () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      }

      localStorage.setItem('user', JSON.stringify(mockUser))

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should handle invalid localStorage data gracefully', () => {
      localStorage.setItem('user', 'invalid-json')

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('updateUser', () => {
    it('should update user information', async () => {
      const initialUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      }

      const updatedUser = {
        ...initialUser,
        name: 'Updated Name',
      }

      // Set initial user
      localStorage.setItem('user', JSON.stringify(initialUser))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        result.current.updateUser(updatedUser)
      })

      expect(result.current.user).toEqual(updatedUser)
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(updatedUser)
    })
  })
})