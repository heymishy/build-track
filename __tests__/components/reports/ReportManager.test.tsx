/**
 * Test Suite for ReportManager Component
 * Testing report generation, configuration, and export functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReportManager } from '@/components/reports/ReportManager'
import '@testing-library/jest-dom'

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock URL.createObjectURL for file downloads
global.URL.createObjectURL = jest.fn(() => 'mock-url')
global.URL.revokeObjectURL = jest.fn()

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

const mockReportData = {
  success: true,
  data: new Blob(['mock report data'], { type: 'application/pdf' }),
  url: 'mock-url',
}

describe('ReportManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: async () => mockReportData.data,
    })
  })

  describe('Component Rendering', () => {
    it('should render report manager interface', () => {
      render(<ReportManager projectId="project-1" />)

      expect(screen.getByText('Project Reports')).toBeInTheDocument()
      expect(screen.getByText('Generate comprehensive project reports')).toBeInTheDocument()
      expect(screen.getByLabelText(/report type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/format/i)).toBeInTheDocument()
    })

    it('should display available report templates', () => {
      render(<ReportManager projectId="project-1" />)

      const reportTypeSelect = screen.getByLabelText(/report type/i)
      fireEvent.click(reportTypeSelect)

      expect(screen.getByText(/project summary/i)).toBeInTheDocument()
      expect(screen.getByText(/financial analysis/i)).toBeInTheDocument()
      expect(screen.getByText(/milestone progress/i)).toBeInTheDocument()
      expect(screen.getByText(/cost tracking/i)).toBeInTheDocument()
    })

    it('should display export format options', () => {
      render(<ReportManager projectId="project-1" />)

      const formatSelect = screen.getByLabelText(/format/i)
      fireEvent.click(formatSelect)

      expect(screen.getByText('PDF')).toBeInTheDocument()
      expect(screen.getByText('Excel')).toBeInTheDocument()
      expect(screen.getByText('CSV')).toBeInTheDocument()
    })
  })

  describe('Report Configuration', () => {
    it('should allow date range selection', () => {
      render(<ReportManager projectId="project-1" />)

      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
    })

    it('should show section options for detailed reports', () => {
      render(<ReportManager projectId="project-1" />)

      const reportTypeSelect = screen.getByLabelText(/report type/i)
      fireEvent.change(reportTypeSelect, { target: { value: 'comprehensive' } })

      expect(screen.getByLabelText(/include executive summary/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/include financial details/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/include milestone tracking/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/include cost analysis/i)).toBeInTheDocument()
    })

    it('should validate date range inputs', () => {
      render(<ReportManager projectId="project-1" />)

      const startDateInput = screen.getByLabelText(/start date/i)
      const endDateInput = screen.getByLabelText(/end date/i)

      fireEvent.change(startDateInput, { target: { value: '2024-06-01' } })
      fireEvent.change(endDateInput, { target: { value: '2024-05-01' } }) // End before start

      const generateButton = screen.getByRole('button', { name: /generate report/i })
      fireEvent.click(generateButton)

      expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument()
    })
  })

  describe('Report Generation', () => {
    it('should generate PDF report successfully', async () => {
      render(<ReportManager projectId="project-1" />)

      const reportTypeSelect = screen.getByLabelText(/report type/i)
      const formatSelect = screen.getByLabelText(/format/i)

      fireEvent.change(reportTypeSelect, { target: { value: 'project-summary' } })
      fireEvent.change(formatSelect, { target: { value: 'PDF' } })

      const generateButton = screen.getByRole('button', { name: /generate report/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project-1/reports',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('project-summary'),
          })
        )
      })
    })

    it('should show loading state during generation', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      )

      render(<ReportManager projectId="project-1" />)

      const generateButton = screen.getByRole('button', { name: /generate report/i })
      fireEvent.click(generateButton)

      expect(screen.getByText(/generating report/i)).toBeInTheDocument()
      expect(generateButton).toBeDisabled()
    })

    it('should handle successful report download', async () => {
      render(<ReportManager projectId="project-1" />)

      const generateButton = screen.getByRole('button', { name: /generate report/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText(/report generated successfully/i)).toBeInTheDocument()
      })

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockReportData.data)
    })
  })

  describe('Export Formats', () => {
    it('should generate Excel reports', async () => {
      render(<ReportManager projectId="project-1" />)

      const formatSelect = screen.getByLabelText(/format/i)
      fireEvent.change(formatSelect, { target: { value: 'Excel' } })

      const generateButton = screen.getByRole('button', { name: /generate report/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project-1/reports',
          expect.objectContaining({
            body: expect.stringContaining('Excel'),
          })
        )
      })
    })

    it('should generate CSV reports', async () => {
      render(<ReportManager projectId="project-1" />)

      const formatSelect = screen.getByLabelText(/format/i)
      fireEvent.change(formatSelect, { target: { value: 'CSV' } })

      const generateButton = screen.getByRole('button', { name: /generate report/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project-1/reports',
          expect.objectContaining({
            body: expect.stringContaining('CSV'),
          })
        )
      })
    })
  })

  describe('Report History', () => {
    it('should display recent reports', () => {
      render(<ReportManager projectId="project-1" />)

      expect(screen.getByText(/recent reports/i)).toBeInTheDocument()
      expect(screen.getByTestId('report-history')).toBeInTheDocument()
    })

    it('should allow downloading previous reports', async () => {
      const mockReportHistory = [
        {
          id: 'report-1',
          name: 'Project Summary - March 2024',
          type: 'project-summary',
          format: 'PDF',
          createdAt: '2024-03-15T10:00:00Z',
          downloadUrl: 'mock-download-url',
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, reports: mockReportHistory }),
      })

      render(<ReportManager projectId="project-1" />)

      await waitFor(() => {
        expect(screen.getByText('Project Summary - March 2024')).toBeInTheDocument()
      })

      const downloadButton = screen.getByRole('button', { name: /download/i })
      fireEvent.click(downloadButton)

      expect(global.fetch).toHaveBeenCalledWith('mock-download-url')
    })
  })

  describe('Error Handling', () => {
    it('should handle report generation errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Generation failed'))

      render(<ReportManager projectId="project-1" />)

      const generateButton = screen.getByRole('button', { name: /generate report/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to generate report/i)).toBeInTheDocument()
      })
    })

    it('should handle API response errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })

      render(<ReportManager projectId="project-1" />)

      const generateButton = screen.getByRole('button', { name: /generate report/i })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument()
      })
    })

    it('should validate required fields', () => {
      render(<ReportManager projectId="project-1" />)

      const reportTypeSelect = screen.getByLabelText(/report type/i)
      fireEvent.change(reportTypeSelect, { target: { value: '' } })

      const generateButton = screen.getByRole('button', { name: /generate report/i })
      fireEvent.click(generateButton)

      expect(screen.getByText(/please select a report type/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ReportManager projectId="project-1" />)

      expect(screen.getByLabelText(/report type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/format/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(<ReportManager projectId="project-1" />)

      const reportTypeSelect = screen.getByLabelText(/report type/i)
      reportTypeSelect.focus()

      expect(document.activeElement).toBe(reportTypeSelect)

      // Tab to next element
      fireEvent.keyDown(reportTypeSelect, { key: 'Tab' })
      expect(document.activeElement).toBe(screen.getByLabelText(/format/i))
    })
  })
})
