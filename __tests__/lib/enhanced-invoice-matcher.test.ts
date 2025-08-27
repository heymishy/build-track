/**
 * Test Suite for EnhancedInvoiceMatchingService
 * Testing ML-powered invoice matching with pattern learning and caching
 */

import { EnhancedInvoiceMatchingService } from '@/lib/enhanced-invoice-matcher'

// Mock dependencies
jest.mock('@/lib/simple-llm-matcher', () => ({
  matchInvoiceLineItems: jest.fn(),
}))

const mockInvoices = [
  {
    id: 'invoice-1',
    invoiceNumber: 'INV-001',
    vendor: 'ABC Construction',
    total: 5000,
    date: '2024-01-15',
    lineItems: [
      {
        id: 'line-1',
        description: 'Concrete for foundation',
        amount: 2500,
        quantity: 10,
        unit: 'm³'
      },
      {
        id: 'line-2',
        description: 'Rebar steel',
        amount: 1500,
        quantity: 500,
        unit: 'kg'
      }
    ],
    projectId: 'project-1',
    status: 'PENDING',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 'invoice-2',
    invoiceNumber: 'INV-002',
    vendor: 'XYZ Materials',
    total: 3000,
    date: '2024-01-20',
    lineItems: [
      {
        id: 'line-3',
        description: 'Electrical wiring',
        amount: 2000,
        quantity: 100,
        unit: 'm'
      }
    ],
    projectId: 'project-1',
    status: 'PENDING',
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z'
  }
]

const mockEstimates = [
  {
    id: 'estimate-1',
    description: 'Foundation concrete work',
    quantity: 10,
    unit: 'm³',
    materialCostEst: 2400,
    laborCostEst: 800,
    equipmentCostEst: 200,
    markupPercent: 15,
    overheadPercent: 10,
    tradeId: 'trade-1',
    sortOrder: 1
  },
  {
    id: 'estimate-2',
    description: 'Reinforcement steel',
    quantity: 500,
    unit: 'kg',
    materialCostEst: 1400,
    laborCostEst: 300,
    equipmentCostEst: 100,
    markupPercent: 15,
    overheadPercent: 10,
    tradeId: 'trade-1',
    sortOrder: 2
  },
  {
    id: 'estimate-3',
    description: 'Electrical installation',
    quantity: 100,
    unit: 'm',
    materialCostEst: 1800,
    laborCostEst: 500,
    equipmentCostEst: 100,
    markupPercent: 15,
    overheadPercent: 10,
    tradeId: 'trade-2',
    sortOrder: 1
  }
]

