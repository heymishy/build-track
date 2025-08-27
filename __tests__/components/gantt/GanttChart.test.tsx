/**
 * Test Suite for GanttChart Component
 * Testing task visualization, timeline rendering, and dependency tracking
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GanttChart } from '@/components/gantt/GanttChart'
import '@testing-library/jest-dom'

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
  {
    id: 'task-3',
    name: 'Electrical Installation',
    description: 'Electrical wiring and fixtures',
    startDate: '2024-02-16',
    endDate: '2024-03-15',
    duration: 28,
    progress: 0,
    status: 'PENDING' as const,
    priority: 'MEDIUM' as const,
    assignedTo: 'Bob Wilson',
    dependencies: ['task-2'],
    projectId: 'project-1',
    parentId: null,
    sortOrder: 3,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

const mockOnTaskUpdate = jest.fn()
const mockOnTaskClick = jest.fn()

describe('GanttChart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render gantt chart with tasks', () => {
      render(
        <GanttChart
          tasks={mockTasks}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
        />
      )

      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument()
      expect(screen.getByText('Foundation Work')).toBeInTheDocument()
      expect(screen.getByText('Framing')).toBeInTheDocument()
      expect(screen.getByText('Electrical Installation')).toBeInTheDocument()
    })

    it('should display timeline headers', () => {
      render(
        <GanttChart
          tasks={mockTasks}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
        />
      )

      expect(screen.getByTestId('timeline-header')).toBeInTheDocument()
    })

    it('should show task progress bars', () => {
      render(
        <GanttChart
          tasks={mockTasks}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
        />
      )

      const progressBars = screen.getAllByRole('progressbar')
      expect(progressBars).toHaveLength(mockTasks.length)
    })
  })

  describe('Task Interactions', () => {
    it('should handle task click events', () => {
      render(
        <GanttChart
          tasks={mockTasks}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
        />
      )

      const taskElement = screen.getByText('Foundation Work')
      fireEvent.click(taskElement)

      expect(mockOnTaskClick).toHaveBeenCalledWith(mockTasks[0])
    })

    it('should show task details on hover', async () => {
      render(
        <GanttChart
          tasks={mockTasks}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
        />
      )

      const taskBar = screen.getByTestId('task-bar-task-1')
      fireEvent.mouseEnter(taskBar)

      await waitFor(() => {
        expect(screen.getByTestId('task-tooltip')).toBeInTheDocument()
        expect(screen.getByText('Excavation and foundation pouring')).toBeInTheDocument()
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })
  })

  describe('View Modes', () => {
    it('should support different view modes', () => {
      const { rerender } = render(
        <GanttChart
          tasks={mockTasks}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
          viewMode="days"
        />
      )

      expect(screen.getByTestId('gantt-chart')).toHaveClass('days-view')

      rerender(
        <GanttChart
          tasks={mockTasks}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
          viewMode="months"
        />
      )

      expect(screen.getByTestId('gantt-chart')).toHaveClass('months-view')
    })

    it('should default to weeks view mode', () => {
      render(
        <GanttChart
          tasks={mockTasks}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
        />
      )

      expect(screen.getByTestId('gantt-chart')).toHaveClass('weeks-view')
    })
  })

  describe('Dependencies', () => {
    it('should show dependency lines when enabled', () => {
      render(
        <GanttChart
          tasks={mockTasks}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
          showDependencies={true}
        />
      )

      const dependencyLines = screen.getAllByTestId(/dependency-line/)
      expect(dependencyLines.length).toBeGreaterThan(0)
    })

    it('should highlight critical path when enabled', () => {
      render(
        <GanttChart
          tasks={mockTasks}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
          showCriticalPath={true}
        />
      )

      const criticalTasks = screen.getAllByTestId(/critical-task/)
      expect(criticalTasks.length).toBeGreaterThan(0)
    })
  })

  describe('Task Status Indicators', () => {
    it('should show different colors for task statuses', () => {
      render(
        <GanttChart
          tasks={mockTasks}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
        />
      )

      const completedTask = screen.getByTestId('task-bar-task-1')
      const inProgressTask = screen.getByTestId('task-bar-task-2')
      const pendingTask = screen.getByTestId('task-bar-task-3')

      expect(completedTask).toHaveClass('task-completed')
      expect(inProgressTask).toHaveClass('task-in-progress')
      expect(pendingTask).toHaveClass('task-pending')
    })

    it('should show progress indicators correctly', () => {
      render(
        <GanttChart
          tasks={mockTasks}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
        />
      )

      const progressBars = screen.getAllByRole('progressbar')
      expect(progressBars[0]).toHaveAttribute('aria-valuenow', '100')
      expect(progressBars[1]).toHaveAttribute('aria-valuenow', '60')
      expect(progressBars[2]).toHaveAttribute('aria-valuenow', '0')
    })
  })

  describe('Error Handling', () => {
    it('should handle empty task list gracefully', () => {
      render(
        <GanttChart tasks={[]} onTaskUpdate={mockOnTaskUpdate} onTaskClick={mockOnTaskClick} />
      )

      expect(screen.getByText(/no tasks to display/i)).toBeInTheDocument()
    })

    it('should handle tasks with invalid dates', () => {
      const tasksWithInvalidDates = [
        {
          ...mockTasks[0],
          startDate: 'invalid-date',
          endDate: 'invalid-date',
        },
      ]

      render(
        <GanttChart
          tasks={tasksWithInvalidDates}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
        />
      )

      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument()
      expect(screen.getByText(/invalid date/i)).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <GanttChart
          tasks={mockTasks}
          onTaskUpdate={mockOnTaskUpdate}
          onTaskClick={mockOnTaskClick}
        />
      )

      const ganttContainer = screen.getByTestId('gantt-chart')
      expect(ganttContainer).toHaveClass('mobile-view')
    })
  })
})
