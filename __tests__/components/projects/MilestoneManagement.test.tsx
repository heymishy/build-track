/**
 * Test Suite for Enhanced Milestone Management Component
 * Testing milestone CRUD operations, progress tracking, and UI interactions
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MilestoneManagement } from '@/components/projects/MilestoneManagement'
import { useAuth } from '@/contexts/AuthContext'
import '@testing-library/jest-dom'

// Mock the authentication context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}))

// Mock fetch for API calls
global.fetch = jest.fn()

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'ADMIN' as const,
}

const mockProject = {
  id: 'project-1',
  name: 'Test Construction Project',
  description: 'A test project',
  status: 'ACTIVE' as const,
  budget: 100000,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ownerId: 'user-1',
}

const mockMilestones = [
  {
    id: 'milestone-1',
    name: 'Foundation Complete',
    description: 'Complete foundation work',
    targetDate: '2024-03-15',
    actualDate: '2024-03-10',
    progress: 100,
    status: 'COMPLETED' as const,
    amount: 25000,
    projectId: 'project-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-03-10T00:00:00Z',
  },
  {
    id: 'milestone-2',
    name: 'Framing Complete',
    description: 'Complete framing work',
    targetDate: '2024-06-15',
    actualDate: null,
    progress: 75,
    status: 'IN_PROGRESS' as const,
    amount: 35000,
    projectId: 'project-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'milestone-3',
    name: 'Final Inspection',
    description: 'Final inspection and approval',
    targetDate: '2024-08-15',
    actualDate: null,
    progress: 0,
    status: 'PENDING' as const,
    amount: 5000,
    projectId: 'project-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

describe('MilestoneManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ milestones: mockMilestones }),
    })
  })

  describe('Component Rendering', () => {
    it('should render milestone management component', async () => {
      render(<MilestoneManagement project={mockProject} />)

      expect(screen.getByText('Project Milestones')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add milestone/i })).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('Foundation Complete')).toBeInTheDocument()
        expect(screen.getByText('Framing Complete')).toBeInTheDocument()
        expect(screen.getByText('Final Inspection')).toBeInTheDocument()
      })
    })

    it('should display milestone progress indicators', async () => {
      render(<MilestoneManagement project={mockProject} />)

      await waitFor(() => {
        // Check for progress indicators
        const progressBars = screen.getAllByRole('progressbar')
        expect(progressBars).toHaveLength(3)
        
        // Check for status badges
        expect(screen.getByText('COMPLETED')).toBeInTheDocument()
        expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument()
        expect(screen.getByText('PENDING')).toBeInTheDocument()
      })
    })

    it('should show overdue indicators for late milestones', async () => {
      const overdueMilestones = [
        {
          ...mockMilestones[1],
          targetDate: '2024-01-15', // Past date
          status: 'IN_PROGRESS' as const,
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ milestones: overdueMilestones }),
      })

      render(<MilestoneManagement project={mockProject} />)

      await waitFor(() => {
        expect(screen.getByText(/overdue/i)).toBeInTheDocument()
      })
    })
  })

  describe('Milestone Creation', () => {
    it('should open create milestone modal when add button clicked', async () => {
      render(<MilestoneManagement project={mockProject} />)

      const addButton = screen.getByRole('button', { name: /add milestone/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Create New Milestone')).toBeInTheDocument()
        expect(screen.getByLabelText(/milestone name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/target date/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
      })
    })

    it('should create new milestone with form data', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ milestones: mockMilestones }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      render(<MilestoneManagement project={mockProject} />)

      const addButton = screen.getByRole('button', { name: /add milestone/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/milestone name/i)
        const descriptionInput = screen.getByLabelText(/description/i)
        const dateInput = screen.getByLabelText(/target date/i)
        const amountInput = screen.getByLabelText(/amount/i)

        fireEvent.change(nameInput, { target: { value: 'New Milestone' } })
        fireEvent.change(descriptionInput, { target: { value: 'Test milestone description' } })
        fireEvent.change(dateInput, { target: { value: '2024-09-15' } })
        fireEvent.change(amountInput, { target: { value: '10000' } })

        const saveButton = screen.getByRole('button', { name: /save milestone/i })
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project-1/milestones',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('New Milestone'),
          })
        )
      })
    })
  })

  describe('Milestone Editing', () => {
    it('should open edit modal when edit button clicked', async () => {
      render(<MilestoneManagement project={mockProject} />)

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText(/edit milestone/i)
        fireEvent.click(editButtons[0])
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Edit Milestone')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Foundation Complete')).toBeInTheDocument()
        expect(screen.getByLabelText(/progress/i)).toBeInTheDocument()
      })
    })

    it('should update milestone progress with slider', async () => {
      render(<MilestoneManagement project={mockProject} />)

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText(/edit milestone/i)
        fireEvent.click(editButtons[1]) // Edit in-progress milestone
      })

      await waitFor(() => {
        const progressSlider = screen.getByLabelText(/progress/i)
        fireEvent.change(progressSlider, { target: { value: '90' } })
        expect(progressSlider).toHaveValue('90')
      })
    })

    it('should save milestone changes', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ milestones: mockMilestones }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      render(<MilestoneManagement project={mockProject} />)

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText(/edit milestone/i)
        fireEvent.click(editButtons[0])
      })

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Foundation Complete')
        fireEvent.change(nameInput, { target: { value: 'Updated Foundation' } })

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project-1/milestones/milestone-1',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('Updated Foundation'),
          })
        )
      })
    })
  })

  describe('Milestone Status Management', () => {
    it('should mark milestone as completed', async () => {
      render(<MilestoneManagement project={mockProject} />)

      await waitFor(() => {
        const completeButtons = screen.getAllByLabelText(/mark.*complete/i)
        fireEvent.click(completeButtons[1]) // Complete in-progress milestone
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project-1/milestones/milestone-2',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"progress":100'),
          })
        )
      })
    })

    it('should handle milestone deletion with confirmation', async () => {
      // Mock window.confirm
      Object.defineProperty(window, 'confirm', {
        value: jest.fn(() => true),
        writable: true,
      })

      render(<MilestoneManagement project={mockProject} />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText(/delete milestone/i)
        fireEvent.click(deleteButtons[0])
      })

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this milestone? This action cannot be undone.'
      )

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project-1/milestones/milestone-1',
          expect.objectContaining({
            method: 'DELETE',
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<MilestoneManagement project={mockProject} />)

      await waitFor(() => {
        expect(screen.getByText(/error loading milestones/i)).toBeInTheDocument()
      })
    })

    it('should validate form inputs', async () => {
      render(<MilestoneManagement project={mockProject} />)

      const addButton = screen.getByRole('button', { name: /add milestone/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save milestone/i })
        fireEvent.click(saveButton) // Try to save without filling required fields
      })

      await waitFor(() => {
        expect(screen.getByText(/milestone name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/target date is required/i)).toBeInTheDocument()
        expect(screen.getByText(/amount must be greater than 0/i)).toBeInTheDocument()
      })
    })
  })
})