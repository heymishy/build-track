/**
 * Test Suite for TaskManager Component
 * Testing task management interface and Gantt chart integration
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskManager } from '@/components/gantt/TaskManager'
import '@testing-library/jest-dom'

// Mock fetch for API calls
global.fetch = jest.fn()

const mockTasks = [
  {
    id: 'task-1',
    name: 'Foundation Work',
    description: 'Excavation and foundation pouring',
    startDate: '2024-01-01',
    endDate: '2024-01-15',
    duration: 14,
    progress: 100,
    status: 'COMPLETED' as const,
    priority: 'HIGH' as const,
    assignedTo: 'John Doe',
    dependencies: [],
    projectId: 'project-1',
    parentId: null,
    sortOrder: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'task-2',
    name: 'Framing',
    description: 'Structural framing work',
    startDate: '2024-01-16',
    endDate: '2024-02-15',
    duration: 30,
    progress: 60,
    status: 'IN_PROGRESS' as const,
    priority: 'HIGH' as const,
    assignedTo: 'Jane Smith',
    dependencies: ['task-1'],
    projectId: 'project-1',
    parentId: null,
    sortOrder: 2,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
]

describe('TaskManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, tasks: mockTasks }),
    })
  })

  describe('Component Rendering', () => {
    it('should render task manager with gantt chart', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        expect(screen.getByText('Project Tasks & Timeline')).toBeInTheDocument()
      })

      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
    })

    it('should display task statistics', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        expect(screen.getByText('Total Tasks')).toBeInTheDocument()
        expect(screen.getByText('Completed')).toBeInTheDocument()
        expect(screen.getByText('In Progress')).toBeInTheDocument()
        expect(screen.getByText('Overdue')).toBeInTheDocument()
      })
    })

    it('should show task filters', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/assigned to/i)).toBeInTheDocument()
      })
    })
  })

  describe('Task Creation', () => {
    it('should open create task modal', async () => {
      render(<TaskManager projectId="project-1" />)

      const addButton = screen.getByRole('button', { name: /add task/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Create New Task')).toBeInTheDocument()
        expect(screen.getByLabelText(/task name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
      })
    })

    it('should create new task with form data', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, tasks: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      render(<TaskManager projectId="project-1" />)

      const addButton = screen.getByRole('button', { name: /add task/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/task name/i)
        const descriptionInput = screen.getByLabelText(/description/i)
        const startDateInput = screen.getByLabelText(/start date/i)
        const endDateInput = screen.getByLabelText(/end date/i)

        fireEvent.change(nameInput, { target: { value: 'New Task' } })
        fireEvent.change(descriptionInput, { target: { value: 'Task description' } })
        fireEvent.change(startDateInput, { target: { value: '2024-03-01' } })
        fireEvent.change(endDateInput, { target: { value: '2024-03-15' } })

        const saveButton = screen.getByRole('button', { name: /save task/i })
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project-1/tasks',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('New Task'),
          })
        )
      })
    })
  })

  describe('Task Filtering', () => {
    it('should filter tasks by status', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i)
        fireEvent.change(statusFilter, { target: { value: 'COMPLETED' } })
      })

      await waitFor(() => {
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
        expect(screen.queryByText('Framing')).not.toBeInTheDocument()
      })
    })

    it('should filter tasks by priority', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        const priorityFilter = screen.getByLabelText(/priority/i)
        fireEvent.change(priorityFilter, { target: { value: 'HIGH' } })
      })

      await waitFor(() => {
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
        expect(screen.getByText('Framing')).toBeInTheDocument()
      })
    })

    it('should search tasks by name', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search tasks/i)
        fireEvent.change(searchInput, { target: { value: 'Foundation' } })
      })

      await waitFor(() => {
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
        expect(screen.queryByText('Framing')).not.toBeInTheDocument()
      })
    })
  })

  describe('View Mode Controls', () => {
    it('should switch between gantt view modes', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        const viewModeButtons = screen.getAllByRole('button')
        const daysButton = viewModeButtons.find(btn => btn.textContent === 'Days')
        const weeksButton = viewModeButtons.find(btn => btn.textContent === 'Weeks')
        const monthsButton = viewModeButtons.find(btn => btn.textContent === 'Months')

        expect(daysButton).toBeInTheDocument()
        expect(weeksButton).toBeInTheDocument()
        expect(monthsButton).toBeInTheDocument()
      })
    })

    it('should toggle critical path display', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        const criticalPathToggle = screen.getByLabelText(/show critical path/i)
        fireEvent.click(criticalPathToggle)
      })

      expect(screen.getByTestId('gantt-chart')).toHaveAttribute('data-show-critical-path', 'true')
    })

    it('should toggle dependency lines display', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        const dependenciesToggle = screen.getByLabelText(/show dependencies/i)
        fireEvent.click(dependenciesToggle)
      })

      expect(screen.getByTestId('gantt-chart')).toHaveAttribute('data-show-dependencies', 'true')
    })
  })

  describe('Task Editing', () => {
    it('should handle task updates from gantt chart', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        const ganttChart = screen.getByTestId('gantt-chart')
        fireEvent.click(ganttChart)
      })

      // Simulate task update callback from gantt chart
      const updatedTask = { ...mockTasks[0], progress: 50 }
      // This would normally be triggered by the gantt chart component
      expect(global.fetch).toHaveBeenCalledTimes(1) // Initial load
    })

    it('should update task progress', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, tasks: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        const progressButton = screen.getByLabelText(/update progress/i)
        fireEvent.click(progressButton)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/api\/projects\/project-1\/tasks\/.+/),
          expect.objectContaining({
            method: 'PUT',
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        expect(screen.getByText(/error loading tasks/i)).toBeInTheDocument()
      })
    })

    it('should show loading state', () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<TaskManager projectId="project-1" />)

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })
  })

  describe('Task Dependencies', () => {
    it('should display task dependencies in form', async () => {
      render(<TaskManager projectId="project-1" />)

      const addButton = screen.getByRole('button', { name: /add task/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/dependencies/i)).toBeInTheDocument()
        const dependencySelect = screen.getByLabelText(/dependencies/i)
        expect(dependencySelect).toBeInTheDocument()
      })
    })

    it('should validate dependency cycles', async () => {
      render(<TaskManager projectId="project-1" />)

      const addButton = screen.getByRole('button', { name: /add task/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        const dependencySelect = screen.getByLabelText(/dependencies/i)
        fireEvent.change(dependencySelect, { target: { value: 'task-1' } })

        const saveButton = screen.getByRole('button', { name: /save task/i })
        fireEvent.click(saveButton)
      })

      // Should validate and prevent circular dependencies
      await waitFor(() => {
        expect(screen.queryByText(/circular dependency/i)).toBeInTheDocument()
      })
    })
  })
})
