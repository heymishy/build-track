/**
 * Enhanced Cost Tracking Dashboard
 * Provides detailed estimate vs invoice tracking with category and line item breakdown
 */

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { ProjectSelector } from '@/components/projects/ProjectSelector'
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalculatorIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

interface LineItemTracking {
  id: string
  description: string
  trade: string
  estimatedCost: number
  actualCost: number
  variance: number
  variancePercent: number
  invoiceCount: number
  unit: string
  quantity: number
}

interface TradeTracking {
  name: string
  estimatedCost: number
  actualCost: number
  variance: number
  variancePercent: number
  lineItemCount: number
  invoiceCount: number
  lineItems: LineItemTracking[]
}

interface ProjectCostTracking {
  projectId: string
  projectName: string
  totalBudget: number
  totalEstimatedCost: number
  totalActualCost: number
  totalVariance: number
  totalVariancePercent: number
  currency: string
  completionPercent: number
  trades: TradeTracking[]
  overallStatus: 'ON_BUDGET' | 'OVER_BUDGET' | 'UNDER_BUDGET' | 'AT_RISK'
  lastUpdated: string
}

interface EnhancedCostTrackingProps {
  projectId?: string
  showProjectSelector?: boolean
  className?: string
  onProjectChange?: (projectId: string) => void
}

