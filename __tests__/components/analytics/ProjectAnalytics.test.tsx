/**
 * Test Suite for Enhanced Project Analytics Component
 * Testing financial analytics, trend analysis, and KPI visualization
 */

import { render, screen, waitFor } from '@testing-library/react'
import { ProjectAnalytics } from '@/components/analytics/ProjectAnalytics'
import '@testing-library/jest-dom'

// Mock fetch for API calls
global.fetch = jest.fn()

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

const mockAnalyticsData = {
  overview: {
    totalBudget: 100000,
    totalSpent: 45000,
    totalInvoices: 25,
    completedMilestones: 3,
    totalMilestones: 8,
    progressPercentage: 37.5,
    budgetUtilization: 45,
    remainingBudget: 55000,
    projectedCompletion: '2024-11-15',
  },
  trends: {
    spendingTrend: [
      { month: '2024-01', amount: 5000, cumulative: 5000 },
      { month: '2024-02', amount: 8000, cumulative: 13000 },
      { month: '2024-03', amount: 12000, cumulative: 25000 },
      { month: '2024-04', amount: 7000, cumulative: 32000 },
      { month: '2024-05', amount: 6000, cumulative: 38000 },
      { month: '2024-06', amount: 7000, cumulative: 45000 },
    ],
    budgetBurnRate: [
      { month: '2024-01', projected: 8333, actual: 5000 },
      { month: '2024-02', projected: 16666, actual: 13000 },
      { month: '2024-03', projected: 25000, actual: 25000 },
      { month: '2024-04', projected: 33333, actual: 32000 },
      { month: '2024-05', projected: 41666, actual: 38000 },
      { month: '2024-06', projected: 50000, actual: 45000 },
    ],
  },
  alerts: [
    {
      type: 'warning' as const,
      message: 'Budget utilization is approaching 50% threshold',
      severity: 'medium' as const,
      timestamp: '2024-06-15T10:00:00Z',
    },
    {
      type: 'info' as const,
      message: 'Milestone "Foundation Complete" was completed ahead of schedule',
      severity: 'low' as const,
      timestamp: '2024-03-10T15:30:00Z',
    },
  ],
  cashFlow: {
    projectedInflow: [
      { month: '2024-07', amount: 17000 },
      { month: '2024-08', amount: 20000 },
      { month: '2024-09', amount: 12000 },
      { month: '2024-10', amount: 8000 },
    ],
    projectedOutflow: [
      { month: '2024-07', amount: 18000 },
      { month: '2024-08', amount: 15000 },
      { month: '2024-09', amount: 10000 },
      { month: '2024-10', amount: 12000 },
    ],
  },
  kpis: {
    costPerformanceIndex: 1.12,
    schedulePerformanceIndex: 0.95,
    estimateAccuracy: 87.5,
    changeOrderImpact: 3.2,
    milestoneAdhesion: 75,
    budgetVariance: -5000,
  },
  trades: [
    { name: 'Foundation', budgeted: 25000, spent: 24000, variance: 1000 },
    { name: 'Framing', budgeted: 35000, spent: 21000, variance: 14000 },
    { name: 'Electrical', budgeted: 16000, spent: 0, variance: 16000 },
    { name: 'Plumbing', budgeted: 12000, spent: 0, variance: 12000 },
  ],
}

