/**
 * Estimate vs Actual Widget for Dashboard
 * Shows detailed comparison of estimated costs vs actual invoiced amounts
 */

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface TradeComparison {
  tradeId: string
  tradeName: string
  estimatedAmount: number
  actualAmount: number
  variance: number
  variancePercent: number
  invoiceCount: number
  status: 'UNDER' | 'OVER' | 'ON_TARGET'
}

interface EstimateVsActualData {
  projectId: string
  projectName: string
  totalEstimated: number
  totalActual: number
  totalVariance: number
  totalVariancePercent: number
  currency: string
  tradeComparisons: TradeComparison[]
  lastUpdated: string
}

interface EstimateVsActualWidgetProps {
  projectId?: string
  compact?: boolean
  className?: string
}

export function EstimateVsActualWidget({
  projectId,
  compact = false,
  className = '',
}: EstimateVsActualWidgetProps) {
  const [data, setData] = useState<EstimateVsActualData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTradeId, setSelectedTradeId] = useState<string>('')

  useEffect(() => {
    if (projectId) {
      fetchEstimateVsActual()
    }
  }, [projectId])

  const fetchEstimateVsActual = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/estimate-vs-actual`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch estimate vs actual data')
      }
    } catch (err) {
      console.error('Estimate vs actual fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'NZD') => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600'
    if (variance < 0) return 'text-green-600'
    return 'text-gray-600'
  }

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <ArrowTrendingUpIcon className="h-4 w-4 text-red-500" />
    if (variance < 0) return <ArrowTrendingDownIcon className="h-4 w-4 text-green-500" />
    return null
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OVER':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Over Budget
          </span>
        )
      case 'UNDER':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Under Budget
          </span>
        )
      case 'ON_TARGET':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            On Target
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <Card.Header>
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Estimate vs Actual</h3>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </Card.Body>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className={className}>
        <Card.Header>
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Estimate vs Actual</h3>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="text-center py-6">
            <ExclamationTriangleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{error || 'No data available'}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={fetchEstimateVsActual}>
              Retry
            </Button>
          </div>
        </Card.Body>
      </Card>
    )
  }

  const visibleTrades = compact ? data.tradeComparisons.slice(0, 3) : data.tradeComparisons

  return (
    <Card className={className}>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Estimate vs Actual</h3>
          </div>
          <div className="text-xs text-gray-500">
            Updated {new Date(data.lastUpdated).toLocaleDateString()}
          </div>
        </div>

        {/* Project Summary */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm text-gray-500">Total Estimated</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(data.totalEstimated, data.currency)}
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-sm text-gray-500">Total Actual</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(data.totalActual, data.currency)}
            </div>
          </div>

          <div
            className={`rounded-lg p-3 ${data.totalVariance > 0 ? 'bg-red-50' : data.totalVariance < 0 ? 'bg-green-50' : 'bg-gray-50'}`}
          >
            <div className="text-sm text-gray-500">Variance</div>
            <div
              className={`text-lg font-semibold flex items-center space-x-1 ${getVarianceColor(data.totalVariance)}`}
            >
              {getVarianceIcon(data.totalVariance)}
              <span>{formatCurrency(Math.abs(data.totalVariance), data.currency)}</span>
              <span className="text-sm">
                ({data.totalVariancePercent >= 0 ? '+' : ''}
                {data.totalVariancePercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Trade Breakdown</h4>
            {compact && data.tradeComparisons.length > 3 && (
              <span className="text-xs text-gray-500">
                Showing {visibleTrades.length} of {data.tradeComparisons.length}
              </span>
            )}
          </div>

          {visibleTrades.map(trade => (
            <div
              key={trade.tradeId}
              className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{trade.tradeName}</p>
                  {getStatusBadge(trade.status)}
                </div>

                <div className="flex items-center space-x-4 mt-1">
                  <div className="text-xs text-gray-500">
                    Est: {formatCurrency(trade.estimatedAmount, data.currency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Act: {formatCurrency(trade.actualAmount, data.currency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {trade.invoiceCount} invoice{trade.invoiceCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div
                  className={`text-sm font-medium flex items-center space-x-1 ${getVarianceColor(trade.variance)}`}
                >
                  {getVarianceIcon(trade.variance)}
                  <span>{formatCurrency(Math.abs(trade.variance), data.currency)}</span>
                  <span className="text-xs">
                    ({trade.variancePercent >= 0 ? '+' : ''}
                    {trade.variancePercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          ))}

          {compact && data.tradeComparisons.length > 3 && (
            <div className="pt-3 border-t border-gray-200">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                icon={<EyeIcon className="h-4 w-4" />}
                onClick={() => (window.location.href = `/estimates?project=${data.projectId}`)}
              >
                View Full Breakdown
              </Button>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  )
}
