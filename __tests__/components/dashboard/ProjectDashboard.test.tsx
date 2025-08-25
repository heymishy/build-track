/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProjectDashboard } from '@/components/dashboard/ProjectDashboard'

// Mock the API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock child components that might cause import issues
jest.mock('@/components/projects/CreateProjectModal', () => ({
  CreateProjectModal: ({ isOpen, onClose, onProjectCreated }: any) => (
    <div data-testid="create-project-modal" style={{ display: isOpen ? 'block' : 'none' }}>
      <button onClick={onClose}>Close</button>
      <button
        onClick={() => {
          onProjectCreated({
            id: 'new-project',
            name: 'New Project',
            totalBudget: 10000,
            currency: 'NZD',
            status: 'PLANNING',
          })
        }}
      >
        Create
      </button>
    </div>
  ),
}))

jest.mock('@/components/projects/EditProjectModal', () => ({
  EditProjectModal: ({ isOpen, onClose, project, onProjectUpdated }: any) => (
    <div data-testid="edit-project-modal" style={{ display: isOpen ? 'block' : 'none' }}>
      <span>{project?.name}</span>
      <button onClick={onClose}>Close</button>
      <button
        onClick={() => {
          onProjectUpdated({ ...project, name: 'Updated Project' })
        }}
      >
        Update
      </button>
    </div>
  ),
}))

const mockProjects = [
  {
    id: 'project-1',
    name: 'Test Project 1',
    description: 'Test project description',
    status: 'IN_PROGRESS' as const,
    totalBudget: 100000,
    currency: 'NZD',
    startDate: '2024-01-01',
    estimatedEndDate: '2024-12-31',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    stats: {
      totalInvoices: 5,
      totalTrades: 3,
      totalMilestones: 4,
      completedMilestones: 2,
      totalInvoiceAmount: 50000,
      paidInvoiceAmount: 30000,
      pendingInvoiceAmount: 20000,
      totalMilestoneAmount: 80000,
      budgetUsed: 60000,
      budgetRemaining: 40000,
      budgetUsedPercent: 60,
      isOverBudget: false,
    },
  },
  {
    id: 'project-2',
    name: 'Test Project 2',
    status: 'COMPLETED' as const,
    totalBudget: 50000,
    currency: 'NZD',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    stats: {
      totalInvoices: 3,
      totalTrades: 2,
      totalMilestones: 2,
      completedMilestones: 2,
      totalInvoiceAmount: 45000,
      paidInvoiceAmount: 45000,
      pendingInvoiceAmount: 0,
      totalMilestoneAmount: 50000,
      budgetUsed: 45000,
      budgetRemaining: 5000,
      budgetUsedPercent: 90,
      isOverBudget: false,
    },
  },
]

describe('ProjectDashboard Component', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<ProjectDashboard />)

    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders error state when API fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<ProjectDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Error Loading Projects')).toBeInTheDocument()
      expect(screen.getByText('Network error loading projects')).toBeInTheDocument()
    })
  })

  it('renders empty state when no projects exist', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: [] }),
    })

    render(<ProjectDashboard />)

    await waitFor(() => {
      expect(screen.getByText('No Projects Yet')).toBeInTheDocument()
      expect(screen.getByText('Get started by creating your first project.')).toBeInTheDocument()
    })
  })

  it('renders project list when projects are loaded', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: mockProjects }),
    })

    render(<ProjectDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Project Management')).toBeInTheDocument()
      expect(screen.getByText('Projects (2)')).toBeInTheDocument()
      expect(screen.getAllByText('Test Project 1')).toHaveLength(2) // One in list, one in details
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
    })
  })

  it('displays project status badges correctly', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: mockProjects }),
    })

    render(<ProjectDashboard />)

    await waitFor(() => {
      expect(screen.getByText('IN PROGRESS')).toBeInTheDocument()
      expect(screen.getByText('COMPLETED')).toBeInTheDocument()
    })
  })

  it('shows project details when a project is selected', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: mockProjects }),
    })

    render(<ProjectDashboard />)

    await waitFor(() => {
      // First project should be selected by default
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()

      // Check project details are shown
      expect(screen.getByText('Budget Used')).toBeInTheDocument()
      expect(screen.getByText('Milestones')).toBeInTheDocument()
      expect(screen.getByText('Health Score')).toBeInTheDocument()
    })
  })

  it('calculates project health correctly', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: mockProjects }),
    })

    render(<ProjectDashboard />)

    await waitFor(() => {
      // Test Project 1 should have good health (60% budget used, 50% milestones complete)
      expect(screen.getByText('90%')).toBeInTheDocument() // Health score
    })
  })

  it('opens create project modal when new project button is clicked', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: mockProjects }),
    })

    render(<ProjectDashboard />)

    await waitFor(() => {
      const newProjectButton = screen.getByRole('button', { name: /new project/i })
      fireEvent.click(newProjectButton)

      expect(screen.getByTestId('create-project-modal')).toBeVisible()
    })
  })

  it('opens edit modal when edit button is clicked', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: mockProjects }),
    })

    render(<ProjectDashboard />)

    await waitFor(() => {
      const editButton = screen.getByRole('button', { name: /edit/i })
      fireEvent.click(editButton)

      expect(screen.getByTestId('edit-project-modal')).toBeVisible()
    })
  })

  it('selects different project when clicked', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: mockProjects }),
    })

    render(<ProjectDashboard />)

    await waitFor(() => {
      // Find the clickable project item (not the header)
      const projectItems = screen.getAllByText('Test Project 2')
      const clickableItem = projectItems.find(el => el.closest('.cursor-pointer'))

      if (clickableItem) {
        const clickableElement = clickableItem.closest('.cursor-pointer')
        fireEvent.click(clickableElement!)

        // Project details should show Test Project 2
        expect(screen.getAllByText('Test Project 2')).toHaveLength(2) // One in list, one in details
      }
    })
  })

  it('handles project creation', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: [] }),
    })

    render(<ProjectDashboard />)

    await waitFor(() => {
      const createButton = screen.getByRole('button', { name: /create project/i })
      fireEvent.click(createButton)

      const createModalButton = screen.getByRole('button', { name: /create/i })
      fireEvent.click(createModalButton)

      // Modal should close after creation
      expect(screen.getByTestId('create-project-modal')).not.toBeVisible()
    })
  })

  it('retries fetching projects when try again is clicked', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<ProjectDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Error Loading Projects')).toBeInTheDocument()
    })

    // Mock successful retry
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: mockProjects }),
    })

    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(tryAgainButton)

    await waitFor(() => {
      expect(screen.getByText('Project Management')).toBeInTheDocument()
    })
  })

  it('displays budget progress correctly', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: mockProjects }),
    })

    render(<ProjectDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Budget Progress')).toBeInTheDocument()
      expect(screen.getByText(/remaining/)).toBeInTheDocument()
    })
  })

  it('applies correct CSS classes for component styling', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, projects: [] }),
    })

    const customClassName = 'custom-dashboard'
    render(<ProjectDashboard className={customClassName} />)

    await waitFor(() => {
      const cardElement = screen.getByTestId('card')
      expect(cardElement).toHaveClass(customClassName)
    })
  })
})
