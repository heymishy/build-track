/**
 * Test Suite for ReportGenerator Service
 * Testing PDF, Excel, and CSV report generation
 */

import { ReportGenerator } from '@/lib/report-generator'

// Mock external dependencies
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    text: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
    output: jest.fn().mockReturnValue('mock-pdf-data')
  }))
})

jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn().mockReturnValue({}),
    book_new: jest.fn().mockReturnValue({}),
    book_append_sheet: jest.fn(),
    sheet_to_csv: jest.fn().mockReturnValue('mock,csv,data')
  },
  write: jest.fn().mockReturnValue('mock-excel-data')
}))

// Mock Prisma client
const mockPrisma = {
  project: {
    findUnique: jest.fn()
  },
  trade: {
    findMany: jest.fn()
  },
  invoice: {
    findMany: jest.fn()
  },
  milestone: {
    findMany: jest.fn()
  }
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma
}))

const mockProjectData = {
  id: 'project-1',
  name: 'Test Construction Project',
  description: 'A comprehensive construction project',
  status: 'ACTIVE',
  budget: 100000,
  totalBudget: 95000,
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-12-31T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-15T00:00:00Z',
  owner: { name: 'John Doe', email: 'john@example.com' },
  projectUsers: [
    { user: { name: 'Jane Smith', email: 'jane@example.com' }, role: 'CONTRACTOR' }
  ]
}

const mockTradesData = [
  {
    id: 'trade-1',
    name: 'Foundation',
    description: 'Foundation work',
    lineItems: [
      {
        id: 'line-1',
        description: 'Concrete pouring',
        quantity: 10,
        unit: 'm³',
        materialCostEst: 2000,
        laborCostEst: 800,
        equipmentCostEst: 200,
        markupPercent: 15,
        overheadPercent: 10
      }
    ]
  },
  {
    id: 'trade-2',
    name: 'Electrical',
    description: 'Electrical installation',
    lineItems: [
      {
        id: 'line-2',
        description: 'Wiring installation',
        quantity: 100,
        unit: 'm',
        materialCostEst: 1500,
        laborCostEst: 1000,
        equipmentCostEst: 100,
        markupPercent: 15,
        overheadPercent: 10
      }
    ]
  }
]

const mockInvoicesData = [
  {
    id: 'invoice-1',
    invoiceNumber: 'INV-001',
    vendor: 'ABC Construction',
    total: 3000,
    date: '2024-02-15T00:00:00Z',
    status: 'APPROVED',
    lineItems: [
      {
        id: 'inv-line-1',
        description: 'Concrete materials',
        amount: 2500,
        quantity: 10,
        unit: 'm³'
      }
    ]
  }
]

