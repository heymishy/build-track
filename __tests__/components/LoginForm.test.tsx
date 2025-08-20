/**
 * Test Suite for LoginForm Component
 * Testing user login form functionality and validation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/LoginForm'

// Mock the authentication hook
const mockLogin = jest.fn()

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    login: mockLogin,
    isLoading: false,
    error: null,
  })),
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('LoginForm', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render login form elements', () => {
    render(<LoginForm onSuccess={jest.fn()} />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    render(<LoginForm onSuccess={jest.fn()} />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('should show validation error for invalid email format', async () => {
    render(<LoginForm onSuccess={jest.fn()} />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })
  })

  it('should call login function with correct credentials', async () => {
    const mockOnSuccess = jest.fn()
    mockLogin.mockResolvedValue({ success: true })

    render(<LoginForm onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('should handle login errors gracefully', async () => {
    const mockError = 'Invalid credentials'
    mockLogin.mockRejectedValue(new Error(mockError))

    render(<LoginForm onSuccess={jest.fn()} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('should disable form during submission', async () => {
    // Mock loading state
    const { useAuth } = require('@/hooks/useAuth')
    useAuth.mockReturnValue({
      login: mockLogin,
      isLoading: true,
      error: null,
    })

    render(<LoginForm onSuccess={jest.fn()} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /signing in/i })

    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })

  it('should show forgot password link', () => {
    render(<LoginForm onSuccess={jest.fn()} />)
    
    expect(screen.getByText(/forgot your password/i)).toBeInTheDocument()
  })

  it('should toggle password visibility', async () => {
    render(<LoginForm onSuccess={jest.fn()} />)

    const passwordInput = screen.getByDisplayValue('') // Get the actual input, not label
    const toggleButton = screen.getByRole('button', { name: /show password/i })

    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Click to show password
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')

    // Click to hide password again
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })
})