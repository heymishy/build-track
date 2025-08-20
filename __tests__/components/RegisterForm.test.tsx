/**
 * Test Suite for RegisterForm Component
 * Testing user registration form functionality and validation
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from '@/components/auth/RegisterForm'

// Mock the authentication hook
const mockRegister = jest.fn()

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    register: mockRegister,
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

describe('RegisterForm', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render registration form elements', () => {
    render(<RegisterForm onSuccess={jest.fn()} />)

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    render(<RegisterForm onSuccess={jest.fn()} />)

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    render(<RegisterForm onSuccess={jest.fn()} />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })
  })

  it('should validate password strength', async () => {
    render(<RegisterForm onSuccess={jest.fn()} />)

    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(passwordInput, '123') // Too short
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('should validate password confirmation match', async () => {
    render(<RegisterForm onSuccess={jest.fn()} />)

    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'different123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('should call register function with correct data', async () => {
    const mockOnSuccess = jest.fn()
    mockRegister.mockResolvedValue({ success: true })

    render(<RegisterForm onSuccess={mockOnSuccess} />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      })
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('should handle registration errors gracefully', async () => {
    const mockError = 'Email already exists'
    mockRegister.mockRejectedValue(new Error(mockError))

    render(<RegisterForm onSuccess={jest.fn()} />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'existing@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
    })
  })

  it('should disable form during submission', async () => {
    // Mock loading state
    const { useAuth } = require('@/hooks/useAuth')
    const originalMock = useAuth.getMockImplementation()
    
    useAuth.mockImplementation(() => ({
      register: mockRegister,
      isLoading: true,
      error: null,
    }))

    render(<RegisterForm onSuccess={jest.fn()} />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /creating account/i })

    expect(nameInput).toBeDisabled()
    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(confirmPasswordInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
    
    // Restore original mock
    useAuth.mockImplementation(originalMock)
  })

  it('should show password strength indicator', async () => {
    render(<RegisterForm onSuccess={jest.fn()} />)

    const passwordInput = screen.getByLabelText('Password')
    
    // Type weak password
    await user.type(passwordInput, 'weak')
    await waitFor(() => {
      expect(screen.getByText(/weak/i)).toBeInTheDocument()
    })

    // Type strong password
    await user.clear(passwordInput)
    await user.type(passwordInput, 'StrongPassword123!')
    await waitFor(() => {
      expect(screen.getByText(/strong/i)).toBeInTheDocument()
    })
  })

  it('should show terms and conditions checkbox', () => {
    render(<RegisterForm onSuccess={jest.fn()} />)
    
    expect(screen.getByLabelText(/i agree to the terms and conditions/i)).toBeInTheDocument()
  })

  it('should require terms and conditions acceptance', async () => {
    render(<RegisterForm onSuccess={jest.fn()} />)

    const nameInput = screen.getByLabelText(/full name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const termsCheckbox = screen.getByLabelText(/i agree to the terms and conditions/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    // Fill form but don't check terms
    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    // Don't check the terms checkbox
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/you must accept the terms and conditions/i)).toBeInTheDocument()
    })
  })
})