describe('EnhancedInvoiceMatchingService', () => {
  let service: EnhancedInvoiceMatchingService
  let mockLLMMatcher: jest.Mocked<any>

  beforeEach(() => {
    service = new EnhancedInvoiceMatchingService()
    mockLLMMatcher = require('@/lib/simple-llm-matcher')
    jest.clearAllMocks()
  })

  describe('Bulk Matching', () => {
    it('should process multiple invoices efficiently', async () => {
      mockLLMMatcher.matchInvoiceLineItems.mockResolvedValue({
        success: true,
        matches: [
          { invoiceLineId: 'line-1', estimateId: 'estimate-1', confidence: 0.95, method: 'llm' },
          { invoiceLineId: 'line-2', estimateId: 'estimate-2', confidence: 0.90, method: 'llm' },
          { invoiceLineId: 'line-3', estimateId: 'estimate-3', confidence: 0.88, method: 'llm' }
        ],
        reasoning: 'Matched based on description similarity and unit compatibility'
      })

      const result = await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')

      expect(result.success).toBe(true)
      expect(result.totalInvoices).toBe(2)
      expect(result.totalLineItems).toBe(3)
      expect(result.matchedItems).toBe(3)
      expect(result.averageConfidence).toBeGreaterThan(0.85)
    })

    it('should handle partial LLM failures with logic fallback', async () => {
      mockLLMMatcher.matchInvoiceLineItems
        .mockResolvedValueOnce({
          success: true,
          matches: [
            { invoiceLineId: 'line-1', estimateId: 'estimate-1', confidence: 0.95, method: 'llm' }
          ],
          reasoning: 'Partial LLM matching'
        })
        .mockRejectedValueOnce(new Error('LLM service unavailable'))

      const result = await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')

      expect(result.success).toBe(true)
      expect(result.matchedItems).toBeGreaterThan(0) // Should have some matches from fallback
      expect(result.processingDetails.llmAttempts).toBe(2)
      expect(result.processingDetails.llmFailures).toBe(1)
    })

    it('should learn from successful patterns', async () => {
      mockLLMMatcher.matchInvoiceLineItems.mockResolvedValue({
        success: true,
        matches: [
          { invoiceLineId: 'line-1', estimateId: 'estimate-1', confidence: 0.95, method: 'llm' }
        ],
        reasoning: 'High confidence match'
      })

      await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')

      // Verify pattern learning occurred
      const patterns = service.getLearnedPatterns()
      expect(patterns.size).toBeGreaterThan(0)
    })
  })

  describe('Pattern Learning', () => {
    it('should store successful matching patterns', async () => {
      mockLLMMatcher.matchInvoiceLineItems.mockResolvedValue({
        success: true,
        matches: [
          { invoiceLineId: 'line-1', estimateId: 'estimate-1', confidence: 0.95, method: 'llm' }
        ],
        reasoning: 'Pattern match'
      })

      await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')

      const patterns = service.getLearnedPatterns()
      expect(patterns.size).toBeGreaterThan(0)
      
      const pattern = Array.from(patterns.values())[0]
      expect(pattern.successCount).toBe(1)
      expect(pattern.averageConfidence).toBe(0.95)
    })

    it('should improve confidence over time for repeated patterns', async () => {
      const matchResponse = {
        success: true,
        matches: [
          { invoiceLineId: 'line-1', estimateId: 'estimate-1', confidence: 0.95, method: 'llm' }
        ],
        reasoning: 'Repeated pattern'
      }

      mockLLMMatcher.matchInvoiceLineItems.mockResolvedValue(matchResponse)

      // First match
      await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')
      
      // Second match with same pattern
      await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')

      const patterns = service.getLearnedPatterns()
      const pattern = Array.from(patterns.values())[0]
      expect(pattern.successCount).toBe(2)
    })

    it('should use learned patterns for faster matching', async () => {
      // First, establish a pattern
      mockLLMMatcher.matchInvoiceLineItems.mockResolvedValue({
        success: true,
        matches: [
          { invoiceLineId: 'line-1', estimateId: 'estimate-1', confidence: 0.95, method: 'llm' }
        ],
        reasoning: 'Initial pattern'
      })

      await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')

      // Clear mock to verify pattern usage
      mockLLMMatcher.matchInvoiceLineItems.mockClear()

      // Second matching should use learned patterns
      const result = await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')

      expect(result.processingDetails.patternsUsed).toBeGreaterThan(0)
    })
  })

  describe('Caching', () => {
    it('should cache LLM results for identical inputs', async () => {
      mockLLMMatcher.matchInvoiceLineItems.mockResolvedValue({
        success: true,
        matches: [
          { invoiceLineId: 'line-1', estimateId: 'estimate-1', confidence: 0.95, method: 'llm' }
        ],
        reasoning: 'Cached result'
      })

      // First call
      await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')
      expect(mockLLMMatcher.matchInvoiceLineItems).toHaveBeenCalledTimes(1)

      // Second call with same inputs should use cache
      await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')
      expect(mockLLMMatcher.matchInvoiceLineItems).toHaveBeenCalledTimes(1) // No additional calls
    })

    it('should bypass cache for different inputs', async () => {
      mockLLMMatcher.matchInvoiceLineItems.mockResolvedValue({
        success: true,
        matches: [],
        reasoning: 'Different inputs'
      })

      const differentEstimates = [
        { ...mockEstimates[0], id: 'estimate-different', description: 'Different estimate' }
      ]

      await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')
      await service.bulkMatchInvoices(mockInvoices, differentEstimates, 'project-1')

      expect(mockLLMMatcher.matchInvoiceLineItems).toHaveBeenCalledTimes(2)
    })
  })

  describe('Logic-Based Fallback', () => {
    it('should use string similarity when LLM fails', async () => {
      mockLLMMatcher.matchInvoiceLineItems.mockRejectedValue(new Error('LLM unavailable'))

      const result = await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')

      expect(result.success).toBe(true)
      expect(result.processingDetails.logicMatches).toBeGreaterThan(0)
      expect(result.processingDetails.llmFailures).toBe(1)
    })

    it('should match based on description similarity', async () => {
      mockLLMMatcher.matchInvoiceLineItems.mockRejectedValue(new Error('LLM unavailable'))

      const result = await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')

      // Should find some matches based on string similarity
      expect(result.matches.some(match => 
        match.invoiceLineId === 'line-1' && match.estimateId === 'estimate-1'
      )).toBe(true)
    })

    it('should consider unit compatibility in fallback', async () => {
      mockLLMMatcher.matchInvoiceLineItems.mockRejectedValue(new Error('LLM unavailable'))

      const result = await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')

      // Find the concrete match (both use m³)
      const concreteMatch = result.matches.find(match => 
        match.invoiceLineId === 'line-1' && match.estimateId === 'estimate-1'
      )

      expect(concreteMatch?.confidence).toBeGreaterThan(0.5) // Should have reasonable confidence
    })
  })

  describe('Performance Optimization', () => {
    it('should process large batches efficiently', async () => {
      // Create a large dataset
      const largeInvoices = Array.from({ length: 100 }, (_, i) => ({
        ...mockInvoices[0],
        id: `invoice-${i}`,
        lineItems: [{ ...mockInvoices[0].lineItems[0], id: `line-${i}` }]
      }))

      mockLLMMatcher.matchInvoiceLineItems.mockResolvedValue({
        success: true,
        matches: largeInvoices.map((_, i) => ({
          invoiceLineId: `line-${i}`,
          estimateId: 'estimate-1',
          confidence: 0.8,
          method: 'llm' as const
        })),
        reasoning: 'Batch processing test'
      })

      const startTime = Date.now()
      const result = await service.bulkMatchInvoices(largeInvoices, mockEstimates, 'project-1')
      const duration = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      expect(result.processingDetails.batchSize).toBe(largeInvoices.length)
    })

    it('should batch LLM calls efficiently', async () => {
      mockLLMMatcher.matchInvoiceLineItems.mockResolvedValue({
        success: true,
        matches: [
          { invoiceLineId: 'line-1', estimateId: 'estimate-1', confidence: 0.95, method: 'llm' }
        ],
        reasoning: 'Batched call'
      })

      await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1', {
        batchSize: 10
      })

      // Should make minimal LLM calls due to batching
      expect(mockLLMMatcher.matchInvoiceLineItems).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle complete LLM failure gracefully', async () => {
      mockLLMMatcher.matchInvoiceLineItems.mockRejectedValue(new Error('Complete LLM failure'))

      const result = await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')

      expect(result.success).toBe(true) // Should still succeed with fallback
      expect(result.processingDetails.llmFailures).toBeGreaterThan(0)
      expect(result.processingDetails.logicMatches).toBeGreaterThan(0)
    })

    it('should validate input data', async () => {
      const invalidInvoices = [{ ...mockInvoices[0], lineItems: [] }] // No line items

      const result = await service.bulkMatchInvoices(invalidInvoices, mockEstimates, 'project-1')

      expect(result.success).toBe(true)
      expect(result.totalLineItems).toBe(0)
      expect(result.matchedItems).toBe(0)
    })

    it('should handle empty estimates gracefully', async () => {
      const result = await service.bulkMatchInvoices(mockInvoices, [], 'project-1')

      expect(result.success).toBe(true)
      expect(result.matchedItems).toBe(0)
      expect(result.unmatchedItems).toBe(3) // All 3 line items unmatched
    })
  })

  describe('Performance Metrics', () => {
    it('should track processing performance', async () => {
      mockLLMMatcher.matchInvoiceLineItems.mockResolvedValue({
        success: true,
        matches: [
          { invoiceLineId: 'line-1', estimateId: 'estimate-1', confidence: 0.95, method: 'llm' }
        ],
        reasoning: 'Performance test'
      })

      const result = await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')

      expect(result.processingDetails.processingTimeMs).toBeGreaterThan(0)
      expect(result.processingDetails.averageTimePerItem).toBeGreaterThan(0)
      expect(result.processingDetails.throughputItemsPerSecond).toBeGreaterThan(0)
    })

    it('should report method distribution', async () => {
      mockLLMMatcher.matchInvoiceLineItems
        .mockResolvedValueOnce({
          success: true,
          matches: [
            { invoiceLineId: 'line-1', estimateId: 'estimate-1', confidence: 0.95, method: 'llm' }
          ],
          reasoning: 'LLM match'
        })
        .mockRejectedValueOnce(new Error('LLM failed'))

      const result = await service.bulkMatchInvoices(mockInvoices, mockEstimates, 'project-1')

      expect(result.processingDetails.llmMatches).toBeGreaterThan(0)
      expect(result.processingDetails.logicMatches).toBeGreaterThan(0)
      expect(result.processingDetails.patternsUsed).toBeGreaterThanOrEqual(0)
    })
  })
})