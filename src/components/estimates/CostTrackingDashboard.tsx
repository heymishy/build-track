/**
 * Cost Tracking Dashboard
 * Compare estimated costs vs actual invoiced costs by trade
 */

'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BuildingOffice2Icon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

interface Trade {
  id: string
  name: string
  description?: string
  sortOrder: number
  lineItems: LineItem[]
  actualSpent: number
  estimatedTotal: number
  remainingBudget: number
  percentSpent: number
  variance: number
  variancePercent: number
  status: 'under_budget' | 'on_budget' | 'over_budget' | 'no_estimate'
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
  totalEstimate: number
  actualSpent: number
  percentComplete: number
}

interface ProjectCostSummary {
  totalEstimated: number
  totalActual: number
  totalVariance: number
  variancePercent: number
  totalRemaining: number
  tradesOnBudget: number
  tradesOverBudget: number
  tradesUnderBudget: number
  percentComplete: number
}

interface CostTrackingDashboardProps {
  projectId: string
  className?: string
}

export function CostTrackingDashboard({ projectId, className = '' }: CostTrackingDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [summary, setSummary] = useState<ProjectCostSummary | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')

  useEffect(() => {
    fetchCostData()
  }, [projectId])

  const fetchCostData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/cost-tracking`)
      const data = await response.json()

      if (data.success) {
        setTrades(data.trades)
        setSummary(data.summary)
      } else {
        setError(data.error || 'Failed to fetch cost data')
      }
    } catch (err) {
      setError('Failed to fetch cost tracking data')
      console.error('Cost tracking fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount)
  }

  const getVarianceColor = (variance: number, variancePercent: number) => {
    if (Math.abs(variancePercent) <= 5) return 'text-green-600'
    if (variance > 0) return 'text-red-600'
    return 'text-blue-600'
  }

  const getStatusIcon = (status: Trade['status']) => {
    switch (status) {
      case 'under_budget':
        return <ArrowTrendingDownIcon className="h-5 w-5 text-blue-600" />
      case 'on_budget':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'over_budget':
        return <ArrowTrendingUpIcon className="h-5 w-5 text-red-600" />
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = (status: Trade['status']) => {
    switch (status) {
      case 'under_budget': return 'Under Budget'
      case 'on_budget': return 'On Budget'
      case 'over_budget': return 'Over Budget'
      case 'no_estimate': return 'No Estimate'
    }
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Cost Data</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchCostData}
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
            <ChartBarIcon className="h-6 w-6 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Cost Tracking</h2>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 py-1 text-sm rounded-md ${
                viewMode === 'overview'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1 text-sm rounded-md ${
                viewMode === 'detailed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      {summary && (
        <div className="px-6 py-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Estimated</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(summary.totalEstimated)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Actual</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(summary.totalActual)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Variance</p>
              <p className={`text-lg font-semibold ${getVarianceColor(summary.totalVariance, summary.variancePercent)}`}>
                {summary.totalVariance >= 0 ? '+' : ''}{formatCurrency(summary.totalVariance)}
                <span className="text-sm ml-1">
                  ({summary.variancePercent >= 0 ? '+' : ''}{summary.variancePercent.toFixed(1)}%)
                </span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(summary.totalRemaining)}
              </p>
            </div>
          </div>

          {/* Status Summary */}
          <div className="mt-4 flex justify-center space-x-6">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">On Budget: {summary.tradesOnBudget}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Over Budget: {summary.tradesOverBudget}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Under Budget: {summary.tradesUnderBudget}</span>
            </div>
          </div>
        </div>
      )}

      {/* Trades List */}
      <div className="px-6 py-4">
        {trades.length === 0 ? (
          <div className="text-center py-8">
            <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Trade Data</h3>
            <p className="mt-1 text-sm text-gray-500">
              Import a project estimate to start tracking costs by trade.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {trades.map((trade) => (
              <div key={trade.id} className="border border-gray-200 rounded-lg p-4">
                
                {/* Trade Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    {getStatusIcon(trade.status)}
                    <h3 className="ml-2 text-lg font-medium text-gray-900">{trade.name}</h3>
                    <span className="ml-2 text-sm text-gray-500">
                      ({getStatusText(trade.status)})
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {trade.percentSpent.toFixed(1)}% of budget used
                    </p>
                  </div>
                </div>

                {/* Trade Summary */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Estimated</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(trade.estimatedTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Actual</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(trade.actualSpent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Variance</p>
                    <p className={`text-sm font-medium ${getVarianceColor(trade.variance, trade.variancePercent)}`}>
                      {trade.variance >= 0 ? '+' : ''}{formatCurrency(trade.variance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(trade.remainingBudget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Line Items</p>
                    <p className="text-sm font-medium text-gray-900">
                      {trade.lineItems.length}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      trade.status === 'over_budget'
                        ? 'bg-red-500'
                        : trade.status === 'on_budget'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(trade.percentSpent, 100)}%` }}
                  ></div>
                </div>

                {/* Detailed View */}
                {viewMode === 'detailed' && trade.lineItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Line Items</h4>
                    <div className="space-y-2">
                      {trade.lineItems.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <div className="flex-1">
                            <p className="text-gray-900">{item.description}</p>
                            <p className="text-gray-500">
                              {item.quantity} {item.unit}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-900">{formatCurrency(item.totalEstimate)}</p>
                            <p className="text-gray-500">est.</p>
                          </div>
                        </div>
                      ))}
                      {trade.lineItems.length > 5 && (
                        <p className="text-sm text-gray-500 text-center">
                          +{trade.lineItems.length - 5} more items
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}