/**
 * Integration Test Suite for Milestone and Analytics Features
 * Testing end-to-end workflows between milestone management and analytics
 */

import { NextRequest } from 'next/server'
import { GET as getMilestones, POST as createMilestone, PUT as updateMilestone } from '@/app/api/projects/[id]/milestones/route'
import { GET as getAnalytics } from '@/app/api/projects/[id]/analytics/route'

// Mock database operations
jest.mock('@/lib/db', () => ({
  prisma: {
    milestone: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
    invoiceLineItem: {
      findMany: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    trade: {
      findMany: jest.fn(),
    },
    lineItem: {
      findMany: jest.fn(),
    },
  },
}))

// Mock authentication
jest.mock('@/lib/middleware', () => ({
  withAuth: (handler: any) => handler,
}))

const mockProject = {
  id: 'project-1',
  name: 'Test Construction Project',
  budget: 100000,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
}

const mockMilestones = [
  {
    id: 'milestone-1',
    name: 'Foundation Complete',
    description: 'Complete foundation work',
    targetDate: new Date('2024-03-15'),
    actualDate: new Date('2024-03-10'),
    progress: 100,
    status: 'COMPLETED',
    amount: 25000,
    projectId: 'project-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-03-10'),
  },
  {
    id: 'milestone-2',
    name: 'Framing Complete',
    description: 'Complete framing work',
    targetDate: new Date('2024-06-15'),
    actualDate: null,
    progress: 75,
    status: 'IN_PROGRESS',
    amount: 35000,
    projectId: 'project-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
  },
]

const mockInvoices = [
  {
    id: 'invoice-1',
    invoiceNumber: 'INV-001',
    vendorName: 'Concrete Corp',
    date: new Date('2024-02-15'),
    total: 12000,
    status: 'APPROVED',
    projectId: 'project-1',
  },
  {
    id: 'invoice-2',
    invoiceNumber: 'INV-002',
    vendorName: 'Steel Works Ltd',
    date: new Date('2024-04-20'),
    total: 18000,
    status: 'APPROVED',
    projectId: 'project-1',
  },
]

const mockTrades = [
  {
    id: 'trade-1',
    name: 'Foundation',
    projectId: 'project-1',
    lineItems: [
      { id: 'line-1', description: 'Concrete', quantity: 50, unitPrice: 200, total: 10000 },
      { id: 'line-2', description: 'Labor', quantity: 40, unitPrice: 375, total: 15000 },
    ],
  },
  {
    id: 'trade-2',
    name: 'Framing',
    projectId: 'project-1',
    lineItems: [
      { id: 'line-3', description: 'Lumber', quantity: 100, unitPrice: 150, total: 15000 },
      { id: 'line-4', description: 'Hardware', quantity: 1, unitPrice: 5000, total: 5000 },
    ],
  },
]