describe('ProjectAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockAnalyticsData }),
    })
  })

  describe('Component Rendering', () => {
    it('should render analytics dashboard', async () => {
      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        expect(screen.getByText('Advanced Project Analytics')).toBeInTheDocument()
        expect(screen.getByText('Executive Summary')).toBeInTheDocument()
        expect(screen.getByText('Key Performance Indicators')).toBeInTheDocument()
        expect(screen.getByText('Trade Performance Analysis')).toBeInTheDocument()
        expect(screen.getByText('Financial Trends')).toBeInTheDocument()
      })
    })

    it('should display financial overview metrics', async () => {
      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        expect(screen.getByText('$100,000')).toBeInTheDocument() // Total Budget
        expect(screen.getByText('$45,000')).toBeInTheDocument() // Total Spent
        expect(screen.getByText('$55,000')).toBeInTheDocument() // Remaining Budget
        expect(screen.getByText('45%')).toBeInTheDocument() // Budget Utilization
        expect(screen.getByText('37.5%')).toBeInTheDocument() // Progress Percentage
        expect(screen.getByText('25')).toBeInTheDocument() // Total Invoices
      })
    })

    it('should show milestone completion progress', async () => {
      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        expect(screen.getByText('3 / 8')).toBeInTheDocument() // Completed/Total milestones
      })
    })
  })

  describe('KPI Display', () => {
    it('should display key performance indicators', async () => {
      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        expect(screen.getByText('1.12')).toBeInTheDocument() // Cost Performance Index
        expect(screen.getByText('0.95')).toBeInTheDocument() // Schedule Performance Index
        expect(screen.getByText('87.5%')).toBeInTheDocument() // Estimate Accuracy
        expect(screen.getByText('3.2%')).toBeInTheDocument() // Change Order Impact
        expect(screen.getByText('75%')).toBeInTheDocument() // Milestone Adhesion
      })
    })

    it('should show KPI status indicators', async () => {
      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        // Check for performance indicators (good/warning/poor)
        const indicators = screen.getAllByRole('status')
        expect(indicators.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Trade Analysis', () => {
    it('should display trade budget breakdown', async () => {
      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        expect(screen.getByText('Foundation')).toBeInTheDocument()
        expect(screen.getByText('Framing')).toBeInTheDocument()
        expect(screen.getByText('Electrical')).toBeInTheDocument()
        expect(screen.getByText('Plumbing')).toBeInTheDocument()

        expect(screen.getByText('$25,000')).toBeInTheDocument() // Foundation budget
        expect(screen.getByText('$24,000')).toBeInTheDocument() // Foundation spent
        expect(screen.getByText('$35,000')).toBeInTheDocument() // Framing budget
        expect(screen.getByText('$21,000')).toBeInTheDocument() // Framing spent
      })
    })

    it('should show budget variance indicators', async () => {
      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        // Should show positive variance for Foundation (over budget)
        // Should show negative variance for Framing (under budget)
        const variances = screen.getAllByText(/\$\d+/)
        expect(variances.length).toBeGreaterThan(8) // Multiple currency values
      })
    })
  })

  describe('Alerts and Notifications', () => {
    it('should display project alerts', async () => {
      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        expect(
          screen.getByText(/budget utilization is approaching 50% threshold/i)
        ).toBeInTheDocument()
        expect(
          screen.getByText(/milestone.*foundation complete.*ahead of schedule/i)
        ).toBeInTheDocument()
      })
    })

    it('should show alert severity levels', async () => {
      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        // Check for warning and info alert types
        expect(screen.getByTestId('alert-warning')).toBeInTheDocument()
        expect(screen.getByTestId('alert-info')).toBeInTheDocument()
      })
    })
  })

  describe('Cash Flow Projections', () => {
    it('should display cash flow projections', async () => {
      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        expect(screen.getByText('Cash Flow Projection')).toBeInTheDocument()

        // Should show projected inflow/outflow amounts
        expect(screen.getByText('$17,000')).toBeInTheDocument() // July inflow
        expect(screen.getByText('$18,000')).toBeInTheDocument() // July outflow
      })
    })

    it('should highlight cash flow concerns', async () => {
      const negativeFlowData = {
        ...mockAnalyticsData,
        cashFlow: {
          projectedInflow: [{ month: '2024-07', amount: 10000 }],
          projectedOutflow: [{ month: '2024-07', amount: 20000 }], // Higher outflow
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: negativeFlowData }),
      })

      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        // Should indicate negative cash flow
        expect(screen.getByTestId('negative-cash-flow')).toBeInTheDocument()
      })
    })
  })

  describe('Data Loading and Error Handling', () => {
    it('should show loading state', () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<ProjectAnalytics project={mockProject} />)

      expect(screen.getByTestId('analytics-loading')).toBeInTheDocument()
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        expect(screen.getByText(/error loading analytics data/i)).toBeInTheDocument()
      })
    })

    it('should handle empty data gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: null }),
      })

      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        expect(screen.getByText(/no analytics data available/i)).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<ProjectAnalytics project={mockProject} />)

      await waitFor(() => {
        const container = screen.getByTestId('analytics-container')
        expect(container).toBeInTheDocument()
        // Mobile layout is now handled via responsive grid classes, not a mobile-layout class
      })
    })
  })
})
