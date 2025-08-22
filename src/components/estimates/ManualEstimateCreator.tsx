/**
 * Manual Estimate Creator
 * Modern UI for creating project estimates from scratch with flexible input options
 */

'use client'

import { useState, useEffect } from 'react'
import {
  PlusIcon,
  TrashIcon,
  CalculatorIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  ArrowsUpDownIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

// Types
interface TradeRate {
  id: string
  tradeName: string
  skillLevel: 'Apprentice' | 'Journeyman' | 'Foreman' | 'Specialist'
  hourlyRate: number
  markupPercent: number
}

interface LineItem {
  id: string
  description: string
  category: 'Material' | 'Labor' | 'Equipment' | 'Subcontractor'
  
  // Flexible input types
  inputType: 'fixed' | 'hourly' | 'quantity'
  
  // Fixed cost
  fixedCost?: number
  
  // Hourly labor
  tradeRateId?: string
  hours?: number
  
  // Quantity-based
  quantity?: number
  unit?: string
  unitCost?: number
  
  // Additional costs
  markupPercent: number
  overheadPercent: number
  
  // Calculated fields
  subtotal: number
  total: number
  tradeName: string
}

interface Trade {
  id: string
  name: string
  color: string
  lineItems: LineItem[]
  total: number
}

interface ManualEstimateCreatorProps {
  projectId?: string
  onSave: (estimate: any) => void
  onCancel: () => void
}

// Default trade rates
const DEFAULT_TRADE_RATES: TradeRate[] = [
  { id: 'concrete-apprentice', tradeName: 'Concrete', skillLevel: 'Apprentice', hourlyRate: 28, markupPercent: 15 },
  { id: 'concrete-journeyman', tradeName: 'Concrete', skillLevel: 'Journeyman', hourlyRate: 45, markupPercent: 15 },
  { id: 'plumbing-journeyman', tradeName: 'Plumbing', skillLevel: 'Journeyman', hourlyRate: 55, markupPercent: 20 },
  { id: 'electrical-journeyman', tradeName: 'Electrical', skillLevel: 'Journeyman', hourlyRate: 58, markupPercent: 20 },
  { id: 'carpentry-journeyman', tradeName: 'Carpentry', skillLevel: 'Journeyman', hourlyRate: 48, markupPercent: 18 },
  { id: 'painting-journeyman', tradeName: 'Painting', skillLevel: 'Journeyman', hourlyRate: 42, markupPercent: 15 },
]

// Color schemes for trades
const TRADE_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200', 
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-red-100 text-red-800 border-red-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
]

