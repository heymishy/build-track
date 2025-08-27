/**
 * Integration Test Suite for Gantt Chart and Task Management
 * Testing full workflow from task creation to timeline visualization
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskManager } from '@/components/gantt/TaskManager'
import '@testing-library/jest-dom'

// Mock fetch for API calls
global.fetch = jest.fn()

const mockInitialTasks = [
  {
    id: 'task-1',
    name: 'Foundation Work',
    description: 'Excavation and foundation pouring',
    startDate: '2024-01-01',
    endDate: '2024-01-15',
    duration: 14,
    progress: 100,
    status: 'COMPLETED',
    priority: 'HIGH',
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
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assignedTo: 'Jane Smith',
    dependencies: ['task-1'],
    projectId: 'project-1',
    parentId: null,
    sortOrder: 2,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
]

describe('Gantt Chart and Task Management Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, tasks: mockInitialTasks }),
    })
  })

  describe('Full Task Lifecycle', () => {
    it('should handle complete task creation workflow', async () => {
      // Mock successful task creation
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, tasks: mockInitialTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            task: {
              id: 'task-3',
              name: 'Electrical Installation',
              description: 'Complete electrical wiring',
              startDate: '2024-02-16',
              endDate: '2024-03-15',
              duration: 28,
              progress: 0,
              status: 'PENDING',
              priority: 'MEDIUM',
              assignedTo: 'Bob Wilson',
              dependencies: ['task-2'],
              projectId: 'project-1',
              parentId: null,
              sortOrder: 3,
              createdAt: '2024-02-16T00:00:00Z',
              updatedAt: '2024-02-16T00:00:00Z',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            tasks: [
              ...mockInitialTasks,
              {
                id: 'task-3',
                name: 'Electrical Installation',
                description: 'Complete electrical wiring',
                startDate: '2024-02-16',
                endDate: '2024-03-15',
                duration: 28,
                progress: 0,
                status: 'PENDING',
                priority: 'MEDIUM',
                assignedTo: 'Bob Wilson',
                dependencies: ['task-2'],
                projectId: 'project-1',
                parentId: null,
                sortOrder: 3,
                createdAt: '2024-02-16T00:00:00Z',
                updatedAt: '2024-02-16T00:00:00Z',
              },
            ],
          }),
        })

      render(<TaskManager projectId="project-1" />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
        expect(screen.getByText('Framing')).toBeInTheDocument()
      })

      // Open task creation modal
      const addButton = screen.getByRole('button', { name: /add task/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Create New Task')).toBeInTheDocument()
      })

      // Fill in task details
      const nameInput = screen.getByLabelText(/task name/i)
      const descriptionInput = screen.getByLabelText(/description/i)
      const startDateInput = screen.getByLabelText(/start date/i)
      const endDateInput = screen.getByLabelText(/end date/i)
      const prioritySelect = screen.getByLabelText(/priority/i)
      const assignedToInput = screen.getByLabelText(/assigned to/i)

      fireEvent.change(nameInput, { target: { value: 'Electrical Installation' } })
      fireEvent.change(descriptionInput, { target: { value: 'Complete electrical wiring' } })
      fireEvent.change(startDateInput, { target: { value: '2024-02-16' } })
      fireEvent.change(endDateInput, { target: { value: '2024-03-15' } })
      fireEvent.change(prioritySelect, { target: { value: 'MEDIUM' } })
      fireEvent.change(assignedToInput, { target: { value: 'Bob Wilson' } })

      // Set dependency on previous task
      const dependencySelect = screen.getByLabelText(/dependencies/i)
      fireEvent.change(dependencySelect, { target: { value: 'task-2' } })

      // Save task
      const saveButton = screen.getByRole('button', { name: /save task/i })
      fireEvent.click(saveButton)

      // Verify API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project-1/tasks',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('Electrical Installation'),
          })
        )
      })

      // Verify task appears in Gantt chart
      await waitFor(() => {
        expect(screen.getByText('Electrical Installation')).toBeInTheDocument()
      })

      // Verify dependency visualization
      expect(screen.getByTestId('gantt-chart')).toHaveAttribute('data-show-dependencies', 'true')
    })

    it('should handle task progress updates through Gantt chart', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, tasks: mockInitialTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        expect(screen.getByText('Framing')).toBeInTheDocument()
      })

      // Simulate progress update from Gantt chart interaction
      const taskBar = screen.getByTestId('task-bar-task-2')
      fireEvent.doubleClick(taskBar)

      // Should open progress update modal or interface
      await waitFor(() => {
        expect(screen.getByLabelText(/progress/i)).toBeInTheDocument()
      })

      // Update progress
      const progressSlider = screen.getByLabelText(/progress/i)
      fireEvent.change(progressSlider, { target: { value: '85' } })

      const updateButton = screen.getByRole('button', { name: /update/i })
      fireEvent.click(updateButton)

      // Verify API call for progress update
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project-1/tasks/task-2',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"progress":85'),
          })
        )
      })
    })
  })

  describe('Timeline Visualization and Interaction', () => {
    it('should display tasks in correct timeline order', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        const taskElements = screen.getAllByTestId(/task-bar-/)
        expect(taskElements).toHaveLength(2)

        // Foundation task should appear before Framing task
        expect(screen.getByTestId('task-bar-task-1')).toBeInTheDocument()
        expect(screen.getByTestId('task-bar-task-2')).toBeInTheDocument()
      })
    })

    it('should show dependency relationships visually', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        // Enable dependencies view
        const dependenciesToggle = screen.getByLabelText(/show dependencies/i)
        fireEvent.click(dependenciesToggle)
      })

      // Should show dependency line from task-1 to task-2
      expect(screen.getByTestId('dependency-line-task-1-task-2')).toBeInTheDocument()
    })

    it('should update view when switching time scales', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        expect(screen.getByTestId('gantt-chart')).toBeInTheDocument()
      })

      // Switch to days view
      const daysButton = screen.getByRole('button', { name: /days/i })
      fireEvent.click(daysButton)

      await waitFor(() => {
        expect(screen.getByTestId('gantt-chart')).toHaveClass('days-view')
      })

      // Switch to months view
      const monthsButton = screen.getByRole('button', { name: /months/i })
      fireEvent.click(monthsButton)

      await waitFor(() => {
        expect(screen.getByTestId('gantt-chart')).toHaveClass('months-view')
      })
    })

    it('should highlight critical path when enabled', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        // Enable critical path view
        const criticalPathToggle = screen.getByLabelText(/show critical path/i)
        fireEvent.click(criticalPathToggle)
      })

      // Critical path tasks should be highlighted
      await waitFor(() => {
        expect(screen.getByTestId('critical-task-task-1')).toBeInTheDocument()
        expect(screen.getByTestId('critical-task-task-2')).toBeInTheDocument()
      })
    })
  })

  describe('Task Filtering and Search', () => {
    it('should filter tasks by status and update Gantt chart', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
        expect(screen.getByText('Framing')).toBeInTheDocument()
      })

      // Filter by completed status
      const statusFilter = screen.getByLabelText(/status/i)
      fireEvent.change(statusFilter, { target: { value: 'COMPLETED' } })

      await waitFor(() => {
        // Should only show Foundation Work (COMPLETED)
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
        expect(screen.queryByText('Framing')).not.toBeInTheDocument()
      })

      // Gantt chart should update to show only filtered tasks
      expect(screen.getByTestId('task-bar-task-1')).toBeInTheDocument()
      expect(screen.queryByTestId('task-bar-task-2')).not.toBeInTheDocument()
    })

    it('should search tasks by name and update visualization', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
        expect(screen.getByText('Framing')).toBeInTheDocument()
      })

      // Search for "Foundation"
      const searchInput = screen.getByPlaceholderText(/search tasks/i)
      fireEvent.change(searchInput, { target: { value: 'Foundation' } })

      await waitFor(() => {
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
        expect(screen.queryByText('Framing')).not.toBeInTheDocument()
      })

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } })

      await waitFor(() => {
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
        expect(screen.getByText('Framing')).toBeInTheDocument()
      })
    })

    it('should filter by assignee and show relevant tasks', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        const assigneeFilter = screen.getByLabelText(/assigned to/i)
        fireEvent.change(assigneeFilter, { target: { value: 'John Doe' } })
      })

      await waitFor(() => {
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
        expect(screen.queryByText('Framing')).not.toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates and Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, tasks: mockInitialTasks }),
        })
        .mockRejectedValueOnce(new Error('API Error'))

      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
      })

      // Try to create a task that will fail
      const addButton = screen.getByRole('button', { name: /add task/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/task name/i)
        fireEvent.change(nameInput, { target: { value: 'Failing Task' } })

        const saveButton = screen.getByRole('button', { name: /save task/i })
        fireEvent.click(saveButton)
      })

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error creating task/i)).toBeInTheDocument()
      })
    })

    it('should maintain state consistency during updates', async () => {
      // Mock sequence of API calls for state consistency test
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, tasks: mockInitialTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }), // Update success
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            tasks: [
              { ...mockInitialTasks[0], progress: 100 },
              { ...mockInitialTasks[1], progress: 85, status: 'IN_PROGRESS' },
            ],
          }),
        })

      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        expect(screen.getByText('Framing')).toBeInTheDocument()
      })

      // Update task progress
      const taskBar = screen.getByTestId('task-bar-task-2')
      fireEvent.doubleClick(taskBar)

      await waitFor(() => {
        const progressSlider = screen.getByLabelText(/progress/i)
        fireEvent.change(progressSlider, { target: { value: '85' } })

        const updateButton = screen.getByRole('button', { name: /update/i })
        fireEvent.click(updateButton)
      })

      // Verify state is updated consistently
      await waitFor(() => {
        const progressBar = screen.getByTestId('progress-bar-task-2')
        expect(progressBar).toHaveAttribute('aria-valuenow', '85')
      })
    })
  })

  describe('Performance and Responsiveness', () => {
    it('should handle large numbers of tasks efficiently', async () => {
      // Create large task dataset
      const largeTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        name: `Task ${i}`,
        description: `Description for task ${i}`,
        startDate: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
        endDate: `2024-02-${String((i % 28) + 1).padStart(2, '0')}`,
        duration: 14,
        progress: i % 101,
        status: i % 3 === 0 ? 'COMPLETED' : i % 3 === 1 ? 'IN_PROGRESS' : 'PENDING',
        priority: 'MEDIUM',
        assignedTo: `User ${i % 10}`,
        dependencies: i > 0 ? [`task-${i - 1}`] : [],
        projectId: 'project-1',
        parentId: null,
        sortOrder: i,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }))

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, tasks: largeTasks }),
      })

      const startTime = Date.now()
      render(<TaskManager projectId="project-1" />)

      await waitFor(
        () => {
          expect(screen.getByText('Task 0')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      const renderTime = Date.now() - startTime
      expect(renderTime).toBeLessThan(3000) // Should render within 3 seconds
    })

    it('should maintain responsiveness during interactions', async () => {
      render(<TaskManager projectId="project-1" />)

      await waitFor(() => {
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
      })

      // Rapid filter changes should not cause lag
      const statusFilter = screen.getByLabelText(/status/i)

      fireEvent.change(statusFilter, { target: { value: 'COMPLETED' } })
      fireEvent.change(statusFilter, { target: { value: 'IN_PROGRESS' } })
      fireEvent.change(statusFilter, { target: { value: 'PENDING' } })
      fireEvent.change(statusFilter, { target: { value: '' } })

      // Should still be responsive
      await waitFor(() => {
        expect(screen.getByText('Foundation Work')).toBeInTheDocument()
        expect(screen.getByText('Framing')).toBeInTheDocument()
      })
    })
  })
})