describe('Milestone and Analytics Integration', () => {
  let mockPrisma: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma = require('@/lib/db').prisma
    
    // Setup default mocks
    mockPrisma.project.findUnique.mockResolvedValue(mockProject)
    mockPrisma.milestone.findMany.mockResolvedValue(mockMilestones)
    mockPrisma.invoice.findMany.mockResolvedValue(mockInvoices)
    mockPrisma.trade.findMany.mockResolvedValue(mockTrades)
  })

  describe('Milestone Creation to Analytics Impact', () => {
    it('should create milestone and reflect in analytics', async () => {
      const newMilestone = {
        id: 'milestone-3',
        name: 'Electrical Complete',
        description: 'Complete electrical work',
        targetDate: new Date('2024-08-15'),
        actualDate: null,
        progress: 0,
        status: 'PENDING',
        amount: 15000,
        projectId: 'project-1',
        createdAt: new Date('2024-06-01'),
        updatedAt: new Date('2024-06-01'),
      }

      // Mock milestone creation
      mockPrisma.milestone.create.mockResolvedValue(newMilestone)
      mockPrisma.milestone.findMany.mockResolvedValue([...mockMilestones, newMilestone])

      // Create milestone
      const createRequest = new NextRequest('http://localhost:3000/api/projects/project-1/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Electrical Complete',
          description: 'Complete electrical work',
          targetDate: '2024-08-15',
          amount: 15000,
        }),
      })

      const createResponse = await createMilestone(createRequest, { params: { id: 'project-1' } })
      const createResult = await createResponse.json()

      expect(createResult.success).toBe(true)
      expect(mockPrisma.milestone.create).toHaveBeenCalled()

      // Verify analytics reflect the new milestone
      const analyticsRequest = new NextRequest('http://localhost:3000/api/projects/project-1/analytics')
      const analyticsResponse = await getAnalytics(analyticsRequest, { params: { id: 'project-1' } })
      const analyticsResult = await analyticsResponse.json()

      expect(analyticsResult.success).toBe(true)
      expect(analyticsResult.data.overview.totalMilestones).toBe(3)
      expect(analyticsResult.data.overview.totalBudget).toBe(100000)
    })
  })

  describe('Milestone Progress Updates to Analytics', () => {
    it('should update milestone progress and reflect in analytics KPIs', async () => {
      const updatedMilestone = {
        ...mockMilestones[1],
        progress: 90,
        updatedAt: new Date('2024-06-15'),
      }

      mockPrisma.milestone.update.mockResolvedValue(updatedMilestone)
      mockPrisma.milestone.findMany.mockResolvedValue([
        mockMilestones[0],
        updatedMilestone,
      ])

      // Update milestone progress
      const updateRequest = new NextRequest('http://localhost:3000/api/projects/project-1/milestones/milestone-2', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: 90,
        }),
      })

      const updateResponse = await updateMilestone(
        updateRequest,
        { params: { id: 'project-1', milestoneId: 'milestone-2' } }
      )
      const updateResult = await updateResponse.json()

      expect(updateResult.success).toBe(true)

      // Verify analytics show updated progress
      const analyticsRequest = new NextRequest('http://localhost:3000/api/projects/project-1/analytics')
      const analyticsResponse = await getAnalytics(analyticsRequest, { params: { id: 'project-1' } })
      const analyticsResult = await analyticsResponse.json()

      expect(analyticsResult.success).toBe(true)
      // Progress should be calculated based on milestone completion
      expect(analyticsResult.data.overview.progressPercentage).toBeGreaterThan(50)
      expect(analyticsResult.data.kpis.milestoneAdhesion).toBeDefined()
    })
  })

  describe('Milestone Completion to Financial Analytics', () => {
    it('should mark milestone complete and update financial projections', async () => {
      const completedMilestone = {
        ...mockMilestones[1],
        progress: 100,
        status: 'COMPLETED',
        actualDate: new Date('2024-06-10'),
        updatedAt: new Date('2024-06-10'),
      }

      mockPrisma.milestone.update.mockResolvedValue(completedMilestone)
      mockPrisma.milestone.findMany.mockResolvedValue([
        mockMilestones[0],
        completedMilestone,
      ])

      // Complete milestone
      const updateRequest = new NextRequest('http://localhost:3000/api/projects/project-1/milestones/milestone-2', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: 100,
          status: 'COMPLETED',
          actualDate: '2024-06-10',
        }),
      })

      const updateResponse = await updateMilestone(
        updateRequest,
        { params: { id: 'project-1', milestoneId: 'milestone-2' } }
      )

      expect(updateResponse.status).toBe(200)

      // Verify analytics show milestone completion
      const analyticsRequest = new NextRequest('http://localhost:3000/api/projects/project-1/analytics')
      const analyticsResponse = await getAnalytics(analyticsRequest, { params: { id: 'project-1' } })
      const analyticsResult = await analyticsResponse.json()

      expect(analyticsResult.success).toBe(true)
      expect(analyticsResult.data.overview.completedMilestones).toBe(2)
      expect(analyticsResult.data.kpis.schedulePerformanceIndex).toBeDefined()
      
      // Should have alerts about milestone completion
      expect(analyticsResult.data.alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'info',
            message: expect.stringContaining('milestone'),
          }),
        ])
      )
    })
  })

  describe('Milestone Budget Impact on Analytics', () => {
    it('should calculate budget utilization based on milestone progress', async () => {
      // Update milestone amounts to test budget calculations
      const milestonesWithProgress = [
        { ...mockMilestones[0], progress: 100, amount: 25000 }, // Completed
        { ...mockMilestones[1], progress: 75, amount: 35000 },  // 75% complete
      ]

      mockPrisma.milestone.findMany.mockResolvedValue(milestonesWithProgress)

      const analyticsRequest = new NextRequest('http://localhost:3000/api/projects/project-1/analytics')
      const analyticsResponse = await getAnalytics(analyticsRequest, { params: { id: 'project-1' } })
      const analyticsResult = await analyticsResponse.json()

      expect(analyticsResult.success).toBe(true)
      
      // Budget utilization should account for milestone progress
      // Completed milestone: $25,000 (100%)
      // In-progress milestone: $26,250 (75% of $35,000)
      // Expected total commitment: $51,250 out of $100,000 = ~51%
      expect(analyticsResult.data.overview.budgetUtilization).toBeCloseTo(51, 0)
      
      // Should have proper remaining budget calculation
      expect(analyticsResult.data.overview.remainingBudget).toBeCloseTo(48750, -2)
    })
  })

  describe('Analytics Trend Calculations', () => {
    it('should generate accurate spending trends from milestone data', async () => {
      const analyticsRequest = new NextRequest('http://localhost:3000/api/projects/project-1/analytics')
      const analyticsResponse = await getAnalytics(analyticsRequest, { params: { id: 'project-1' } })
      const analyticsResult = await analyticsResponse.json()

      expect(analyticsResult.success).toBe(true)
      expect(analyticsResult.data.trends).toBeDefined()
      expect(analyticsResult.data.trends.spendingTrend).toBeInstanceOf(Array)
      expect(analyticsResult.data.trends.budgetBurnRate).toBeInstanceOf(Array)
      
      // Verify trend data structure
      const spendingTrend = analyticsResult.data.trends.spendingTrend
      expect(spendingTrend.length).toBeGreaterThan(0)
      expect(spendingTrend[0]).toHaveProperty('month')
      expect(spendingTrend[0]).toHaveProperty('amount')
      expect(spendingTrend[0]).toHaveProperty('cumulative')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle milestone API errors gracefully in analytics', async () => {
      mockPrisma.milestone.findMany.mockRejectedValue(new Error('Database error'))

      const analyticsRequest = new NextRequest('http://localhost:3000/api/projects/project-1/analytics')
      const analyticsResponse = await getAnalytics(analyticsRequest, { params: { id: 'project-1' } })
      const analyticsResult = await analyticsResponse.json()

      // Analytics should still work with fallback data
      expect(analyticsResponse.status).toBe(200)
      expect(analyticsResult.success).toBe(true)
      // Should have zero milestones when milestone query fails
      expect(analyticsResult.data.overview.totalMilestones).toBe(0)
      expect(analyticsResult.data.overview.completedMilestones).toBe(0)
    })
  })

  describe('Performance Optimization', () => {
    it('should efficiently load milestone and analytics data together', async () => {
      const startTime = Date.now()

      // Load milestones
      const milestonesRequest = new NextRequest('http://localhost:3000/api/projects/project-1/milestones')
      const milestonesResponse = await getMilestones(milestonesRequest, { params: { id: 'project-1' } })
      
      // Load analytics
      const analyticsRequest = new NextRequest('http://localhost:3000/api/projects/project-1/analytics')
      const analyticsResponse = await getAnalytics(analyticsRequest, { params: { id: 'project-1' } })

      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(milestonesResponse.status).toBe(200)
      expect(analyticsResponse.status).toBe(200)
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(1000) // 1 second
      
      // Verify database queries were optimized
      expect(mockPrisma.milestone.findMany).toHaveBeenCalledTimes(2)
      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        select: expect.objectContaining({
          budget: true,
          startDate: true,
          endDate: true,
        }),
      })
    })
  })
})