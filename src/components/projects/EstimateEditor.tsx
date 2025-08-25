/**
 * Excel-like Estimate Editor
 * Multi-row editable project estimate view with add/split/remove functionality
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline'

interface EstimateLineItem {
  id?: string
  tradeId: string
  tradeName: string
  itemCode?: string | null
  description: string
  quantity: number
  unit: string
  materialCostEst: number
  laborCostEst: number
  equipmentCostEst: number
  markupPercent: number
  overheadPercent: number
  sortOrder: number
  isNew?: boolean
  isEditing?: boolean
  subtotal?: number
  markup?: number
  overhead?: number
  total?: number
}

interface Trade {
  id: string
  name: string
  sortOrder: number
}

interface ProjectTotals {
  materialCost: number
  laborCost: number
  equipmentCost: number
  subtotal: number
  markup: number
  overhead: number
  total: number
}

interface EstimateEditorProps {
  projectId: string
  className?: string
}

export default function EstimateEditor({ projectId, className = '' }: EstimateEditorProps) {
  const [items, setItems] = useState<EstimateLineItem[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsedTrades, setCollapsedTrades] = useState<Set<string>>(new Set())
  const [pendingOperations, setPendingOperations] = useState<any[]>([])
  const [projectTotals, setProjectTotals] = useState<ProjectTotals>({
    materialCost: 0,
    laborCost: 0,
    equipmentCost: 0,
    subtotal: 0,
    markup: 0,
    overhead: 0,
    total: 0,
  })

  const tableRef = useRef<HTMLTableElement>(null)

  // Common units for construction estimates
  const commonUnits = [
    'each', 'item', 'pcs', 'qty', 
    'm', 'm2', 'm3', 'mm', 'cm', 'km',
    'ft', 'ft2', 'ft3', 'in', 'yd',
    'kg', 'g', 't', 'lb', 'oz',
    'hrs', 'days', 'weeks', 'months',
    'lf', 'sf', 'cf', 'ls', 'lot'
  ]

  const fetchEstimates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [estimatesRes, tradesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/trades`),
        fetch(`/api/projects/${projectId}/trades`),
      ])

      if (!estimatesRes.ok || !tradesRes.ok) {
        throw new Error('Failed to fetch project data')
      }

      const [estimatesData, tradesData] = await Promise.all([
        estimatesRes.json(),
        tradesRes.json(),
      ])

      if (estimatesData.success && tradesData.success) {
        // Flatten line items with trade information
        const lineItems: EstimateLineItem[] = []
        
        for (const trade of estimatesData.data) {
          for (const item of trade.lineItems || []) {
            const lineItem: EstimateLineItem = {
              id: item.id,
              tradeId: trade.id,
              tradeName: trade.name,
              itemCode: item.itemCode,
              description: item.description,
              quantity: Number(item.quantity),
              unit: item.unit,
              materialCostEst: Number(item.materialCostEst),
              laborCostEst: Number(item.laborCostEst),
              equipmentCostEst: Number(item.equipmentCostEst),
              markupPercent: Number(item.markupPercent),
              overheadPercent: Number(item.overheadPercent),
              sortOrder: item.sortOrder,
            }
            
            // Calculate totals
            const subtotal = lineItem.materialCostEst + lineItem.laborCostEst + lineItem.equipmentCostEst
            lineItem.subtotal = subtotal
            lineItem.markup = subtotal * (lineItem.markupPercent / 100)
            lineItem.overhead = subtotal * (lineItem.overheadPercent / 100)
            lineItem.total = subtotal + lineItem.markup + lineItem.overhead
            
            lineItems.push(lineItem)
          }
        }

        setItems(lineItems)
        setTrades(tradesData.data || [])
        calculateProjectTotals(lineItems)
      } else {
        throw new Error(estimatesData.error || tradesData.error || 'Failed to load data')
      }
    } catch (err) {
      console.error('Fetch estimates error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load estimates')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchEstimates()
  }, [fetchEstimates])

  const calculateProjectTotals = (lineItems: EstimateLineItem[]) => {
    const totals = lineItems.reduce(
      (acc, item) => {
        acc.materialCost += item.materialCostEst * item.quantity
        acc.laborCost += item.laborCostEst * item.quantity
        acc.equipmentCost += item.equipmentCostEst * item.quantity
        
        const subtotal = (item.materialCostEst + item.laborCostEst + item.equipmentCostEst) * item.quantity
        const markup = subtotal * (item.markupPercent / 100)
        const overhead = subtotal * (item.overheadPercent / 100)
        
        acc.subtotal += subtotal
        acc.markup += markup
        acc.overhead += overhead
        acc.total += subtotal + markup + overhead
        
        return acc
      },
      {
        materialCost: 0,
        laborCost: 0,
        equipmentCost: 0,
        subtotal: 0,
        markup: 0,
        overhead: 0,
        total: 0,
      }
    )
    setProjectTotals(totals)
  }

  const updateItem = (index: number, field: keyof EstimateLineItem, value: any) => {
    setItems(prevItems => {
      const newItems = [...prevItems]
      const item = { ...newItems[index] }
      
      // Update the field
      ;(item as any)[field] = value
      
      // Recalculate totals if relevant fields changed
      if (['materialCostEst', 'laborCostEst', 'equipmentCostEst', 'markupPercent', 'overheadPercent', 'quantity'].includes(field)) {
        const subtotal = item.materialCostEst + item.laborCostEst + item.equipmentCostEst
        item.subtotal = subtotal
        item.markup = subtotal * (item.markupPercent / 100)
        item.overhead = subtotal * (item.overheadPercent / 100)
        item.total = subtotal + item.markup + item.overhead
      }
      
      newItems[index] = item
      calculateProjectTotals(newItems)
      return newItems
    })
  }

  const addNewRow = (afterIndex?: number, tradeId?: string) => {
    const insertIndex = afterIndex !== undefined ? afterIndex + 1 : items.length
    const defaultTradeId = tradeId || (trades.length > 0 ? trades[0].id : '')
    const tradeName = trades.find(t => t.id === defaultTradeId)?.name || ''
    
    const newItem: EstimateLineItem = {
      tradeId: defaultTradeId,
      tradeName,
      itemCode: null,
      description: '',
      quantity: 1,
      unit: 'each',
      materialCostEst: 0,
      laborCostEst: 0,
      equipmentCostEst: 0,
      markupPercent: 15,
      overheadPercent: 10,
      sortOrder: insertIndex,
      isNew: true,
      isEditing: true,
      subtotal: 0,
      markup: 0,
      overhead: 0,
      total: 0,
    }

    setItems(prevItems => {
      const newItems = [...prevItems]
      newItems.splice(insertIndex, 0, newItem)
      
      // Update sort orders
      newItems.forEach((item, idx) => {
        item.sortOrder = idx
      })
      
      return newItems
    })
  }

  const removeRow = (index: number) => {
    setItems(prevItems => {
      const newItems = prevItems.filter((_, idx) => idx !== index)
      
      // Update sort orders
      newItems.forEach((item, idx) => {
        item.sortOrder = idx
      })
      
      calculateProjectTotals(newItems)
      return newItems
    })
  }

  const splitRow = (index: number) => {
    const originalItem = items[index]
    if (!originalItem) return

    const splitQuantity = Math.ceil(originalItem.quantity / 2)
    const remainingQuantity = originalItem.quantity - splitQuantity

    // Create first split item
    const firstItem: EstimateLineItem = {
      ...originalItem,
      quantity: splitQuantity,
      description: `${originalItem.description} (Part 1)`,
      isNew: true,
      isEditing: true,
    }

    // Create second split item  
    const secondItem: EstimateLineItem = {
      ...originalItem,
      id: undefined, // Remove ID so it gets treated as new
      quantity: remainingQuantity,
      description: `${originalItem.description} (Part 2)`,
      isNew: true,
      isEditing: true,
    }

    setItems(prevItems => {
      const newItems = [...prevItems]
      
      // Replace original with split items
      newItems.splice(index, 1, firstItem, secondItem)
      
      // Update sort orders
      newItems.forEach((item, idx) => {
        item.sortOrder = idx
      })
      
      calculateProjectTotals(newItems)
      return newItems
    })
  }

  const saveChanges = async () => {
    try {
      setSaving(true)
      setError(null)

      // Build operations array
      const operations = []

      for (const item of items) {
        if (item.isNew) {
          operations.push({
            action: 'create',
            data: {
              tradeId: item.tradeId,
              itemCode: item.itemCode,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              materialCostEst: item.materialCostEst,
              laborCostEst: item.laborCostEst,
              equipmentCostEst: item.equipmentCostEst,
              markupPercent: item.markupPercent,
              overheadPercent: item.overheadPercent,
              sortOrder: item.sortOrder,
            },
          })
        } else if (item.id) {
          operations.push({
            action: 'update',
            data: {
              id: item.id,
              tradeId: item.tradeId,
              itemCode: item.itemCode,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              materialCostEst: item.materialCostEst,
              laborCostEst: item.laborCostEst,
              equipmentCostEst: item.equipmentCostEst,
              markupPercent: item.markupPercent,
              overheadPercent: item.overheadPercent,
              sortOrder: item.sortOrder,
            },
          })
        }
      }

      if (operations.length === 0) {
        return // No changes to save
      }

      const response = await fetch(`/api/projects/${projectId}/estimates/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations }),
      })

      const result = await response.json()

      if (result.success) {
        // Refresh data to get updated IDs and clean state
        await fetchEstimates()
      } else {
        setError(result.error || 'Failed to save changes')
      }
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const toggleTradeCollapse = (tradeId: string) => {
    setCollapsedTrades(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tradeId)) {
        newSet.delete(tradeId)
      } else {
        newSet.add(tradeId)
      }
      return newSet
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const hasUnsavedChanges = items.some(item => item.isNew || item.isEditing)

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center">
          <XMarkIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Estimates</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchEstimates}
            className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Group items by trade
  const itemsByTrade = items.reduce((acc, item) => {
    if (!acc[item.tradeId]) {
      acc[item.tradeId] = []
    }
    acc[item.tradeId].push(item)
    return acc
  }, {} as Record<string, EstimateLineItem[]>)

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CalculatorIcon className="h-5 w-5 mr-2 text-blue-500" />
              Project Estimates
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Excel-like editor for project cost estimates
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-orange-600">Unsaved changes</span>
            )}
            
            <button
              onClick={() => addNewRow()}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Row
            </button>
            
            {hasUnsavedChanges && (
              <button
                onClick={saveChanges}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckIcon className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Project Totals Summary */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-xs text-gray-500">Material</div>
            <div className="text-sm font-medium">{formatCurrency(projectTotals.materialCost)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Labor</div>
            <div className="text-sm font-medium">{formatCurrency(projectTotals.laborCost)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Equipment</div>
            <div className="text-sm font-medium">{formatCurrency(projectTotals.equipmentCost)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Subtotal</div>
            <div className="text-sm font-medium">{formatCurrency(projectTotals.subtotal)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Markup</div>
            <div className="text-sm font-medium">{formatCurrency(projectTotals.markup)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Overhead</div>
            <div className="text-sm font-medium">{formatCurrency(projectTotals.overhead)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 font-medium">Total</div>
            <div className="text-lg font-bold text-blue-600">{formatCurrency(projectTotals.total)}</div>
          </div>
        </div>
      </div>

      {/* Estimate Table */}
      <div className="overflow-x-auto">
        <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                Actions
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trade
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-64">
                Description
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Qty
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Unit
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Material
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Labor
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Equipment
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Markup %
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Overhead %
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trades.map(trade => {
              const tradeItems = itemsByTrade[trade.id] || []
              const isCollapsed = collapsedTrades.has(trade.id)

              return (
                <React.Fragment key={trade.id}>
                  {/* Trade Header Row */}
                  <tr className="bg-gray-100">
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleTradeCollapse(trade.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {isCollapsed ? (
                          <ChevronRightIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td colSpan={11} className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{trade.name}</span>
                        <button
                          onClick={() => addNewRow(undefined, trade.id)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Add item to {trade.name}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Trade Items */}
                  {!isCollapsed && tradeItems.map((item, itemIndex) => {
                    const globalIndex = items.findIndex(i => i === item)
                    
                    return (
                      <EstimateRow
                        key={item.id || `new-${globalIndex}`}
                        item={item}
                        index={globalIndex}
                        trades={trades}
                        commonUnits={commonUnits}
                        onUpdate={updateItem}
                        onRemove={removeRow}
                        onSplit={splitRow}
                        onAddAfter={() => addNewRow(globalIndex, trade.id)}
                        formatCurrency={formatCurrency}
                      />
                    )
                  })}
                </React.Fragment>
              )
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan={12} className="px-6 py-12 text-center">
                  <div className="text-gray-400">
                    <CalculatorIcon className="mx-auto h-12 w-12 mb-4" />
                    <p className="text-sm">No estimate line items yet</p>
                    <button
                      onClick={() => addNewRow()}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Add your first estimate line item
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Individual estimate row component
interface EstimateRowProps {
  item: EstimateLineItem
  index: number
  trades: Trade[]
  commonUnits: string[]
  onUpdate: (index: number, field: keyof EstimateLineItem, value: any) => void
  onRemove: (index: number) => void
  onSplit: (index: number) => void
  onAddAfter: () => void
  formatCurrency: (amount: number) => string
}

function EstimateRow({
  item,
  index,
  trades,
  commonUnits,
  onUpdate,
  onRemove,
  onSplit,
  onAddAfter,
  formatCurrency,
}: EstimateRowProps) {
  const renderEditableCell = (
    field: keyof EstimateLineItem,
    value: any,
    type: 'text' | 'number' | 'select' = 'text',
    options?: any[]
  ) => {
    if (type === 'select') {
      return (
        <select
          value={value || ''}
          onChange={e => onUpdate(index, field, e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {options?.map(option => (
            <option key={option.id || option} value={option.id || option}>
              {option.name || option}
            </option>
          ))}
        </select>
      )
    }

    if (type === 'number') {
      return (
        <input
          type="number"
          value={value || ''}
          onChange={e => onUpdate(index, field, parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          step="0.01"
        />
      )
    }

    return (
      <input
        type="text"
        value={value || ''}
        onChange={e => onUpdate(index, field, e.target.value)}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    )
  }

  return (
    <tr className={`hover:bg-gray-50 ${item.isNew ? 'bg-blue-50' : ''}`}>
      {/* Actions */}
      <td className="px-3 py-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={onAddAfter}
            className="text-green-600 hover:text-green-800"
            title="Add row after"
          >
            <PlusIcon className="h-3 w-3" />
          </button>
          <button
            onClick={() => onSplit(index)}
            className="text-blue-600 hover:text-blue-800"
            title="Split row"
          >
            <DocumentDuplicateIcon className="h-3 w-3" />
          </button>
          <button
            onClick={() => onRemove(index)}
            className="text-red-600 hover:text-red-800"
            title="Remove row"
          >
            <TrashIcon className="h-3 w-3" />
          </button>
        </div>
      </td>

      {/* Trade */}
      <td className="px-3 py-2">
        {renderEditableCell('tradeId', item.tradeId, 'select', trades)}
      </td>

      {/* Item Code */}
      <td className="px-3 py-2">
        {renderEditableCell('itemCode', item.itemCode, 'text')}
      </td>

      {/* Description */}
      <td className="px-3 py-2">
        {renderEditableCell('description', item.description, 'text')}
      </td>

      {/* Quantity */}
      <td className="px-3 py-2">
        {renderEditableCell('quantity', item.quantity, 'number')}
      </td>

      {/* Unit */}
      <td className="px-3 py-2">
        {renderEditableCell('unit', item.unit, 'select', commonUnits)}
      </td>

      {/* Material Cost */}
      <td className="px-3 py-2">
        {renderEditableCell('materialCostEst', item.materialCostEst, 'number')}
      </td>

      {/* Labor Cost */}
      <td className="px-3 py-2">
        {renderEditableCell('laborCostEst', item.laborCostEst, 'number')}
      </td>

      {/* Equipment Cost */}
      <td className="px-3 py-2">
        {renderEditableCell('equipmentCostEst', item.equipmentCostEst, 'number')}
      </td>

      {/* Markup % */}
      <td className="px-3 py-2">
        {renderEditableCell('markupPercent', item.markupPercent, 'number')}
      </td>

      {/* Overhead % */}
      <td className="px-3 py-2">
        {renderEditableCell('overheadPercent', item.overheadPercent, 'number')}
      </td>

      {/* Total (calculated, read-only) */}
      <td className="px-3 py-2 text-right font-medium">
        {formatCurrency((item.total || 0) * item.quantity)}
      </td>
    </tr>
  )
}