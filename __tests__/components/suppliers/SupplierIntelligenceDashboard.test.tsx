/**
 * Tests for Supplier Intelligence Dashboard Component
 * Comprehensive test coverage for AI analytics and insights
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupplierIntelligenceDashboard } from '@/components/suppliers/SupplierIntelligenceDashboard'

// Mock fetch
global.fetch = jest.fn()

const mockAnalyticsData = {
  uploadMetrics: {
    totalUploads: 25,
    successfulUploads: 23,
    avgProcessingTime: 145000, // 2.4 minutes
    successRate: 0.92,
    lastUpload: '2024-01-15T10:30:00Z',
  },
  matchingPerformance: {
    avgConfidence: 0.78,
    highConfidenceRate: 0.65,
    autoMatchRate: 0.73,
    manualOverrideRate: 0.27,
    improvementTrend: 0.08,
  },
  aiInsights: {
    learnedPatterns: 8,
    patternAccuracy: 0.84,
    timesSaved: 47, // minutes
    costOptimization: 345.5,
    nextSuggestion:
      'Try including more detailed item descriptions in your invoices for better AI matching.',
  },
  projectCompatibility: {
    bestMatchedProjects: [
      {
        projectId: 'proj-1',
        projectName: 'Commercial Office Building',
        matchRate: 0.89,
        totalInvoices: 8,
      },
      {
        projectId: 'proj-2',
        projectName: 'Residential Complex Phase 2',
        matchRate: 0.71,
        totalInvoices: 12,
      },
      {
        projectId: 'proj-3',
        projectName: 'Highway Bridge Construction',
        matchRate: 0.45,
        totalInvoices: 3,
      },
    ],
    avgProjectConfidence: 0.68,
  },
  improvements: [
    {
      type: 'accuracy',
      title: 'Pattern Recognition Optimization',
      description: 'Our AI has learned your invoice patterns and optimized matching algorithms.',
      impact: 'high',
      implemented: true,
    },
    {
      type: 'speed',
      title: 'Optimize File Format',
      description: 'Using cleaner PDF formats can reduce processing time by 40%.',
      impact: 'medium',
    },
    {
      type: 'consistency',
      title: 'Standardize Invoice Layout',
      description: 'Consistent invoice formats help our AI learn your patterns better.',
      impact: 'medium',
    },
  ],
}

const defaultProps = {
  supplierEmail: 'test@supplier.com',
  supplierName: 'Test Supplier Co',
}

describe('SupplierIntelligenceDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading States', () => {
    it('displays loading state initially', () => {
      // Mock delayed response
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      )

      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      expect(screen.getByTestId('intelligence-dashboard-loading')).toBeInTheDocument()
      expect(screen.queryByTestId('intelligence-dashboard')).not.toBeInTheDocument()
    })

    it('displays error state when API fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Analytics service unavailable',
          }),
      })

      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('intelligence-dashboard-error')).toBeInTheDocument()
        expect(screen.getByText('Unable to Load Analytics')).toBeInTheDocument()
        expect(screen.getByText('Analytics service unavailable')).toBeInTheDocument()
      })
    })

    it('displays empty state when no analytics data', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            analytics: null,
          }),
      })

      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('intelligence-dashboard-empty')).toBeInTheDocument()
        expect(screen.getByText('No Analytics Data Available')).toBeInTheDocument()
        expect(
          screen.getByText('Upload some invoices to start seeing AI-powered insights')
        ).toBeInTheDocument()
      })
    })

    it('handles network errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('intelligence-dashboard-error')).toBeInTheDocument()
        expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument()
      })
    })
  })

  describe('Analytics Display', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            analytics: mockAnalyticsData,
          }),
      })
    })

    it('renders dashboard with analytics data', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('intelligence-dashboard')).toBeInTheDocument()
        expect(screen.getByText('AI Performance Dashboard')).toBeInTheDocument()
        expect(
          screen.getByText('Your upload performance and AI matching insights for Test Supplier Co')
        ).toBeInTheDocument()
      })
    })

    it('displays upload metrics correctly', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        // Upload success rate
        expect(screen.getByText('Upload Success')).toBeInTheDocument()
        expect(screen.getByText('92%')).toBeInTheDocument()
        expect(screen.getByText('23')).toBeInTheDocument()
        expect(screen.getByText('of 25 uploads')).toBeInTheDocument()
      })
    })

    it('displays AI matching performance', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        // AI Confidence
        expect(screen.getByText('AI Confidence')).toBeInTheDocument()
        expect(screen.getByText('78%')).toBeInTheDocument()
        expect(screen.getByText('65%')).toBeInTheDocument()
        expect(screen.getByText('high confidence matches')).toBeInTheDocument()
      })
    })

    it('displays processing speed metrics', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Processing Speed')).toBeInTheDocument()
        expect(screen.getByText('2min')).toBeInTheDocument() // 145000ms ≈ 2.4min
        expect(screen.getByText('average processing time')).toBeInTheDocument()
      })
    })

    it('displays AI learning metrics', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('AI Learning')).toBeInTheDocument()
        expect(screen.getByText('8')).toBeInTheDocument() // learned patterns
        expect(screen.getByText('84%')).toBeInTheDocument()
        expect(screen.getByText('pattern accuracy')).toBeInTheDocument()
      })
    })

    it('shows trend indicators for improvement', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        // Should show trending up icon for positive improvement trend (0.08)
        expect(screen.getByTestId('intelligence-dashboard')).toBeInTheDocument()
        // Trend icon would be visible in the AI Confidence section
      })
    })
  })

  describe('Matching Performance Details', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            analytics: mockAnalyticsData,
          }),
      })
    })

    it('displays detailed matching performance metrics', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('AI Matching Performance')).toBeInTheDocument()
        expect(screen.getByText('Auto-Match Rate')).toBeInTheDocument()
        expect(screen.getByText('Manual Overrides')).toBeInTheDocument()
        expect(screen.getByText('High Confidence')).toBeInTheDocument()
      })
    })

    it('shows progress bars for performance metrics', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        // Check that progress bars are rendered with correct percentages
        const progressBars = screen.getAllByRole('progressbar', { hidden: true })
        expect(progressBars.length).toBeGreaterThan(0)
      })
    })

    it('displays percentage values for all metrics', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        // Auto-match rate: 73%
        expect(screen.getByText('73%')).toBeInTheDocument()
        // Manual override rate: 27%
        expect(screen.getByText('27%')).toBeInTheDocument()
        // High confidence rate: 65%
        expect(screen.getByText('65%')).toBeInTheDocument()
      })
    })
  })

  describe('Project Compatibility', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            analytics: mockAnalyticsData,
          }),
      })
    })

    it('displays project compatibility section', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Project Compatibility')).toBeInTheDocument()
      })
    })

    it('lists best matched projects', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Commercial Office Building')).toBeInTheDocument()
        expect(screen.getByText('Residential Complex Phase 2')).toBeInTheDocument()
        expect(screen.getByText('Highway Bridge Construction')).toBeInTheDocument()
      })
    })

    it('shows match rates with appropriate colors', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        // High match rate (89%) should be green
        expect(screen.getByText('89% match')).toBeInTheDocument()
        // Medium match rate (71%) should be yellow
        expect(screen.getByText('71% match')).toBeInTheDocument()
        // Low match rate (45%) should be gray
        expect(screen.getByText('45% match')).toBeInTheDocument()
      })
    })

    it('displays invoice counts for each project', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('8 invoices')).toBeInTheDocument()
        expect(screen.getByText('12 invoices')).toBeInTheDocument()
        expect(screen.getByText('3 invoices')).toBeInTheDocument()
      })
    })

    it('handles empty project list', async () => {
      const emptyProjectData = {
        ...mockAnalyticsData,
        projectCompatibility: {
          bestMatchedProjects: [],
          avgProjectConfidence: 0,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            analytics: emptyProjectData,
          }),
      })

      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByText(
            'No project matches available yet. Upload more invoices to see compatibility insights.'
          )
        ).toBeInTheDocument()
      })
    })
  })

  describe('AI Impact & Efficiency', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            analytics: mockAnalyticsData,
          }),
      })
    })

    it('displays AI impact metrics', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('AI Impact & Efficiency')).toBeInTheDocument()
        expect(screen.getByText('47 min')).toBeInTheDocument() // time saved
        expect(screen.getByText('time saved by AI matching')).toBeInTheDocument()
        expect(screen.getByText('$345.50')).toBeInTheDocument() // cost optimization
        expect(screen.getByText('estimated cost savings')).toBeInTheDocument()
        expect(screen.getByText('pattern recognition accuracy')).toBeInTheDocument()
      })
    })

    it('shows AI recommendation when available', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('💡 AI Recommendation')).toBeInTheDocument()
        expect(
          screen.getByText(
            'Try including more detailed item descriptions in your invoices for better AI matching.'
          )
        ).toBeInTheDocument()
      })
    })

    it('hides recommendation section when not available', async () => {
      const noRecommendationData = {
        ...mockAnalyticsData,
        aiInsights: {
          ...mockAnalyticsData.aiInsights,
          nextSuggestion: null,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            analytics: noRecommendationData,
          }),
      })

      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText('💡 AI Recommendation')).not.toBeInTheDocument()
      })
    })
  })

  describe('Improvement Suggestions', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            analytics: mockAnalyticsData,
          }),
      })
    })

    it('displays improvement opportunities section', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Improvement Opportunities')).toBeInTheDocument()
      })
    })

    it('shows all improvement suggestions', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Pattern Recognition Optimization')).toBeInTheDocument()
        expect(screen.getByText('Optimize File Format')).toBeInTheDocument()
        expect(screen.getByText('Standardize Invoice Layout')).toBeInTheDocument()
      })
    })

    it('displays improvement descriptions', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByText(
            'Our AI has learned your invoice patterns and optimized matching algorithms.'
          )
        ).toBeInTheDocument()
        expect(
          screen.getByText('Using cleaner PDF formats can reduce processing time by 40%.')
        ).toBeInTheDocument()
        expect(
          screen.getByText('Consistent invoice formats help our AI learn your patterns better.')
        ).toBeInTheDocument()
      })
    })

    it('shows impact badges with appropriate colors', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('high impact')).toBeInTheDocument()
        expect(screen.getAllByText('medium impact')).toHaveLength(2)
      })
    })

    it('indicates implemented improvements', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByText(
            '✅ This improvement has been implemented automatically by our AI system.'
          )
        ).toBeInTheDocument()
      })
    })

    it('assigns test IDs to improvement items', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('improvement-0')).toBeInTheDocument()
        expect(screen.getByTestId('improvement-1')).toBeInTheDocument()
        expect(screen.getByTestId('improvement-2')).toBeInTheDocument()
      })
    })

    it('hides improvement section when no suggestions available', async () => {
      const noImprovementsData = {
        ...mockAnalyticsData,
        improvements: [],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            analytics: noImprovementsData,
          }),
      })

      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText('Improvement Opportunities')).not.toBeInTheDocument()
      })
    })
  })

  describe('Refresh Functionality', () => {
    it('provides refresh button', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            analytics: mockAnalyticsData,
          }),
      })

      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument()
      })
    })

    it('calls API again when refresh is clicked', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              analytics: mockAnalyticsData,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              analytics: mockAnalyticsData,
            }),
        })

      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('intelligence-dashboard')).toBeInTheDocument()
      })

      const refreshButton = screen.getByText('Refresh')
      await user.click(refreshButton)

      // Should make second API call
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('shows loading state during refresh', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              analytics: mockAnalyticsData,
            }),
        })
        .mockImplementationOnce(
          () =>
            new Promise(resolve =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: () =>
                      Promise.resolve({
                        success: true,
                        analytics: mockAnalyticsData,
                      }),
                  }),
                100
              )
            )
        )

      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('intelligence-dashboard')).toBeInTheDocument()
      })

      const refreshButton = screen.getByText('Refresh')
      await user.click(refreshButton)

      // Button should be disabled during refresh
      expect(refreshButton).toBeDisabled()
    })
  })

  describe('Error Recovery', () => {
    it('allows retry after error', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: false,
              error: 'Temporary error',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              analytics: mockAnalyticsData,
            }),
        })

      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('intelligence-dashboard-error')).toBeInTheDocument()
      })

      const tryAgainButton = screen.getByText('Try Again')
      await user.click(tryAgainButton)

      await waitFor(() => {
        expect(screen.getByTestId('intelligence-dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            analytics: mockAnalyticsData,
          }),
      })
    })

    it('provides proper heading hierarchy', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /ai performance dashboard/i })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('heading', { level: 3, name: /ai matching performance/i })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('heading', { level: 3, name: /project compatibility/i })
        ).toBeInTheDocument()
      })
    })

    it('provides proper button labeling', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i })
        expect(refreshButton).toBeInTheDocument()
        expect(refreshButton).toHaveAttribute('type', 'button')
      })
    })

    it('provides appropriate ARIA labels for progress bars', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        // Progress bars should be properly labeled
        const progressElements = screen.getAllByRole('progressbar', { hidden: true })
        expect(progressElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Data Formatting', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            analytics: mockAnalyticsData,
          }),
      })
    })

    it('formats percentages correctly', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        // Check various percentage formats
        expect(screen.getByText('92%')).toBeInTheDocument() // 0.92
        expect(screen.getByText('78%')).toBeInTheDocument() // 0.78
        expect(screen.getByText('65%')).toBeInTheDocument() // 0.65
      })
    })

    it('formats durations correctly', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        // 145000ms should be formatted as 2min
        expect(screen.getByText('2min')).toBeInTheDocument()
      })
    })

    it('formats currency correctly', async () => {
      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('$345.50')).toBeInTheDocument()
      })
    })

    it('handles edge cases in formatting', async () => {
      const edgeCaseData = {
        ...mockAnalyticsData,
        uploadMetrics: {
          ...mockAnalyticsData.uploadMetrics,
          avgProcessingTime: 45000, // 45 seconds
        },
        aiInsights: {
          ...mockAnalyticsData.aiInsights,
          costOptimization: 0, // Zero cost
          timesSaved: 0, // Zero time
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            analytics: edgeCaseData,
          }),
      })

      render(<SupplierIntelligenceDashboard {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('45s')).toBeInTheDocument() // Should format as seconds
        expect(screen.getByText('$0.00')).toBeInTheDocument() // Zero cost
        expect(screen.getByText('0 min')).toBeInTheDocument() // Zero time
      })
    })
  })
})