export function ManualEstimateCreator({ projectId, onSave, onCancel }: ManualEstimateCreatorProps) {
  const [projectName, setProjectName] = useState('')
  const [trades, setTrades] = useState<Trade[]>([])
  const [tradeRates, setTradeRates] = useState<TradeRate[]>(DEFAULT_TRADE_RATES)
  const [showAddTrade, setShowAddTrade] = useState(false)
  const [newTradeName, setNewTradeName] = useState('')
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null)
  
  // Add initial trade if none exist
  useEffect(() => {
    if (trades.length === 0) {
      addTrade('General')
    }
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount)
  }

  const addTrade = (name: string) => {
    const newTrade: Trade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      color: TRADE_COLORS[trades.length % TRADE_COLORS.length],
      lineItems: [],
      total: 0
    }
    setTrades([...trades, newTrade])
    setNewTradeName('')
    setShowAddTrade(false)
  }

  const deleteTrade = (tradeId: string) => {
    setTrades(trades.filter(t => t.id !== tradeId))
  }

  const addLineItem = (tradeId: string) => {
    const newLineItem: LineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: '',
      category: 'Labor',
      inputType: 'fixed',
      fixedCost: 0,
      markupPercent: 0,
      overheadPercent: 0,
      subtotal: 0,
      total: 0,
      tradeName: trades.find(t => t.id === tradeId)?.name || 'General'
    }

    setTrades(trades.map(trade => 
      trade.id === tradeId 
        ? { ...trade, lineItems: [...trade.lineItems, newLineItem] }
        : trade
    ))
  }

  const updateLineItem = (tradeId: string, itemId: string, updates: Partial<LineItem>) => {
    setTrades(trades.map(trade => 
      trade.id === tradeId 
        ? {
            ...trade,
            lineItems: trade.lineItems.map(item =>
              item.id === itemId ? { ...item, ...updates } : item
            )
          }
        : trade
    ))
  }

  const deleteLineItem = (tradeId: string, itemId: string) => {
    setTrades(trades.map(trade => 
      trade.id === tradeId 
        ? { ...trade, lineItems: trade.lineItems.filter(item => item.id !== itemId) }
        : trade
    ))
  }

  const calculateLineItemTotal = (item: LineItem): number => {
    let subtotal = 0

    switch (item.inputType) {
      case 'fixed':
        subtotal = item.fixedCost || 0
        break
      case 'hourly':
        const rate = tradeRates.find(r => r.id === item.tradeRateId)
        if (rate && item.hours) {
          subtotal = rate.hourlyRate * item.hours
        }
        break
      case 'quantity':
        if (item.quantity && item.unitCost) {
          subtotal = item.quantity * item.unitCost
        }
        break
    }

    const markup = subtotal * (item.markupPercent / 100)
    const overhead = subtotal * (item.overheadPercent / 100)
    
    return subtotal + markup + overhead
  }

  // Recalculate totals when trades change
  useEffect(() => {
    setTrades(trades.map(trade => ({
      ...trade,
      lineItems: trade.lineItems.map(item => ({
        ...item,
        subtotal: item.inputType === 'hourly' && item.tradeRateId && item.hours
          ? (tradeRates.find(r => r.id === item.tradeRateId)?.hourlyRate || 0) * item.hours
          : item.inputType === 'quantity' && item.quantity && item.unitCost
          ? item.quantity * item.unitCost
          : item.fixedCost || 0,
        total: calculateLineItemTotal(item)
      })),
      total: trade.lineItems.reduce((sum, item) => sum + calculateLineItemTotal(item), 0)
    })))
  }, [tradeRates])

  const getTotalByCategory = (category: string) => {
    return trades.reduce((total, trade) => 
      total + trade.lineItems
        .filter(item => item.category === category)
        .reduce((sum, item) => sum + item.total, 0), 0
    )
  }

  const getGrandTotal = () => {
    return trades.reduce((sum, trade) => sum + trade.total, 0)
  }

  const handleSave = () => {
    // Convert to ParsedEstimate format for consistency
    const estimate = {
      projectName,
      totalBudget: getGrandTotal(),
      currency: 'NZD',
      trades: trades.map((trade, index) => ({
        name: trade.name,
        description: `${trade.name} work items`,
        lineItems: trade.lineItems.map(item => ({
          itemCode: item.id,
          description: item.description,
          quantity: item.quantity || 1,
          unit: item.unit || 'each',
          materialCost: item.category === 'Material' ? item.total : 0,
          laborCost: item.category === 'Labor' ? item.total : 0,
          equipmentCost: item.category === 'Equipment' ? item.total : 0,
          markupPercent: item.markupPercent,
          overheadPercent: item.overheadPercent,
          totalCost: item.total,
          tradeName: trade.name,
          category: item.category
        })),
        totalMaterialCost: trade.lineItems.filter(i => i.category === 'Material').reduce((sum, i) => sum + i.total, 0),
        totalLaborCost: trade.lineItems.filter(i => i.category === 'Labor').reduce((sum, i) => sum + i.total, 0),
        totalEquipmentCost: trade.lineItems.filter(i => i.category === 'Equipment').reduce((sum, i) => sum + i.total, 0),
        totalCost: trade.total,
        sortOrder: index
      })),
      summary: {
        totalTrades: trades.length,
        totalLineItems: trades.reduce((sum, trade) => sum + trade.lineItems.length, 0),
        totalMaterialCost: getTotalByCategory('Material'),
        totalLaborCost: getTotalByCategory('Labor'),
        totalEquipmentCost: getTotalByCategory('Equipment'),
        grandTotal: getGrandTotal()
      },
      metadata: {
        source: 'manual' as const,
        filename: `${projectName || 'Manual Estimate'}.manual`,
        parseDate: new Date().toISOString(),
        rowCount: trades.reduce((sum, trade) => sum + trade.lineItems.length, 0)
      }
    }

    onSave(estimate)
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Create Project Estimate</h1>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
            >
              Save Estimate
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500">Total Estimate</div>
            <div className="text-3xl font-bold text-gray-900">
              {formatCurrency(getGrandTotal())}
            </div>
          </div>
        </div>
      </div>

      {/* Category Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Cost Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Material', 'Labor', 'Equipment', 'Subcontractor'].map((category) => {
            const total = getTotalByCategory(category)
            return (
              <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">{category}</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(total)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Trades */}
      <div className="space-y-4">
        {trades.map((trade) => (
          <div key={trade.id} className={`bg-white rounded-lg shadow border-l-4 ${trade.color.replace('bg-', 'border-').replace('-100', '-500')}`}>
            {/* Trade Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-medium text-gray-900">{trade.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${trade.color}`}>
                    {trade.lineItems.length} items
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(trade.total)}
                  </span>
                  <button
                    onClick={() => addLineItem(trade.id)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                    title="Add line item"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                  {trades.length > 1 && (
                    <button
                      onClick={() => deleteTrade(trade.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Delete trade"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="p-4 space-y-3">
              {trade.lineItems.map((item) => (
                <LineItemEditor
                  key={item.id}
                  item={item}
                  tradeRates={tradeRates}
                  onUpdate={(updates) => updateLineItem(trade.id, item.id, updates)}
                  onDelete={() => deleteLineItem(trade.id, item.id)}
                />
              ))}

              {trade.lineItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CalculatorIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>No line items yet</p>
                  <button
                    onClick={() => addLineItem(trade.id)}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Add your first item
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Trade Button */}
        <div className="bg-white rounded-lg shadow p-4">
          {!showAddTrade ? (
            <button
              onClick={() => setShowAddTrade(true)}
              className="w-full flex items-center justify-center py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Trade Category
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={newTradeName}
                onChange={(e) => setNewTradeName(e.target.value)}
                placeholder="Trade name (e.g., Plumbing, Electrical)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTradeName.trim()) {
                    addTrade(newTradeName.trim())
                  } else if (e.key === 'Escape') {
                    setShowAddTrade(false)
                    setNewTradeName('')
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => newTradeName.trim() && addTrade(newTradeName.trim())}
                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={!newTradeName.trim()}
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setShowAddTrade(false)
                  setNewTradeName('')
                }}
                className="p-2 bg-gray-300 text-gray-600 rounded-md hover:bg-gray-400"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Line Item Editor Component
interface LineItemEditorProps {
  item: LineItem
  tradeRates: TradeRate[]
  onUpdate: (updates: Partial<LineItem>) => void
  onDelete: () => void
}

function LineItemEditor({ item, tradeRates, onUpdate, onDelete }: LineItemEditorProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount)
  }

  const calculateTotal = () => {
    let subtotal = 0

    switch (item.inputType) {
      case 'fixed':
        subtotal = item.fixedCost || 0
        break
      case 'hourly':
        const rate = tradeRates.find(r => r.id === item.tradeRateId)
        if (rate && item.hours) {
          subtotal = rate.hourlyRate * item.hours
        }
        break
      case 'quantity':
        if (item.quantity && item.unitCost) {
          subtotal = item.quantity * item.unitCost
        }
        break
    }

    const markup = subtotal * (item.markupPercent / 100)
    const overhead = subtotal * (item.overheadPercent / 100)
    
    return subtotal + markup + overhead
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      {/* First row: Description and Category */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <input
            type="text"
            value={item.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Line item description"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <select
            value={item.category}
            onChange={(e) => onUpdate({ category: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Material">Material</option>
            <option value="Labor">Labor</option>
            <option value="Equipment">Equipment</option>
            <option value="Subcontractor">Subcontractor</option>
          </select>
        </div>
      </div>

      {/* Second row: Input type and cost details */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
        {/* Input Type Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Input Type</label>
          <select
            value={item.inputType}
            onChange={(e) => onUpdate({ inputType: e.target.value as any })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fixed">Fixed $</option>
            <option value="hourly">Hourly</option>
            <option value="quantity">Quantity</option>
          </select>
        </div>

        {/* Cost Input Fields */}
        {item.inputType === 'fixed' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fixed Cost</label>
            <input
              type="number"
              value={item.fixedCost || ''}
              onChange={(e) => onUpdate({ fixedCost: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {item.inputType === 'hourly' && (
          <>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Trade Rate</label>
              <select
                value={item.tradeRateId || ''}
                onChange={(e) => onUpdate({ tradeRateId: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select rate</option>
                {tradeRates.map(rate => (
                  <option key={rate.id} value={rate.id}>
                    {rate.tradeName} - {rate.skillLevel} (${rate.hourlyRate}/hr)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hours</label>
              <input
                type="number"
                value={item.hours || ''}
                onChange={(e) => onUpdate({ hours: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                step="0.5"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {item.inputType === 'quantity' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={item.quantity || ''}
                onChange={(e) => onUpdate({ quantity: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                value={item.unit || ''}
                onChange={(e) => onUpdate({ unit: e.target.value })}
                placeholder="each"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Unit Cost</label>
              <input
                type="number"
                value={item.unitCost || ''}
                onChange={(e) => onUpdate({ unitCost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {/* Total and Delete */}
        <div className="flex items-center justify-between">
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">
              {formatCurrency(calculateTotal())}
            </div>
          </div>
          <button
            onClick={onDelete}
            className="p-1 text-red-600 hover:text-red-800"
            title="Delete item"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Third row: Markup and Overhead (optional, collapsible) */}
      {(item.markupPercent > 0 || item.overheadPercent > 0) && (
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Markup %</label>
            <input
              type="number"
              value={item.markupPercent || ''}
              onChange={(e) => onUpdate({ markupPercent: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Overhead %</label>
            <input
              type="number"
              value={item.overheadPercent || ''}
              onChange={(e) => onUpdate({ overheadPercent: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}