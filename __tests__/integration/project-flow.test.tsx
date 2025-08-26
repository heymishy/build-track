/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProjectDashboard } from '@/components/dashboard/ProjectDashboard'
import { ProjectsProvider } from '@/contexts/ProjectsContext'
import { AuthProvider } from '@/contexts/AuthContext'
import type { Project } from '@/types'
import { Currency, ProjectStatus } from '@/types'

// Mock Next.js navigation hooks
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

// Mock API calls
const mockCreateProject = jest.fn()
const mockUpdateProject = jest.fn()
const mockDeleteProject = jest.fn()
const mockFetchProjects = jest.fn()

jest.mock('@/services/data-service', () => ({
  dataService: {
    projects: {
      getAll: mockFetchProjects,
      create: mockCreateProject,
      update: mockUpdateProject,
      delete: mockDeleteProject,
      getById: jest.fn(),
    },
  },
}))

// Mock auth context
const mockAuthContext = {
  user: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER' as const,
  },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  error: null,
}

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext,
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <ProjectsProvider>{children}</ProjectsProvider>
  </AuthProvider>
)

describe('Project Management Integration Flow', () => {
  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'Test Project 1',
      totalBudget: 50000,
      currency: Currency.USD,
      status: ProjectStatus.IN_PROGRESS,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      name: 'Test Project 2',
      totalBudget: 75000,
      currency: Currency.USD,
      status: ProjectStatus.PLANNING,
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-11-30'),
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchProjects.mockResolvedValue({
      success: true,
      data: mockProjects,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        hasMore: false,
      },
    })
  })

  describe('Project List Integration', () => {
    it('loads and displays projects from API', async () => {
      render(
        <TestWrapper>
          <ProjectDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockFetchProjects).toHaveBeenCalled()
      })

      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
      expect(screen.getByText('$50,000')).toBeInTheDocument()
      expect(screen.getByText('$75,000')).toBeInTheDocument()
    })

    it('handles API errors gracefully', async () => {
      mockFetchProjects.mockResolvedValue({
        success: false,
        error: 'Failed to fetch projects',
      })

      render(
        <TestWrapper>
          <ProjectDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/failed to load projects/i)).toBeInTheDocument()
      })
    })

    it('shows loading state while fetching', () => {
      mockFetchProjects.mockReturnValue(new Promise(() => {})) // Never resolves

      render(
        <TestWrapper>
          <ProjectDashboard />
        </TestWrapper>
      )

      expect(screen.getByTestId(/loading/i)).toBeInTheDocument()
    })
  })

  describe('Project Creation Flow', () => {
    it('creates new project and updates list', async () => {
      const newProject: Project = {
        id: '3',
        name: 'New Test Project',
        totalBudget: 100000,
        currency: Currency.USD,
        status: ProjectStatus.PLANNING,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-12-31'),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockCreateProject.mockResolvedValue({
        success: true,
        data: newProject,
      })

      render(
        <TestWrapper>
          <ProjectDashboard />
        </TestWrapper>
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      })

      // Open create modal
      const createButton = screen.getByText(/create project/i)
      fireEvent.click(createButton)

      // Fill form
      const nameInput = screen.getByLabelText(/project name/i)
      const budgetInput = screen.getByLabelText(/budget/i)

      fireEvent.change(nameInput, { target: { value: 'New Test Project' } })
      fireEvent.change(budgetInput, { target: { value: '100000' } })

      // Submit form
      const submitButton = screen.getByText(/create/i)
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockCreateProject).toHaveBeenCalledWith({
          name: 'New Test Project',
          totalBudget: 100000,
          currency: Currency.USD,
          status: ProjectStatus.PLANNING,
        })
      })

      // Verify project appears in list
      expect(screen.getByText('New Test Project')).toBeInTheDocument()
    })

    it('handles creation errors with user feedback', async () => {
      mockCreateProject.mockResolvedValue({
        success: false,
        error: 'Project name already exists',
      })

      render(
        <TestWrapper>
          <ProjectDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      })

      const createButton = screen.getByText(/create project/i)
      fireEvent.click(createButton)

      const nameInput = screen.getByLabelText(/project name/i)
      fireEvent.change(nameInput, { target: { value: 'Duplicate Name' } })

      const submitButton = screen.getByText(/create/i)
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/project name already exists/i)).toBeInTheDocument()
      })
    })
  })

  describe('Project Update Flow', () => {
    it('updates project and reflects changes', async () => {
      const updatedProject = {
        ...mockProjects[0],
        name: 'Updated Project Name',
        totalBudget: 60000,
      }

      mockUpdateProject.mockResolvedValue({
        success: true,
        data: updatedProject,
      })

      render(
        <TestWrapper>
          <ProjectDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      })

      // Open edit modal
      const editButton = screen.getAllByText(/edit/i)[0]
      fireEvent.click(editButton)

      // Update fields
      const nameInput = screen.getByDisplayValue('Test Project 1')
      fireEvent.change(nameInput, { target: { value: 'Updated Project Name' } })

      const budgetInput = screen.getByDisplayValue('50000')
      fireEvent.change(budgetInput, { target: { value: '60000' } })

      // Submit changes
      const saveButton = screen.getByText(/save/i)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledWith('1', {
          name: 'Updated Project Name',
          totalBudget: 60000,
        })
      })

      expect(screen.getByText('Updated Project Name')).toBeInTheDocument()
      expect(screen.getByText('$60,000')).toBeInTheDocument()
    })
  })

  describe('Project Deletion Flow', () => {
    it('deletes project with confirmation', async () => {
      mockDeleteProject.mockResolvedValue({
        success: true,
      })

      render(
        <TestWrapper>
          <ProjectDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      })

      // Open delete confirmation
      const deleteButton = screen.getAllByText(/delete/i)[0]
      fireEvent.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByText(/confirm/i)
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockDeleteProject).toHaveBeenCalledWith('1')
      })

      // Verify project is removed from list
      expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument()
    })

    it('cancels deletion when user cancels', async () => {
      render(
        <TestWrapper>
          <ProjectDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      })

      const deleteButton = screen.getAllByText(/delete/i)[0]
      fireEvent.click(deleteButton)

      const cancelButton = screen.getByText(/cancel/i)
      fireEvent.click(cancelButton)

      expect(mockDeleteProject).not.toHaveBeenCalled()
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })
  })

  describe('Project Status Management', () => {
    it('updates project status and shows visual changes', async () => {
      const updatedProject = {
        ...mockProjects[0],
        status: 'COMPLETED' as const,
      }

      mockUpdateProject.mockResolvedValue({
        success: true,
        data: updatedProject,
      })

      render(
        <TestWrapper>
          <ProjectDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      })

      // Change status
      const statusButton = screen.getByText('ACTIVE')
      fireEvent.click(statusButton)

      const completedOption = screen.getByText('COMPLETED')
      fireEvent.click(completedOption)

      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledWith('1', {
          status: 'COMPLETED',
        })
      })

      expect(screen.getByText('COMPLETED')).toBeInTheDocument()
    })
  })

  describe('Search and Filter Integration', () => {
    it('filters projects by search term', async () => {
      render(
        <TestWrapper>
          <ProjectDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument()
        expect(screen.getByText('Test Project 2')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search projects/i)
      fireEvent.change(searchInput, { target: { value: 'Project 1' } })

      await waitFor(() => {
        expect(mockFetchProjects).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Project 1',
          })
        )
      })
    })

    it('filters projects by status', async () => {
      render(
        <TestWrapper>
          <ProjectDashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      })

      const statusFilter = screen.getByLabelText(/filter by status/i)
      fireEvent.change(statusFilter, { target: { value: 'ACTIVE' } })

      await waitFor(() => {
        expect(mockFetchProjects).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ['ACTIVE'],
          })
        )
      })
    })
  })
})