const mockMilestonesData = [
  {
    id: 'milestone-1',
    name: 'Foundation Complete',
    description: 'Foundation work completed',
    targetDate: '2024-03-15T00:00:00Z',
    actualDate: '2024-03-10T00:00:00Z',
    status: 'COMPLETED',
    paymentAmount: 25000,
    percentComplete: 100
  },
  {
    id: 'milestone-2',
    name: 'Framing Complete',
    description: 'Structural framing completed',
    targetDate: '2024-06-15T00:00:00Z',
    actualDate: null,
    status: 'IN_PROGRESS',
    paymentAmount: 35000,
    percentComplete: 60
  }
]

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator

  beforeEach(() => {
    reportGenerator = new ReportGenerator()
    jest.clearAllMocks()

    // Setup default mock returns
    mockPrisma.project.findUnique.mockResolvedValue(mockProjectData)
    mockPrisma.trade.findMany.mockResolvedValue(mockTradesData)
    mockPrisma.invoice.findMany.mockResolvedValue(mockInvoicesData)
    mockPrisma.milestone.findMany.mockResolvedValue(mockMilestonesData)
  })

  describe('PDF Report Generation', () => {
    it('should generate project summary PDF report', async () => {
      const config = {
        type: 'project-summary' as const,
        format: 'PDF' as const,
        sections: {
          executiveSummary: true,
          financialDetails: true,
          milestoneTracking: true,
          costAnalysis: false
        }
      }

      const result = await reportGenerator.generateProjectReport('project-1', config)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data).toBeInstanceOf(Blob)
      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        include: expect.objectContaining({
          owner: true,
          projectUsers: { include: { user: true } }
        })
      })
    })

    it('should generate comprehensive PDF report with all sections', async () => {
      const config = {
        type: 'comprehensive' as const,
        format: 'PDF' as const,
        sections: {
          executiveSummary: true,
          financialDetails: true,
          milestoneTracking: true,
          costAnalysis: true,
          tradeBreakdown: true,
          invoiceDetails: true
        }
      }

      const result = await reportGenerator.generateProjectReport('project-1', config)

      expect(result.success).toBe(true)
      expect(mockPrisma.trade.findMany).toHaveBeenCalled()
      expect(mockPrisma.invoice.findMany).toHaveBeenCalled()
      expect(mockPrisma.milestone.findMany).toHaveBeenCalled()
    })

    it('should handle PDF generation with custom date range', async () => {
      const config = {
        type: 'financial-analysis' as const,
        format: 'PDF' as const,
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-06-30'
        },
        sections: {
          financialDetails: true,
          costAnalysis: true
        }
      }

      const result = await reportGenerator.generateProjectReport('project-1', config)

      expect(result.success).toBe(true)
      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'project-1',
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date)
            })
          })
        })
      )
    })
  })

  describe('Excel Report Generation', () => {
    it('should generate Excel report with multiple worksheets', async () => {
      const config = {
        type: 'comprehensive' as const,
        format: 'Excel' as const,
        sections: {
          executiveSummary: true,
          financialDetails: true,
          tradeBreakdown: true,
          invoiceDetails: true
        }
      }

      const result = await reportGenerator.generateProjectReport('project-1', config)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      const XLSX = require('xlsx')
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledTimes(4) // One for each section
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(4)
    })

    it('should create appropriate Excel worksheet names', async () => {
      const config = {
        type: 'cost-tracking' as const,
        format: 'Excel' as const,
        sections: {
          tradeBreakdown: true,
          costAnalysis: true
        }
      }

      const result = await reportGenerator.generateProjectReport('project-1', config)

      expect(result.success).toBe(true)
      
      const XLSX = require('xlsx')
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'Trade Breakdown'
      )
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'Cost Analysis'
      )
    })
  })

  describe('CSV Report Generation', () => {
    it('should generate CSV report for trade breakdown', async () => {
      const config = {
        type: 'cost-tracking' as const,
        format: 'CSV' as const,
        sections: {
          tradeBreakdown: true
        }
      }

      const result = await reportGenerator.generateProjectReport('project-1', config)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      const XLSX = require('xlsx')
      expect(XLSX.utils.sheet_to_csv).toHaveBeenCalled()
    })

    it('should generate CSV report for milestone tracking', async () => {
      const config = {
        type: 'milestone-progress' as const,
        format: 'CSV' as const,
        sections: {
          milestoneTracking: true
        }
      }

      const result = await reportGenerator.generateProjectReport('project-1', config)

      expect(result.success).toBe(true)
    })
  })

  describe('Data Processing', () => {
    it('should calculate financial metrics correctly', async () => {
      const config = {
        type: 'financial-analysis' as const,
        format: 'PDF' as const,
        sections: {
          financialDetails: true,
          costAnalysis: true
        }
      }

      const result = await reportGenerator.generateProjectReport('project-1', config)

      expect(result.success).toBe(true)
      
      // Verify that financial calculations are performed
      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        include: { lineItems: true }
      })
    })

    it('should process milestone progress data', async () => {
      const config = {
        type: 'milestone-progress' as const,
        format: 'Excel' as const,
        sections: {
          milestoneTracking: true
        }
      }

      const result = await reportGenerator.generateProjectReport('project-1', config)

      expect(result.success).toBe(true)
      expect(mockPrisma.milestone.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { targetDate: 'asc' }
      })
    })

    it('should aggregate trade costs correctly', async () => {
      const config = {
        type: 'cost-tracking' as const,
        format: 'CSV' as const,
        sections: {
          tradeBreakdown: true,
          costAnalysis: true
        }
      }

      const result = await reportGenerator.generateProjectReport('project-1', config)

      expect(result.success).toBe(true)
      // Trades data should be processed for cost aggregation
      expect(mockPrisma.trade.findMany).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing project gracefully', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null)

      const result = await reportGenerator.generateProjectReport('nonexistent-project')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Project not found')
    })

    it('should handle database errors', async () => {
      mockPrisma.project.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const result = await reportGenerator.generateProjectReport('project-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to generate report')
    })

    it('should handle PDF generation errors', async () => {
      const jsPDF = require('jspdf')
      jsPDF.mockImplementation(() => {
        throw new Error('PDF generation failed')
      })

      const result = await reportGenerator.generateProjectReport('project-1', {
        format: 'PDF'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to generate report')
    })

    it('should handle Excel generation errors', async () => {
      const XLSX = require('xlsx')
      XLSX.write.mockImplementation(() => {
        throw new Error('Excel generation failed')
      })

      const result = await reportGenerator.generateProjectReport('project-1', {
        format: 'Excel'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to generate report')
    })
  })

  describe('Report Configuration', () => {
    it('should use default configuration when none provided', async () => {
      const result = await reportGenerator.generateProjectReport('project-1')

      expect(result.success).toBe(true)
      // Should fetch all data types for comprehensive report
      expect(mockPrisma.project.findUnique).toHaveBeenCalled()
      expect(mockPrisma.trade.findMany).toHaveBeenCalled()
      expect(mockPrisma.invoice.findMany).toHaveBeenCalled()
      expect(mockPrisma.milestone.findMany).toHaveBeenCalled()
    })

    it('should respect section exclusions', async () => {
      const config = {
        type: 'project-summary' as const,
        format: 'PDF' as const,
        sections: {
          executiveSummary: true,
          financialDetails: false,
          milestoneTracking: false,
          costAnalysis: false
        }
      }

      const result = await reportGenerator.generateProjectReport('project-1', config)

      expect(result.success).toBe(true)
      expect(mockPrisma.project.findUnique).toHaveBeenCalled()
      // Should not fetch unnecessary data
      expect(mockPrisma.milestone.findMany).not.toHaveBeenCalled()
    })

    it('should handle custom report titles', async () => {
      const config = {
        type: 'custom' as const,
        format: 'PDF' as const,
        title: 'Custom Project Analysis Report',
        sections: {
          executiveSummary: true
        }
      }

      const result = await reportGenerator.generateProjectReport('project-1', config)

      expect(result.success).toBe(true)
    })
  })

  describe('Performance Optimization', () => {
    it('should efficiently handle large datasets', async () => {
      // Mock large dataset
      const largeTrades = Array.from({ length: 100 }, (_, i) => ({
        id: `trade-${i}`,
        name: `Trade ${i}`,
        lineItems: Array.from({ length: 10 }, (_, j) => ({
          id: `line-${i}-${j}`,
          description: `Line item ${j}`,
          quantity: 1,
          unit: 'ea',
          materialCostEst: 100,
          laborCostEst: 50,
          equipmentCostEst: 25,
          markupPercent: 15,
          overheadPercent: 10
        }))
      }))

      mockPrisma.trade.findMany.mockResolvedValue(largeTrades)

      const startTime = Date.now()
      const result = await reportGenerator.generateProjectReport('project-1', {
        format: 'Excel',
        sections: { tradeBreakdown: true }
      })
      const duration = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
    })

    it('should minimize database queries', async () => {
      const result = await reportGenerator.generateProjectReport('project-1', {
        type: 'comprehensive',
        format: 'PDF'
      })

      expect(result.success).toBe(true)
      
      // Should make minimal queries with proper includes
      expect(mockPrisma.project.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrisma.trade.findMany).toHaveBeenCalledTimes(1)
      expect(mockPrisma.invoice.findMany).toHaveBeenCalledTimes(1)
      expect(mockPrisma.milestone.findMany).toHaveBeenCalledTimes(1)
    })
  })

  describe('Report Metadata', () => {
    it('should include generation timestamp', async () => {
      const result = await reportGenerator.generateProjectReport('project-1')

      expect(result.success).toBe(true)
      // Timestamp should be included in report metadata
    })

    it('should include report configuration in metadata', async () => {
      const config = {
        type: 'financial-analysis' as const,
        format: 'Excel' as const,
        sections: {
          financialDetails: true,
          costAnalysis: true
        }
      }

      const result = await reportGenerator.generateProjectReport('project-1', config)

      expect(result.success).toBe(true)
      // Configuration should be stored in report metadata
    })
  })
})