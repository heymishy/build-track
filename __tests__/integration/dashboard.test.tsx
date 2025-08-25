/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import Dashboard from '@/app/dashboard/page'

// Mock the auth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test User', email: 'test@example.com' },
    logout: jest.fn(),
    isAuthenticated: true,
  }),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/dashboard',
    query: {},
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}))

// Mock fetch for API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Dashboard Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('renders dashboard without webpack errors', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: [] }),
    })

    render(<Dashboard />)

    // Check that dashboard header renders
    expect(screen.getByText('BuildTrack Dashboard')).toBeInTheDocument()

    // Check that navigation tabs render
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Invoices')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()

    // Check that user info displays
    expect(screen.getByText('Welcome, Test User')).toBeInTheDocument()
  })

  it('switches between tabs correctly', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: [] }),
    })

    render(<Dashboard />)

    // Default should be Overview
    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()

    // Click Projects tab
    const projectsTab = screen.getByRole('button', { name: /projects/i })
    projectsTab.click()

    // Should show project management (even if no projects)
    await waitFor(() => {
      expect(screen.getByText('No Projects Yet')).toBeInTheDocument()
    })
  })
})
