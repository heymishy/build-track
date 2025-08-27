/**
 * Test Suite for Line Items API Route
 * Testing line item creation for existing trades and budget updates
 */

import { POST } from '@/app/api/projects/[id]/trades/[tradeId]/line-items/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/middleware', () => ({
  withAuth: (handler: any) => handler
}))

const mockPrisma = {
  projectUser: {
    findFirst: jest.fn()
  },
  trade: {
    findFirst: jest.fn(),
    findMany: jest.fn()
  },
  lineItem: {
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn()
  },
  project: {
    update: jest.fn()
  }
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma
}))

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'ADMIN' as const
}

const mockTrade = {
  id: 'trade-1',
  name: 'Foundation',
  description: 'Foundation work',
  projectId: 'project-1',
  sortOrder: 1
}

const mockLineItem = {
  id: 'line-item-1',
  description: 'Concrete pouring',
  quantity: 10,
  unit: 'm³',
  materialCostEst: 2000,
  laborCostEst: 800,
  equipmentCostEst: 200,
  markupPercent: 15,
  overheadPercent: 10,
  tradeId: 'trade-1',
  sortOrder: 0
}

const mockTradesWithLineItems = [
  {
    ...mockTrade,
    lineItems: [
      mockLineItem,
      { ...mockLineItem, id: 'line-item-2', materialCostEst: 1500 }
    ]
  },
  {
    id: 'trade-2',
    name: 'Electrical',
    lineItems: [
      { ...mockLineItem, id: 'line-item-3', materialCostEst: 1000 }
    ]
  }
]