export function EnhancedCostTrackingDashboard({
  projectId: initialProjectId,
  showProjectSelector = true,
  className = '',
  onProjectChange,
}: EnhancedCostTrackingProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || 'all')
  const [trackingData, setTrackingData] = useState<ProjectCostTracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'line-items'>('summary')

  useEffect(() => {
    fetchEnhancedCostTracking()
  }, [selectedProjectId])

  const fetchEnhancedCostTracking = async () => {
    try {
      setLoading(true)
      setError(null)

      // Determine the URL based on selected project
      const url =
        selectedProjectId === 'all'
          ? '/api/analytics/cost-tracking?enhanced=true'
          : `/api/projects/${selectedProjectId}/cost-tracking?enhanced=true`

      const response = await fetch(url, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch enhanced cost tracking data')
      }

      const result = await response.json()
      if (result.success) {
        // Handle both single project and multiple projects data
        if (selectedProjectId === 'all' && Array.isArray(result.data)) {
          // For now, show the first project if multiple, or aggregate data
          // TODO: Implement proper multi-project view
          setTrackingData(result.data[0] || null)
        } else {
          setTrackingData(result.data)
        }
      } else {
        throw new Error(result.error || 'Failed to load cost tracking data')
      }
    } catch (err) {
      console.error('Enhanced cost tracking fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load cost tracking data')
    } finally {
      setLoading(false)
    }
  }

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId)
    onProjectChange?.(projectId)
  }

  const toggleTradeExpansion = (tradeName: string) => {
    const newExpanded = new Set(expandedTrades)
    if (newExpanded.has(tradeName)) {
      newExpanded.delete(tradeName)
    } else {
      newExpanded.add(tradeName)
    }
    setExpandedTrades(newExpanded)
  }

  const formatCurrency = (amount: number, currency: string = 'NZD') => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const getVarianceColor = (variance: number, variancePercent: number) => {
    if (Math.abs(variancePercent) < 5) return 'text-gray-600' // Within 5% tolerance
    if (variance > 0) return 'text-red-600' // Over budget
    return 'text-green-600' // Under budget
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_BUDGET':
        return 'bg-green-100 text-green-800'
      case 'UNDER_BUDGET':
        return 'bg-blue-100 text-blue-800'
      case 'OVER_BUDGET':
        return 'bg-red-100 text-red-800'
      case 'AT_RISK':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadge = (status: string) => {
    const colorClass = getStatusColor(status)
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
      >
        {status.replace('_', ' ')}
      </span>
    )
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (error || !trackingData) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-red-400 mb-2" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            {error ? 'Error Loading Data' : 'No Project Selected'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {error || 'Please select a project to view cost tracking data.'}
          </p>
          {error && (
            <button
              onClick={fetchEnhancedCostTracking}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Retry
            </button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Project Selector */}
      {showProjectSelector && (
        <div className="mb-6">
          <ProjectSelector
            selectedProjectId={selectedProjectId}
            onProjectChange={handleProjectChange}
            includeAllOption={false}
            label="Select Project for Cost Tracking"
            showCreateOption={false}
          />
        </div>
      )}

      {trackingData && (
        <div className="space-y-6">
          {/* Project Overview Header */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{trackingData.projectName}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Cost Tracking • Last updated:{' '}
                  {new Date(trackingData.lastUpdated).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(trackingData.overallStatus)}
                <span className="text-sm text-gray-500">
                  {trackingData.completionPercent}% Complete
                </span>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CalculatorIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Total Budget</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {formatCurrency(trackingData.totalBudget, trackingData.currency)}
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <ChartBarIcon className="h-5 w-5 text-blue-400 mr-2" />
                  <span className="text-sm text-gray-600">Estimated Cost</span>
                </div>
                <p className="text-2xl font-semibold text-blue-900 mt-1">
                  {formatCurrency(trackingData.totalEstimatedCost, trackingData.currency)}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-green-400 mr-2" />
                  <span className="text-sm text-gray-600">Actual Invoiced</span>
                </div>
                <p className="text-2xl font-semibold text-green-900 mt-1">
                  {formatCurrency(trackingData.totalActualCost, trackingData.currency)}
                </p>
              </div>

              <div
                className={`p-4 rounded-lg ${trackingData.totalVariance > 0 ? 'bg-red-50' : 'bg-green-50'}`}
              >
                <div className="flex items-center">
                  {trackingData.totalVariance > 0 ? (
                    <ArrowTrendingUpIcon className="h-5 w-5 text-red-400 mr-2" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-5 w-5 text-green-400 mr-2" />
                  )}
                  <span className="text-sm text-gray-600">Variance</span>
                </div>
                <p
                  className={`text-2xl font-semibold mt-1 ${trackingData.totalVariance > 0 ? 'text-red-900' : 'text-green-900'}`}
                >
                  {trackingData.totalVariance > 0 ? '+' : ''}
                  {formatCurrency(trackingData.totalVariance, trackingData.currency)}
                </p>
                <p
                  className={`text-sm mt-1 ${trackingData.totalVariance > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {trackingData.totalVariancePercent > 0 ? '+' : ''}
                  {trackingData.totalVariancePercent.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Budget Utilization</span>
                <span className="text-sm text-gray-900">
                  {((trackingData.totalActualCost / trackingData.totalBudget) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    trackingData.totalVariance > 0
                      ? 'bg-red-500'
                      : trackingData.totalActualCost / trackingData.totalBudget > 0.9
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min((trackingData.totalActualCost / trackingData.totalBudget) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </Card>

          {/* View Mode Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">View:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'summary', label: 'Summary' },
                { key: 'detailed', label: 'By Trade' },
                { key: 'line-items', label: 'Line Items' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Trade Breakdown */}
          <div className="space-y-4">
            {trackingData.trades.map(trade => (
              <Card key={trade.name} className="overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleTradeExpansion(trade.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {expandedTrades.has(trade.name) ? (
                        <ChevronDownIcon className="h-5 w-5 text-gray-400 mr-2" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-gray-400 mr-2" />
                      )}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{trade.name}</h3>
                        <p className="text-sm text-gray-500">
                          {trade.lineItemCount} line items • {trade.invoiceCount} invoices
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center space-x-4 text-sm">
                        <div>
                          <span className="text-gray-500">Est: </span>
                          <span className="font-medium text-blue-600">
                            {formatCurrency(trade.estimatedCost, trackingData.currency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Actual: </span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(trade.actualCost, trackingData.currency)}
                          </span>
                        </div>
                        <div
                          className={`font-medium ${getVarianceColor(trade.variance, trade.variancePercent)}`}
                        >
                          {trade.variance > 0 ? '+' : ''}
                          {formatCurrency(Math.abs(trade.variance), trackingData.currency)}
                        </div>
                      </div>
                      <div
                        className={`text-xs mt-1 ${getVarianceColor(trade.variance, trade.variancePercent)}`}
                      >
                        {trade.variancePercent > 0 ? '+' : ''}
                        {trade.variancePercent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Line Items */}
                {expandedTrades.has(trade.name) && viewMode !== 'summary' && (
                  <div className="border-t bg-gray-50">
                    <div className="p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Line Items</h4>
                      <div className="space-y-2">
                        {trade.lineItems.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between py-2 px-3 bg-white rounded border"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {item.description}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.quantity} {item.unit} • {item.invoiceCount} invoice(s)
                              </p>
                            </div>
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="text-right">
                                <div className="text-blue-600">
                                  {formatCurrency(item.estimatedCost, trackingData.currency)}
                                </div>
                                <div className="text-xs text-gray-500">estimated</div>
                              </div>
                              <div className="text-right">
                                <div className="text-green-600">
                                  {formatCurrency(item.actualCost, trackingData.currency)}
                                </div>
                                <div className="text-xs text-gray-500">invoiced</div>
                              </div>
                              <div
                                className={`text-right font-medium ${getVarianceColor(item.variance, item.variancePercent)}`}
                              >
                                <div>
                                  {item.variance > 0 ? '+' : ''}
                                  {formatCurrency(Math.abs(item.variance), trackingData.currency)}
                                </div>
                                <div className="text-xs">
                                  {item.variancePercent > 0 ? '+' : ''}
                                  {item.variancePercent.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
