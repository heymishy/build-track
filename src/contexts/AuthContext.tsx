/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */

'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

// User type
export interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'USER' | 'VIEWER'
  createdAt: Date
  updatedAt: Date
}

// Auth context type
interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (user: User) => void
}

// Login credentials
export interface LoginCredentials {
  email: string
  password: string
}

// Registration data
export interface RegisterData {
  name: string
  email: string
  password: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start with loading=true
  const router = useRouter()

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || !window.localStorage) {
        setIsLoading(false)
        return
      }

      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error)
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('user')
      }
    } finally {
      setIsLoading(false) // Set loading to false after attempting to load
    }
  }, [])

  // Save user to localStorage when user changes
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      if (data.success && data.user) {
        setUser(data.user)
        toast.success('Login successful!')
        router.push('/dashboard')
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error(error instanceof Error ? error.message : 'Login failed')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed')
      }

      if (result.success && result.user) {
        setUser(result.user)
        toast.success('Registration successful!')
        router.push('/dashboard')
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error(error instanceof Error ? error.message : 'Registration failed')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Call logout API to clear server-side cookie
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Include cookies in the request
      })

      if (!response.ok) {
        console.error('Logout API failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error calling logout API:', error)
      // Continue with logout even if API call fails
    } finally {
      setUser(null)
      toast.success('Logged out successfully')
      router.push('/')
    }
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