describe('POST /api/projects/[id]/trades/[tradeId]/line-items', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default successful auth
    mockPrisma.projectUser.findFirst.mockResolvedValue({
      userId: 'user-1',
      projectId: 'project-1'
    })
    
    // Setup existing trade
    mockPrisma.trade.findFirst.mockResolvedValue(mockTrade)
    
    // Setup line item creation
    mockPrisma.lineItem.create.mockResolvedValue(mockLineItem)
    mockPrisma.lineItem.count.mockResolvedValue(2) // Existing items count
    mockPrisma.lineItem.update.mockResolvedValue({
      ...mockLineItem,
      sortOrder: 2
    })
    
    // Setup trades with line items for budget calculation
    mockPrisma.trade.findMany.mockResolvedValue(mockTradesWithLineItems)
  })

  describe('Successful Line Item Creation', () => {
    it('should create line item successfully', async () => {
      const lineItemData = {
        description: 'Concrete pouring',
        quantity: 10,
        unit: 'm³',
        materialCostEst: 2000,
        laborCostEst: 800,
        equipmentCostEst: 200,
        markupPercent: 15,
        overheadPercent: 10
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: JSON.stringify(lineItemData),
        headers: { 'Content-Type': 'application/json' }
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      const response = await POST(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.lineItem).toEqual(expect.objectContaining({
        id: 'line-item-1',
        description: 'Concrete pouring',
        quantity: 10,
        unit: 'm³',
        materialCostEst: 2000,
        laborCostEst: 800,
        equipmentCostEst: 200,
        markupPercent: 15,
        overheadPercent: 10,
        tradeId: 'trade-1'
      }))
    })

    it('should set correct sort order for new item', async () => {
      const lineItemData = {
        description: 'New line item',
        quantity: 1,
        unit: 'ea',
        materialCostEst: 100,
        laborCostEst: 50,
        equipmentCostEst: 25,
        markupPercent: 15,
        overheadPercent: 10
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: JSON.stringify(lineItemData)
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      await POST(request, mockUser, { params })

      // Should create with sort order 0 initially
      expect(mockPrisma.lineItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sortOrder: 0
        })
      })

      // Then update to proper sort order (count of existing items)
      expect(mockPrisma.lineItem.update).toHaveBeenCalledWith({
        where: { id: 'line-item-1' },
        data: { sortOrder: 2 }
      })
    })

    it('should update project budget after creating line item', async () => {
      const lineItemData = {
        description: 'Budget update test',
        quantity: 5,
        unit: 'ea',
        materialCostEst: 200,
        laborCostEst: 100,
        equipmentCostEst: 50,
        markupPercent: 20,
        overheadPercent: 15
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: JSON.stringify(lineItemData)
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      await POST(request, mockUser, { params })

      // Should fetch all trades with line items for budget calculation
      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        include: { lineItems: true }
      })

      // Should update project with calculated total budget
      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: { totalBudget: expect.any(Number) }
      })
    })
  })

  describe('Authorization', () => {
    it('should allow ADMIN users without project access check', async () => {
      mockPrisma.projectUser.findFirst.mockResolvedValue(null) // No project access

      const lineItemData = {
        description: 'Admin test',
        quantity: 1,
        unit: 'ea',
        materialCostEst: 100
      }

      const adminUser = { ...mockUser, role: 'ADMIN' as const }
      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: JSON.stringify(lineItemData)
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      const response = await POST(request, adminUser, { params })

      expect(response.status).toBe(200)
    })

    it('should reject non-admin users without project access', async () => {
      mockPrisma.projectUser.findFirst.mockResolvedValue(null) // No project access

      const regularUser = { ...mockUser, role: 'USER' as const }
      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test', materialCostEst: 100 })
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      const response = await POST(request, regularUser, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toContain('You do not have access to this project')
    })

    it('should allow users with project access', async () => {
      const lineItemData = {
        description: 'User with access test',
        quantity: 1,
        unit: 'ea',
        materialCostEst: 100
      }

      const regularUser = { ...mockUser, role: 'USER' as const }
      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: JSON.stringify(lineItemData)
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      const response = await POST(request, regularUser, { params })

      expect(response.status).toBe(200)
    })
  })

  describe('Trade Validation', () => {
    it('should reject if trade does not exist', async () => {
      mockPrisma.trade.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/projects/project-1/trades/nonexistent-trade/line-items', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test', materialCostEst: 100 })
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'nonexistent-trade' })
      const response = await POST(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Trade not found or does not belong to this project')
    })

    it('should reject if trade belongs to different project', async () => {
      const wrongProjectTrade = {
        ...mockTrade,
        projectId: 'different-project'
      }
      mockPrisma.trade.findFirst.mockResolvedValue(wrongProjectTrade)

      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test', materialCostEst: 100 })
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      const response = await POST(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Trade not found or does not belong to this project')
    })
  })

  describe('Data Processing', () => {
    it('should parse numeric values correctly', async () => {
      const lineItemData = {
        description: 'Numeric parsing test',
        quantity: '5.5', // String numbers
        unit: 'kg',
        materialCostEst: '1500.75',
        laborCostEst: '800.25',
        equipmentCostEst: '200.50',
        markupPercent: '12.5',
        overheadPercent: '8.75'
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: JSON.stringify(lineItemData)
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      await POST(request, mockUser, { params })

      expect(mockPrisma.lineItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quantity: 5.5,
          materialCostEst: 1500.75,
          laborCostEst: 800.25,
          equipmentCostEst: 200.5,
          markupPercent: 12.5,
          overheadPercent: 8.75
        })
      })
    })

    it('should handle missing optional fields with defaults', async () => {
      const minimalData = {
        description: 'Minimal line item'
        // All other fields missing
      }

      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: JSON.stringify(minimalData)
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      await POST(request, mockUser, { params })

      expect(mockPrisma.lineItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'Minimal line item',
          quantity: 1, // Default
          unit: 'ea', // Default
          materialCostEst: 0, // Default
          laborCostEst: 0, // Default
          equipmentCostEst: 0, // Default
          markupPercent: 0, // Default
          overheadPercent: 0 // Default
        })
      })
    })
  })

  describe('Budget Calculation', () => {
    it('should calculate total budget correctly', async () => {
      // Mock trades with specific line items for predictable calculation
      const tradesForBudgetTest = [
        {
          id: 'trade-1',
          lineItems: [
            {
              materialCostEst: 1000,
              laborCostEst: 500,
              equipmentCostEst: 200,
              markupPercent: 20, // 20% of 1700 = 340
              overheadPercent: 10, // 10% of 1700 = 170
              quantity: 2 // Total: (1700 + 340 + 170) * 2 = 4420
            }
          ]
        },
        {
          id: 'trade-2',
          lineItems: [
            {
              materialCostEst: 800,
              laborCostEst: 400,
              equipmentCostEst: 100,
              markupPercent: 15, // 15% of 1300 = 195
              overheadPercent: 5, // 5% of 1300 = 65
              quantity: 1 // Total: 1300 + 195 + 65 = 1560
            }
          ]
        }
      ]
      // Expected total budget: 4420 + 1560 = 5980

      mockPrisma.trade.findMany.mockResolvedValue(tradesForBudgetTest)

      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Budget calculation test',
          materialCostEst: 100
        })
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      await POST(request, mockUser, { params })

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: { totalBudget: 5980 }
      })
    })

    it('should include calculated budget in response', async () => {
      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Response budget test',
          materialCostEst: 100
        })
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      const response = await POST(request, mockUser, { params })
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.totalBudget).toBeDefined()
      expect(typeof data.data.totalBudget).toBe('number')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors during creation', async () => {
      mockPrisma.lineItem.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Error test',
          materialCostEst: 100
        })
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      const response = await POST(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to add line item')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: 'invalid-json',
        headers: { 'Content-Type': 'application/json' }
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      const response = await POST(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to add line item')
    })

    it('should handle budget calculation errors gracefully', async () => {
      mockPrisma.trade.findMany.mockRejectedValue(new Error('Budget calculation failed'))

      const request = new NextRequest('http://localhost/api/projects/project-1/trades/trade-1/line-items', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Budget error test',
          materialCostEst: 100
        })
      })

      const params = Promise.resolve({ id: 'project-1', tradeId: 'trade-1' })
      const response = await POST(request, mockUser, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to add line item')
    })
  })
})