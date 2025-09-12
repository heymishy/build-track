/**
 * Learning-Enhanced Invoice Matching Component
 * Integrates pattern learning with the invoice matching interface
 */

'use client'

import React, { useState, useEffect } from 'react'
import {
  SparklesIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XMarkIcon,
  LightBulbIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'

interface PatternSuggestion {
  patternId?: string
  tradeId: string
  tradeName: string
  estimateLineItemId?: string
  estimateDescription?: string
  confidence: number
  matchingMethod: 'PATTERN' | 'LLM' | 'FUZZY' | 'AMOUNT'
  reason: string
}

interface LearningStats {
  totalPatterns: number
  patternsByType: Record<string, number>
  accuracyRate: number
  topSuppliers: Array<{
    supplier: string
    tradeId: string
    tradeName: string
    count: number
  }>
}

interface LearningEnhancedMatchingProps {
  invoiceLineItem: {
    id: string
    description: string
    totalPrice: number
  }
  invoice: {
    id: string
    supplierName: string
  }
  projectId: string
  estimateLineItems: Array<{
    id: string
    description: string
    trade: { id: string; name: string }
  }>
  onMatchSelected: (estimateLineItemId: string | null) => void
  currentMatch?: string | null
}

export function LearningEnhancedMatching({
  invoiceLineItem,
  invoice,
  projectId,
  estimateLineItems,
  onMatchSelected,
  currentMatch,
}: LearningEnhancedMatchingProps) {
  const [suggestions, setSuggestions] = useState<PatternSuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [showLearningPanel, setShowLearningPanel] = useState(false)
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null)

  // Load pattern-based suggestions
  useEffect(() => {
    loadSuggestions()
  }, [invoiceLineItem.id])

  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true)
    try {
      const params = new URLSearchParams({
        supplierName: invoice.supplierName,
        lineItemDescription: invoiceLineItem.description,
        amount: invoiceLineItem.totalPrice.toString(),
        projectId,
      })

      const response = await fetch(`/api/invoices/learning?${params}`)
      const data = await response.json()

      if (data.success) {
        setSuggestions(data.suggestions)
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  const loadLearningStats = async () => {
    try {
      const response = await fetch(`/api/invoices/learning/stats?projectId=${projectId}`)
      const data = await response.json()

      if (data.success) {
        setLearningStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load learning stats:', error)
    }
  }

  const handleSuggestionClick = async (suggestion: PatternSuggestion) => {
    onMatchSelected(suggestion.estimateLineItemId || null)

    // Learn from this selection
    await learnFromSelection(suggestion)
  }

  const handleManualSelection = async (estimateLineItemId: string | null) => {
    onMatchSelected(estimateLineItemId)

    // Learn from manual selection
    if (estimateLineItemId) {
      const estimateItem = estimateLineItems.find(item => item.id === estimateLineItemId)
      if (estimateItem) {
        await learnFromManualMatch(estimateItem.trade.id, estimateLineItemId)
      }
    }
  }

  const learnFromSelection = async (suggestion: PatternSuggestion) => {
    try {
      await fetch('/api/invoices/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'learn',
          invoiceLineItemId: invoiceLineItem.id,
          supplierName: invoice.supplierName,
          lineItemDescription: invoiceLineItem.description,
          amount: invoiceLineItem.totalPrice,
          tradeId: suggestion.tradeId,
          estimateLineItemId: suggestion.estimateLineItemId,
        }),
      })
    } catch (error) {
      console.error('Failed to learn from selection:', error)
    }
  }

  const learnFromManualMatch = async (tradeId: string, estimateLineItemId: string) => {
    try {
      await fetch('/api/invoices/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'learn',
          invoiceLineItemId: invoiceLineItem.id,
          supplierName: invoice.supplierName,
          lineItemDescription: invoiceLineItem.description,
          amount: invoiceLineItem.totalPrice,
          tradeId,
          estimateLineItemId,
        }),
      })
    } catch (error) {
      console.error('Failed to learn from manual match:', error)
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'PATTERN':
        return <AcademicCapIcon className="h-4 w-4 text-purple-500" />
      case 'LLM':
        return <SparklesIcon className="h-4 w-4 text-blue-500" />
      case 'FUZZY':
        return <LightBulbIcon className="h-4 w-4 text-yellow-500" />
      case 'AMOUNT':
        return <ChartBarIcon className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  return (
    <div className="space-y-4">
      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AcademicCapIcon className="h-5 w-5 text-purple-600" />
            <h4 className="font-medium text-purple-900">Smart Suggestions</h4>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              AI-Powered
            </span>
          </div>

          <div className="space-y-2">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getMethodIcon(suggestion.matchingMethod)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{suggestion.tradeName}</div>
                    {suggestion.estimateDescription && (
                      <div className="text-sm text-gray-500 truncate">
                        {suggestion.estimateDescription}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">{suggestion.reason}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${getConfidenceColor(
                      suggestion.confidence
                    )}`}
                  >
                    {Math.round(suggestion.confidence * 100)}%
                  </span>
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                </div>
              </button>
            ))}
          </div>

          {suggestions.length > 3 && (
            <button
              onClick={() => setShowLearningPanel(!showLearningPanel)}
              className="mt-2 text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
            >
              <span>Show {suggestions.length - 3} more suggestions</span>
              <ArrowTrendingUpIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Learning Panel */}
      {showLearningPanel && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Learning Insights</h4>
            <button
              onClick={loadLearningStats}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Refresh Stats
            </button>
          </div>

          {learningStats && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-600">Learned Patterns</div>
                <div className="font-semibold text-lg">{learningStats.totalPatterns}</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-gray-600">Accuracy Rate</div>
                <div className="font-semibold text-lg text-green-600">
                  {Math.round(learningStats.accuracyRate * 100)}%
                </div>
              </div>
            </div>
          )}

          {/* Show additional suggestions */}
          {suggestions.length > 3 && (
            <div className="mt-4 space-y-2">
              {suggestions.slice(3).map((suggestion, index) => (
                <button
                  key={index + 3}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center justify-between p-2 bg-white border border-gray-200 rounded hover:border-gray-300 text-left text-sm"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {getMethodIcon(suggestion.matchingMethod)}
                    <span className="truncate">{suggestion.tradeName}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {Math.round(suggestion.confidence * 100)}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Selection Dropdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Or manually select an estimate line item:
        </label>
        <select
          value={currentMatch || ''}
          onChange={e => handleManualSelection(e.target.value || null)}
          className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">-- Select an estimate line item --</option>
          {Object.entries(
            estimateLineItems.reduce(
              (groups, item) => {
                const tradeName = item.trade.name
                if (!groups[tradeName]) groups[tradeName] = []
                groups[tradeName].push(item)
                return groups
              },
              {} as Record<string, any[]>
            )
          ).map(([tradeName, items]) => (
            <optgroup key={tradeName} label={`${tradeName} (${items.length} items)`}>
              {items.map(estItem => (
                <option key={estItem.id} value={estItem.id}>
                  {estItem.description}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {isLoadingSuggestions && (
        <div className="flex items-center justify-center p-4 text-sm text-gray-500">
          <ArrowTrendingUpIcon className="h-4 w-4 animate-spin mr-2" />
          Loading smart suggestions...
        </div>
      )}
    </div>
  )
}
