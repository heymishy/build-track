/**
 * Estimate Manager Component
 * Manage estimates for existing projects - view, edit, re-import
 */

'use client'

import { useState, useEffect } from 'react'
import {
  DocumentArrowUpIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalculatorIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { EstimateCreationModal } from './EstimateCreationModal'
import { AddLineItemModal } from './AddLineItemModal'

interface Trade {
  id: string
  name: string
  description?: string
  sortOrder: number
  lineItems: LineItem[]
}

interface LineItem {
  id: string
  description: string
  quantity: number
  unit: string
  materialCostEst: number
  laborCostEst: number
  equipmentCostEst: number
  markupPercent: number
  overheadPercent: number
}

interface EstimateManagerProps {
  projectId: string
  className?: string
}

export function EstimateManager({ projectId, className = '' }: EstimateManagerProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddLineItemModal, setShowAddLineItemModal] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchTrades()
  }, [projectId])

  const fetchTrades = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/trades`)
      const data = await response.json()

      if (data.success) {
        setTrades(data.trades || [])
      } else {
        setError(data.error || 'Failed to fetch trades')
      }
    } catch (err) {
      setError('Failed to fetch estimate data')
      console.error('Estimate fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleImportComplete = () => {
    setShowImportModal(false)
    fetchTrades() // Refresh trades after import
  }

  const handleAddLineItemComplete = () => {
    setShowAddLineItemModal(false)
    fetchTrades() // Refresh trades after adding line item
  }

  const handleDeleteEstimate = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/estimates/${projectId}/delete`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setTrades([])
        setShowDeleteConfirm(false)
        // Show success message or toast
      } else {
        setError(data.error || 'Failed to delete estimate data')
      }
    } catch (err) {
      setError('Failed to delete estimate data')
      console.error('Delete estimate error:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount)
  }

  const getLineItemCategory = (item: LineItem) => {
    const materialCost = Number(item.materialCostEst) || 0
    const laborCost = Number(item.laborCostEst) || 0
    const equipmentCost = Number(item.equipmentCostEst) || 0

    // Check if it's a mixed item (has significant amounts in multiple categories)
    const nonZeroCosts = [materialCost > 0, laborCost > 0, equipmentCost > 0].filter(Boolean).length

    if (nonZeroCosts > 1) {
      return 'Mixed'
    }

    // Single category items
    if (materialCost > laborCost && materialCost > equipmentCost) return 'Material'
    if (laborCost > materialCost && laborCost > equipmentCost) return 'Labor'
    if (equipmentCost > materialCost && equipmentCost > laborCost) return 'Equipment'

    return 'Other'
  }

  const getPrimaryCostAndCategory = (item: LineItem) => {
    const materialCost = Number(item.materialCostEst) || 0
    const laborCost = Number(item.laborCostEst) || 0
    const equipmentCost = Number(item.equipmentCostEst) || 0
    const markupPercent = Number(item.markupPercent) || 0
    const overheadPercent = Number(item.overheadPercent) || 0

    const baseTotal = materialCost + laborCost + equipmentCost
    const markup = baseTotal * (markupPercent / 100)
    const overhead = baseTotal * (overheadPercent / 100)
    const totalCost = baseTotal + markup + overhead

    const category = getLineItemCategory(item)

    return { totalCost, category, materialCost, laborCost, equipmentCost }
  }

  const calculateTradeTotal = (trade: Trade) => {
    return trade.lineItems.reduce((total, item) => {
      // Ensure all values are numbers
      const materialCost = Number(item.materialCostEst) || 0
      const laborCost = Number(item.laborCostEst) || 0
      const equipmentCost = Number(item.equipmentCostEst) || 0
      const markupPercent = Number(item.markupPercent) || 0
      const overheadPercent = Number(item.overheadPercent) || 0

      const baseTotal = materialCost + laborCost + equipmentCost
      const markup = baseTotal * (markupPercent / 100)
      const overhead = baseTotal * (overheadPercent / 100)
      return total + baseTotal + markup + overhead
    }, 0)
  }

  const calculateProjectTotal = () => {
    return trades.reduce((total, trade) => total + calculateTradeTotal(trade), 0)
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Estimates</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchTrades}
            className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CalculatorIcon className="h-6 w-6 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Project Estimates</h2>
            {trades.length > 0 && (
              <span className="ml-3 text-sm text-gray-500">
                Total: {formatCurrency(calculateProjectTotal())}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'summary' ? 'detailed' : 'summary')}
              className="px-3 py-1 text-sm rounded-md text-gray-500 hover:text-gray-700"
            >
              {viewMode === 'summary' ? 'Detailed View' : 'Summary View'}
            </button>
            {trades.length > 0 && (
              <>
                <button
                  onClick={() => setShowAddLineItemModal(true)}
                  className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Line Item
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete All
                </button>
              </>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {trades.length > 0 ? 'Import More' : 'Create'} Estimate
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {trades.length === 0 ? (
          <div className="text-center py-8">
            <CalculatorIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Estimates Yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Import an estimate file to start tracking project costs.
            </p>
            <button
              onClick={() => setShowImportModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Estimate
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show all line items in a single flat list, grouped by trade */}
            {viewMode === 'detailed' ? (
              /* Detailed View - Show all line items in flat list */
              <div className="space-y-1">
                {trades.flatMap(trade =>
                  trade.lineItems.map(item => {
                    const { totalCost, category, materialCost, laborCost, equipmentCost } =
                      getPrimaryCostAndCategory(item)
                    const quantity = Number(item.quantity) || 0
                    const isMixed = category === 'Mixed'

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm hover:bg-gray-100"
                      >
                        <div className="flex-1">
                          <span className="text-gray-900 font-medium">{item.description}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            {quantity > 1 ? `${quantity} ${item.unit}` : item.unit}
                          </span>
                          <span
                            className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                              category === 'Material'
                                ? 'bg-blue-100 text-blue-800'
                                : category === 'Labor'
                                  ? 'bg-green-100 text-green-800'
                                  : category === 'Equipment'
                                    ? 'bg-orange-100 text-orange-800'
                                    : category === 'Mixed'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {category}
                          </span>
                          <span className="ml-2 text-xs text-gray-400">{trade.name}</span>
                        </div>

                        {/* Show breakdown only for mixed items */}
                        {isMixed && (
                          <div className="text-xs text-gray-600 mr-4">
                            {materialCost > 0 && (
                              <span className="mr-2">M: {formatCurrency(materialCost)}</span>
                            )}
                            {laborCost > 0 && (
                              <span className="mr-2">L: {formatCurrency(laborCost)}</span>
                            )}
                            {equipmentCost > 0 && (
                              <span className="mr-2">E: {formatCurrency(equipmentCost)}</span>
                            )}
                          </div>
                        )}

                        <div className="text-right">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(totalCost)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              /* Summary View - Show trade summaries */
              <div className="space-y-2">
                {trades.map(trade => {
                  const materialTotal = trade.lineItems.reduce(
                    (sum, item) => sum + (Number(item.materialCostEst) || 0),
                    0
                  )
                  const laborTotal = trade.lineItems.reduce(
                    (sum, item) => sum + (Number(item.laborCostEst) || 0),
                    0
                  )
                  const equipmentTotal = trade.lineItems.reduce(
                    (sum, item) => sum + (Number(item.equipmentCostEst) || 0),
                    0
                  )
                  const primaryCategory =
                    materialTotal > 0
                      ? 'Material'
                      : laborTotal > 0
                        ? 'Labor'
                        : equipmentTotal > 0
                          ? 'Equipment'
                          : 'Other'

                  return (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between py-2 px-3 bg-white border border-gray-200 rounded text-sm"
                    >
                      <div className="flex-1">
                        <span className="text-gray-900 font-medium">{trade.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {trade.lineItems.length} {trade.lineItems.length === 1 ? 'item' : 'items'}
                        </span>
                        <span
                          className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                            primaryCategory === 'Material'
                              ? 'bg-blue-100 text-blue-800'
                              : primaryCategory === 'Labor'
                                ? 'bg-green-100 text-green-800'
                                : primaryCategory === 'Equipment'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {primaryCategory}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(calculateTradeTotal(trade))}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Estimate Creation Modal */}
      <EstimateCreationModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onComplete={handleImportComplete}
        projectId={projectId}
        allowCreateProject={false}
      />

      {/* Add Line Item Modal */}
      <AddLineItemModal
        isOpen={showAddLineItemModal}
        onClose={() => setShowAddLineItemModal(false)}
        onComplete={handleAddLineItemComplete}
        projectId={projectId}
        trades={trades}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Delete All Estimate Data</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete all {trades.length} trades and their line items from this
              project. The total budget of {formatCurrency(calculateProjectTotal())} will be reset
              to $0.00. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEstimate}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
