/**
 * Invoice Category Summary Component
 * Displays invoice line items categorized by trade with LLM-powered auto-categorization
 */

'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface TradeSummary {
  tradeId: string
  tradeName: string
  itemCount: number
  totalAmount: number
  averageConfidence?: number
  items: {
    description: string
    amount: number
    confidence?: number
    reasoning?: string
    category: 'MATERIAL' | 'LABOR' | 'EQUIPMENT' | 'OTHER'
  }[]
}

interface CategorizationStats {
  totalItems: number
  categorizedItems: number
  averageConfidence: number
  usedAI: boolean
  cost: number
  provider: string
}

interface InvoiceCategorySummaryProps {
  invoiceId: string
  projectId: string
  className?: string
  onCategorize?: () => void
}

export function InvoiceCategorySummary({
  invoiceId,
  projectId,
  className = '',
  onCategorize,
}: InvoiceCategorySummaryProps) {
  const [tradeSummary, setTradeSummary] = useState<TradeSummary[]>([])
  const [stats, setStats] = useState<CategorizationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [categorizing, setCategorizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null)
  const [totalAmount, setTotalAmount] = useState(0)
  const [supplierName, setSupplierName] = useState('')

  useEffect(() => {
    fetchCategorizationSummary()
  }, [invoiceId, projectId])

  const fetchCategorizationSummary = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/invoices/categorize?invoiceId=${invoiceId}&projectId=${projectId}`
      )
      const data = await response.json()

      if (data.success) {
        setTradeSummary(data.data.tradeSummary || [])
        setTotalAmount(data.data.totalAmount || 0)
        setSupplierName(data.data.supplierName || '')
      } else {
        setError(data.error || 'Failed to load categorization summary')
      }
    } catch (err) {
      setError('Failed to load categorization summary')
      console.error('Categorization summary error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAutoCategorize = async (
    provider: 'anthropic' | 'openai' | 'gemini' = 'anthropic'
  ) => {
    try {
      setCategorizing(true)
      setError(null)

      const response = await fetch('/api/invoices/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          projectId,
          useAI: true,
          provider,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTradeSummary(data.data.tradeSummary)
        setStats(data.data.stats)
        onCategorize?.()
      } else {
        setError(data.error || 'Categorization failed')
      }
    } catch (err) {
      setError('Categorization failed')
      console.error('Auto-categorization error:', err)
    } finally {
      setCategorizing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MATERIAL':
        return '🏗️'
      case 'LABOR':
        return '👷'
      case 'EQUIPMENT':
        return '⚙️'
      default:
        return '📋'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <Card.Body className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </Card.Body>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <Card.Body className="p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Summary</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchCategorizationSummary} variant="secondary">
            Try Again
          </Button>
        </Card.Body>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Auto-Categorize */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Invoice Category Summary</h3>
              <p className="text-sm text-gray-500">
                {supplierName} • {formatCurrency(totalAmount)}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {stats && (
                <div className="text-xs text-gray-500 mr-4">
                  <div>
                    AI: {stats.usedAI ? 'Yes' : 'No'} • Confidence:{' '}
                    {(stats.averageConfidence * 100).toFixed(0)}%
                  </div>
                  {stats.cost > 0 && <div>Cost: ${stats.cost.toFixed(4)}</div>}
                </div>
              )}
              <Button
                onClick={() => handleAutoCategorize('anthropic')}
                disabled={categorizing}
                size="sm"
                className="flex items-center"
              >
                {categorizing ? (
                  <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <SparklesIcon className="h-4 w-4 mr-1" />
                )}
                {categorizing ? 'Categorizing...' : 'Auto-Categorize'}
              </Button>
            </div>
          </div>
        </Card.Header>

        {tradeSummary.length === 0 ? (
          <Card.Body className="p-6 text-center">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Categorization Available</h3>
            <p className="text-sm text-gray-500 mb-4">
              Click "Auto-Categorize" to automatically categorize invoice line items using AI.
            </p>
          </Card.Body>
        ) : (
          <Card.Body className="p-0">
            {/* Summary Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trade Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % of Invoice
                    </th>
                    {stats?.usedAI && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confidence
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tradeSummary.map(trade => {
                    const percentage = totalAmount > 0 ? (trade.totalAmount / totalAmount) * 100 : 0
                    const isExpanded = expandedTrade === trade.tradeId

                    return (
                      <>
                        <tr key={trade.tradeId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {trade.tradeName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="secondary">
                              {trade.itemCount} item{trade.itemCount !== 1 ? 's' : ''}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(trade.totalAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500 w-12">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          {stats?.usedAI && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {trade.averageConfidence !== undefined && (
                                <Badge
                                  className={getConfidenceColor(trade.averageConfidence)}
                                  variant="secondary"
                                >
                                  {(trade.averageConfidence * 100).toFixed(0)}%
                                </Badge>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setExpandedTrade(isExpanded ? null : trade.tradeId)}
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              {isExpanded ? 'Hide' : 'View'} Items
                            </Button>
                          </td>
                        </tr>

                        {/* Expanded Row - Item Details */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={stats?.usedAI ? 6 : 5} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">
                                  {trade.tradeName} Line Items
                                </h4>
                                {trade.items.map((item, index) => (
                                  <div key={index} className="bg-white p-3 rounded border text-sm">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                          <span>{getCategoryIcon(item.category)}</span>
                                          <span className="font-medium">{item.description}</span>
                                        </div>
                                        {item.reasoning && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            {item.reasoning}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right ml-4">
                                        <div className="font-medium">
                                          {formatCurrency(item.amount)}
                                        </div>
                                        {item.confidence !== undefined && (
                                          <Badge
                                            size="sm"
                                            className={getConfidenceColor(item.confidence)}
                                            variant="secondary"
                                          >
                                            {(item.confidence * 100).toFixed(0)}%
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card.Body>
        )}
      </Card>
    </div>
  )
}
