/**
 * Modern Invoice Matching Interface
 * Provides intuitive UX for matching pending invoices against project estimates
 */

'use client'

import React, { useState, useEffect } from 'react'
import {
  CheckCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline'
import { LearningEnhancedMatching } from './LearningEnhancedMatching'

interface InvoiceLineItemMatch {
  invoiceLineItemId: string
  estimateLineItemId: string | null
  confidence: number
  reason: string
  matchType?: string
}

interface MatchingResult {
  invoiceId: string
  matches: InvoiceLineItemMatch[]
}

interface InvoiceMatchingData {
  invoices: any[]
  estimateLineItems: any[]
  matchingResults: MatchingResult[]
  summary: {
    totalInvoices: number
    totalAmount: number
    totalLineItems: number
    totalHighConfidenceMatches: number
    matchingRate: number
  }
  enhancedMetadata?: {
    usedEnhancedMatching: boolean
    fallbackUsed: boolean
    processingTime: number
    cost?: number
    error?: string
    cacheHit?: boolean
    unmatchedItemsCount?: number
    patternsLearned?: number
    cacheUtilization?: number
    avgConfidence?: number
    qualityScore?: number
    batchEfficiency?: number
  }
}

interface InvoiceMatchingInterfaceProps {
  projectId: string
  onMatchingComplete?: () => void
  className?: string
}

export function InvoiceMatchingInterface({
  projectId,
  onMatchingComplete,
  className = '',
}: InvoiceMatchingInterfaceProps) {
  const [data, setData] = useState<InvoiceMatchingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set())
  const [selectedMatches, setSelectedMatches] = useState<Map<string, string | null>>(new Map())
  const [searchTerm, setSearchTerm] = useState('')
  const [confidenceFilter, setConfidenceFilter] = useState<
    'all' | 'existing' | 'unmatched' | 'high' | 'medium' | 'low'
  >('all')
  const [autoSelectMode, setAutoSelectMode] = useState<'high' | 'medium' | 'all' | 'none'>('high')
  const [manualMatchingItem, setManualMatchingItem] = useState<string | null>(null)
  const [showLLMDetails, setShowLLMDetails] = useState(false)
  const [selectedInvoicesForApproval, setSelectedInvoicesForApproval] = useState<Set<string>>(
    new Set()
  )
  const [approving, setApproving] = useState(false)
  const [justAppliedCount, setJustAppliedCount] = useState<number>(0)
  const [groupByTrade, setGroupByTrade] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
  const [enableLearning, setEnableLearning] = useState(true)

  // Helper function to group line items by trade
  const getGroupedLineItems = () => {
    if (!data || !groupByTrade) return null

    const grouped = new Map<string, any[]>()

    data.matchingResults.forEach(result => {
      const invoice = data.invoices.find(inv => inv.id === result.invoiceId)

      invoice?.lineItems.forEach((lineItem: any) => {
        const match = result.matches.find(m => m.invoiceLineItemId === lineItem.id)
        const estimateItem = match?.estimateLineItemId
          ? data.estimateLineItems.find(e => e.id === match.estimateLineItemId)
          : null
        const selectedEstimateId = selectedMatches.get(lineItem.id)
        const finalEstimate = selectedEstimateId
          ? data.estimateLineItems.find(e => e.id === selectedEstimateId)
          : estimateItem

        const tradeName = finalEstimate?.tradeName || finalEstimate?.trade?.name || 'Unmapped'

        if (!grouped.has(tradeName)) {
          grouped.set(tradeName, [])
        }

        grouped.get(tradeName)!.push({
          lineItem,
          match,
          invoice,
          estimateItem,
          finalEstimate,
        })
      })
    })

    return grouped
  }

  useEffect(() => {
    fetchMatchingData()
  }, [projectId])

  useEffect(() => {
    if (data) {
      autoSelectMatches()
      // Auto-expand invoices that have existing matches so users can see them
      const invoicesWithMatches = new Set<string>()
      data.matchingResults.forEach(result => {
        const hasExistingMatches = result.matches.some(match => match.matchType === 'existing')
        if (hasExistingMatches) {
          invoicesWithMatches.add(result.invoiceId)
        }
      })
      if (invoicesWithMatches.size > 0) {
        setExpandedInvoices(invoicesWithMatches)
      }
    }
  }, [data, autoSelectMode])

  const fetchMatchingData = async (runMatching = false) => {
    try {
      setLoading(true)
      const url = `/api/invoices/matching?projectId=${projectId}${runMatching ? '&runMatching=true' : ''}`
      const response = await fetch(url)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch matching data')
      }
    } catch (err) {
      setError('Failed to fetch matching data')
      console.error('Matching data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const autoSelectMatches = () => {
    if (!data) return

    const newSelections = new Map<string, string | null>()

    data.matchingResults.forEach(result => {
      result.matches.forEach(match => {
        let shouldSelect = false

        // Always include existing matches from database
        if (match.matchType === 'existing') {
          shouldSelect = true
        } else {
          // Apply confidence-based selection for suggested matches
          switch (autoSelectMode) {
            case 'high':
              shouldSelect = match.confidence >= 0.7
              break
            case 'medium':
              shouldSelect = match.confidence >= 0.5
              break
            case 'all':
              shouldSelect = match.confidence >= 0.3
              break
            case 'none':
              shouldSelect = false
              break
          }
        }

        if (shouldSelect && match.estimateLineItemId) {
          newSelections.set(match.invoiceLineItemId, match.estimateLineItemId)
        }
      })
    })

    setSelectedMatches(newSelections)
  }

  const handleMatchSelection = (invoiceLineItemId: string, estimateLineItemId: string | null) => {
    const newSelections = new Map(selectedMatches)
    if (estimateLineItemId) {
      newSelections.set(invoiceLineItemId, estimateLineItemId)
    } else {
      newSelections.delete(invoiceLineItemId)
    }
    setSelectedMatches(newSelections)
  }

  const handleApplyMatches = async () => {
    if (!data || selectedMatches.size === 0) return

    try {
      setSaving(true)

      const matches = Array.from(selectedMatches.entries()).map(
        ([invoiceLineItemId, estimateLineItemId]) => ({
          invoiceLineItemId,
          estimateLineItemId,
        })
      )

      const response = await fetch('/api/invoices/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          matches,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Update existing data to reflect the matches instead of re-fetching
        if (data) {
          const updatedMatchingResults = data.matchingResults.map(result => ({
            ...result,
            matches: result.matches.map(match => {
              const appliedMatch = matches.find(
                m => m.invoiceLineItemId === match.invoiceLineItemId
              )
              if (appliedMatch) {
                return {
                  ...match,
                  estimateLineItemId: appliedMatch.estimateLineItemId,
                  matchType: 'existing' as const,
                  confidence: 1.0,
                  reason: 'Applied match',
                }
              }
              return match
            }),
          }))

          setData({
            ...data,
            matchingResults: updatedMatchingResults,
          })
        }

        const appliedCount = selectedMatches.size
        setSelectedMatches(new Map()) // Clear selections
        setJustAppliedCount(appliedCount) // Track what was just applied

        // Clear the success message after 3 seconds
        setTimeout(() => setJustAppliedCount(0), 3000)

        onMatchingComplete?.()
      } else {
        setError(result.error || 'Failed to apply matches')
      }
    } catch (err) {
      setError('Failed to apply matches')
      console.error('Apply matches error:', err)
    } finally {
      setSaving(false)
    }
  }

  const toggleInvoiceExpansion = (invoiceId: string) => {
    const newExpanded = new Set(expandedInvoices)
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId)
    } else {
      newExpanded.add(invoiceId)
    }
    setExpandedInvoices(newExpanded)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getConfidenceColor = (match: InvoiceLineItemMatch) => {
    if (match.matchType === 'existing') {
      return 'text-blue-700 bg-blue-50 border-blue-200'
    }
    if (match.matchType === 'unmatched') {
      return 'text-gray-700 bg-gray-50 border-gray-200'
    }
    if (match.confidence >= 0.7) return 'text-green-700 bg-green-50 border-green-200'
    if (match.confidence >= 0.5) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    if (match.confidence >= 0.3) return 'text-orange-700 bg-orange-50 border-orange-200'
    return 'text-red-700 bg-red-50 border-red-200'
  }

  const getConfidenceLabel = (match: InvoiceLineItemMatch) => {
    if (match.matchType === 'existing') return 'Matched'
    if (match.matchType === 'unmatched') return 'Unmatched'
    if (match.confidence >= 0.7) return 'High'
    if (match.confidence >= 0.5) return 'Medium'
    if (match.confidence >= 0.3) return 'Low'
    return 'Very Low'
  }

  const getMatchIcon = (match: InvoiceLineItemMatch) => {
    if (match.matchType === 'existing') {
      return <CheckCircleIcon className="h-3 w-3 mr-1" />
    }
    if (match.matchType === 'unmatched') {
      return <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
    }
    return <SparklesIcon className="h-3 w-3 mr-1" />
  }

  const handleInvoiceSelectionForApproval = (invoiceId: string, selected: boolean) => {
    const newSelection = new Set(selectedInvoicesForApproval)
    if (selected) {
      newSelection.add(invoiceId)
    } else {
      newSelection.delete(invoiceId)
    }
    setSelectedInvoicesForApproval(newSelection)
  }

  const handleCreateNewLineItem = async (lineItem: any) => {
    // TODO: Implement create new estimate line item functionality
    console.log('Create new line item:', lineItem)
    // This could open a modal or navigate to estimate creation
  }

  const handleCreateNewTrade = async (lineItem: any) => {
    // TODO: Implement create new trade category functionality
    console.log('Create new trade category:', lineItem)
    // This could open a modal or navigate to trade creation
  }

  const handleApproveInvoices = async () => {
    if (selectedInvoicesForApproval.size === 0) return

    try {
      setApproving(true)
      const invoiceIds = Array.from(selectedInvoicesForApproval)

      const response = await fetch('/api/invoices/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          invoiceIds,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Update invoice status in existing data instead of re-fetching
        if (data) {
          const updatedInvoices = data.invoices.map(invoice => {
            if (invoiceIds.includes(invoice.id)) {
              return { ...invoice, status: 'APPROVED' }
            }
            return invoice
          })

          setData({
            ...data,
            invoices: updatedInvoices,
          })
        }

        setSelectedInvoicesForApproval(new Set())
        // Success notification would go here
      } else {
        setError(result.error || 'Failed to approve invoices')
        if (result.unmatchedItems) {
          setError(
            `Cannot approve invoices with unmatched items:\n${result.unmatchedItems.join('\n')}`
          )
        }
      }
    } catch (err) {
      console.error('Approval error:', err)
      setError('Failed to approve invoices')
    } finally {
      setApproving(false)
    }
  }

  const canInvoiceBeApproved = (invoice: any, matchResults: MatchingResult | undefined) => {
    // Only PENDING invoices can be approved
    if (invoice.status !== 'PENDING') return false

    // All line items must be matched
    if (!matchResults) return false

    return matchResults.matches.every(
      match => match.estimateLineItemId !== null && match.matchType !== 'unmatched'
    )
  }

  const getFullyMatchedInvoices = () => {
    if (!data) return []
    return data.invoices.filter(invoice => {
      const matchResults = data.matchingResults.find(r => r.invoiceId === invoice.id)
      return canInvoiceBeApproved(invoice, matchResults)
    })
  }

  const getMatchingInvoices = () => {
    if (!data) return []

    return data.invoices.filter(invoice => {
      const matchResults = data.matchingResults.find(r => r.invoiceId === invoice.id)
      if (!matchResults) return false

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        if (
          !invoice.invoiceNumber.toLowerCase().includes(searchLower) &&
          !invoice.supplierName.toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      // Apply confidence filter
      if (confidenceFilter !== 'all') {
        const hasMatchingConfidence = matchResults.matches.some(match => {
          switch (confidenceFilter) {
            case 'existing':
              return match.matchType === 'existing'
            case 'unmatched':
              return match.matchType === 'unmatched'
            case 'high':
              return match.confidence >= 0.7 && match.matchType !== 'existing'
            case 'medium':
              return (
                match.confidence >= 0.5 && match.confidence < 0.7 && match.matchType !== 'existing'
              )
            case 'low':
              return (
                match.confidence < 0.5 &&
                match.matchType !== 'existing' &&
                match.matchType !== 'unmatched'
              )
            default:
              return true
          }
        })
        if (!hasMatchingConfidence) return false
      }

      return true
    })
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="relative">
            <SparklesIcon className="mx-auto h-16 w-16 text-blue-500 animate-pulse" />
            <div className="absolute inset-0 mx-auto h-16 w-16 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin"></div>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Running Smart Invoice Matching</h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-600">
              🤖 Analyzing invoices with AI-powered matching...
            </p>
            <p className="text-xs text-gray-500">
              This may take a few seconds for complex invoices
            </p>
          </div>

          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Processing invoices and estimates</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                  style={{ animationDelay: '0.5s' }}
                ></div>
                <span>Running AI analysis</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div
                  className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"
                  style={{ animationDelay: '1s' }}
                ></div>
                <span>Calculating confidence scores</span>
              </div>
            </div>
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Matching Data</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={() => {
              setError(null)
              fetchMatchingData(false) // Just retry loading, don't run matching
            }}
            className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data || data.invoices.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">All Invoices Matched</h3>
          <p className="mt-1 text-sm text-gray-500">
            There are no pending invoices that need to be matched against estimates.
          </p>
        </div>
      </div>
    )
  }

  const filteredInvoices = getMatchingInvoices()
  const selectedCount = selectedMatches.size

  // Calculate only NEW/CHANGED matches (not existing ones from database)
  const newMatchesCount = Array.from(selectedMatches.entries()).filter(
    ([invoiceLineItemId, estimateLineItemId]) => {
      // Find the original match for this invoice line item
      const originalMatch = data?.matchingResults
        .flatMap(result => result.matches)
        .find(match => match.invoiceLineItemId === invoiceLineItemId)

      // This is a new/changed match if:
      // 1. The original match was unmatched or suggested, OR
      // 2. The selected estimate differs from the original
      return (
        originalMatch?.matchType !== 'existing' ||
        originalMatch?.estimateLineItemId !== estimateLineItemId
      )
    }
  ).length

  // Calculate unmatched items for user guidance
  const unmatchedCount = data
    ? data.matchingResults.reduce((total, result) => {
        return total + result.matches.filter(match => !match.estimateLineItemId).length
      }, 0)
    : 0

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">AI-Powered Invoice Matching</h3>
                <p className="text-sm text-gray-600 font-medium">
                  Intelligent estimate-to-invoice comparison and cost tracking
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {data.summary.totalInvoices} invoices
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {formatCurrency(data.summary.totalAmount)} total
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`h-2 w-2 rounded-full ${data.summary.matchingRate >= 80 ? 'bg-green-500' : data.summary.matchingRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  ></div>
                  <span className="text-sm font-medium text-gray-700">
                    {data.summary.matchingRate}% auto-matched
                  </span>
                </div>
              </div>
              {data.enhancedMetadata && (
                <div className="flex items-center space-x-4 text-xs">
                  {data.enhancedMetadata.cacheHit ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      All Items Already Matched - No Enhanced Processing Needed
                    </span>
                  ) : data.enhancedMetadata.usedEnhancedMatching ? (
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        <SparklesIcon className="h-3 w-3 mr-1" />
                        🚀 Enhanced AI Matching ({data.enhancedMetadata.unmatchedItemsCount ||
                          0}{' '}
                        items processed)
                      </span>
                      {data.enhancedMetadata.qualityScore && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Quality: {Math.round(data.enhancedMetadata.qualityScore * 100)}%
                        </span>
                      )}
                      {data.enhancedMetadata.patternsLearned > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          📚 {data.enhancedMetadata.patternsLearned} patterns learned
                        </span>
                      )}
                    </div>
                  ) : data.enhancedMetadata.fallbackUsed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                      Enhanced AI Unavailable - Using Fallback
                    </span>
                  ) : null}

                  <span className="text-gray-500">
                    Processed in {data.enhancedMetadata.processingTime}ms
                  </span>

                  {data.enhancedMetadata.cost && (
                    <span className="text-gray-500">
                      Cost: ${data.enhancedMetadata.cost.toFixed(4)}
                    </span>
                  )}

                  {data.enhancedMetadata.batchEfficiency && (
                    <span className="text-gray-500">
                      Efficiency: {Math.round(data.enhancedMetadata.batchEfficiency * 100)}%
                    </span>
                  )}

                  {data.enhancedMetadata.error && (
                    <button
                      onClick={() => setShowLLMDetails(true)}
                      className="text-red-600 hover:text-red-700 underline"
                    >
                      View Details
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Unmatched Items Notice */}
          {unmatchedCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-amber-900 mb-2">
                    {unmatchedCount} Unmatched Line Items Found
                  </h4>
                  <p className="text-xs text-amber-800 mb-3">
                    These items need to be matched to estimate line items before invoices can be
                    approved. Use "Re-run AI Matching" to get smart suggestions, or match them
                    manually using the dropdowns below.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedMatches(new Map())
                      fetchMatchingData(true)
                    }}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-1.5 border border-amber-300 text-xs font-medium rounded-md text-amber-800 bg-amber-100 hover:bg-amber-200 disabled:opacity-50"
                  >
                    {loading ? (
                      <ArrowPathIcon className="h-3 w-3 mr-1.5 animate-spin" />
                    ) : (
                      <SparklesIcon className="h-3 w-3 mr-1.5" />
                    )}
                    {loading ? 'Getting AI Suggestions...' : 'Get AI Suggestions'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* How to Use Guide */}
          {showGuide && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    <MagnifyingGlassIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3">
                      How to Match Invoices
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-800">
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <span className="text-blue-600 font-bold text-sm">🎯</span>
                          <div>
                            <strong>Select Matches:</strong>
                            <br />
                            Use dropdown menus to match each invoice item to estimate line items
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-green-600 font-bold text-sm">🤖</span>
                          <div>
                            <strong>Review AI Suggestions:</strong>
                            <br />
                            AI pre-selects high-confidence matches (green/yellow highlights)
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-purple-600 font-bold text-sm">📊</span>
                          <div>
                            <strong>Group by Trade:</strong>
                            <br />
                            Toggle to organize items by category
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <span className="text-orange-600 font-bold text-sm">💾</span>
                          <div>
                            <strong>Apply Changes:</strong>
                            <br />
                            Click "Apply Matches" button to save all your selections
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <span className="text-green-600 font-bold text-sm">✅</span>
                          <div>
                            <strong>Approve Invoices:</strong>
                            <br />
                            Once all items are matched, approve invoices for payment
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-blue-400 hover:text-blue-600 p-1 flex-shrink-0"
                  title="Hide guide"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {!showGuide && (
            <div className="mb-4">
              <button
                onClick={() => setShowGuide(true)}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Show matching guide
              </button>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={enableLearning}
                  onChange={e => setEnableLearning(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700 font-medium">
                  <AcademicCapIcon className="h-4 w-4 inline mr-1 text-purple-600" />
                  Smart Learning
                </span>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={groupByTrade}
                  onChange={e => setGroupByTrade(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Group by Trade</span>
              </label>
            </div>

            <select
              value={autoSelectMode}
              onChange={e => setAutoSelectMode(e.target.value as any)}
              className="text-sm border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="none">No Auto-Select</option>
              <option value="high">Auto-Select High Confidence</option>
              <option value="medium">Auto-Select Medium+</option>
              <option value="all">Auto-Select All Matches</option>
            </select>

            <button
              onClick={() => {
                setSelectedMatches(new Map())
                fetchMatchingData(true) // Now explicitly request matching
              }}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowPathIcon className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Running Smart Invoice Matching...' : 'Re-run AI Matching'}
            </button>

            {/* Apply Matches Button or Status */}
            {justAppliedCount > 0 ? (
              // Just successfully applied matches
              <div className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 animate-pulse">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Successfully Applied {justAppliedCount} Match{justAppliedCount !== 1 ? 'es' : ''}!
              </div>
            ) : data.enhancedMetadata?.cacheHit ? (
              // All matches are already saved
              <div className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                All Matches Saved
              </div>
            ) : newMatchesCount > 0 ? (
              // Have pending NEW/CHANGED matches to apply
              <button
                onClick={handleApplyMatches}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                title={`Apply ${newMatchesCount} new or changed matches. ${selectedCount - newMatchesCount} existing matches will remain unchanged.`}
              >
                {saving ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LinkIcon className="h-4 w-4 mr-2" />
                )}
                Apply {newMatchesCount} New Match{newMatchesCount !== 1 ? 'es' : ''}
              </button>
            ) : selectedCount > 0 ? (
              // Only existing matches selected, no new changes
              <div className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50">
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                {selectedCount} Match{selectedCount !== 1 ? 'es' : ''} Already Applied
              </div>
            ) : (
              // No matches selected
              <div className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-50">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                No Matches Selected
              </div>
            )}

            {/* Invoice Approval Section */}
            {getFullyMatchedInvoices().length > 0 && (
              <div className="ml-4 pl-4 border-l border-gray-200">
                <div className="text-sm text-gray-600 mb-2">
                  Ready for Approval: {getFullyMatchedInvoices().length} invoice
                  {getFullyMatchedInvoices().length !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const fullyMatched = getFullyMatchedInvoices()
                      if (selectedInvoicesForApproval.size === fullyMatched.length) {
                        // Deselect all
                        setSelectedInvoicesForApproval(new Set())
                      } else {
                        // Select all fully matched
                        setSelectedInvoicesForApproval(new Set(fullyMatched.map(inv => inv.id)))
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedInvoicesForApproval.size === getFullyMatchedInvoices().length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                  {selectedInvoicesForApproval.size > 0 && (
                    <button
                      onClick={handleApproveInvoices}
                      disabled={approving}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      {approving ? (
                        <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                      )}
                      Approve {selectedInvoicesForApproval.size} Invoice
                      {selectedInvoicesForApproval.size !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Invoices</label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Invoice number, supplier..."
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confidence Filter
            </label>
            <select
              value={confidenceFilter}
              onChange={e => setConfidenceFilter(e.target.value as any)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Matches</option>
              <option value="existing">Already Matched</option>
              <option value="unmatched">Unmatched</option>
              <option value="high">High Confidence (70%+)</option>
              <option value="medium">Medium Confidence (50-69%)</option>
              <option value="low">Low Confidence (&lt;50%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Matching Stats Summary - Simplified */}
      {data && data.matchingResults.length > 0 && (
        <div className="mx-6 mb-4 bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {
                  data.matchingResults
                    .flatMap(r => r.matches)
                    .filter(m => m.matchType === 'existing').length
                }
              </div>
              <div className="text-xs text-gray-600">Already Matched</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {
                  data.matchingResults
                    .flatMap(r => r.matches)
                    .filter(m => m.matchType === 'suggested' && m.confidence >= 0.7).length
                }
              </div>
              <div className="text-xs text-gray-600">AI High Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {
                  data.matchingResults
                    .flatMap(r => r.matches)
                    .filter(
                      m => m.matchType === 'suggested' && m.confidence >= 0.5 && m.confidence < 0.7
                    ).length
                }
              </div>
              <div className="text-xs text-gray-600">AI Medium Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {
                  data.matchingResults
                    .flatMap(r => r.matches)
                    .filter(m => m.matchType === 'unmatched').length
                }
              </div>
              <div className="text-xs text-gray-600">Need Manual Review</div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced AI Status Notices */}
      {data?.enhancedMetadata?.usedEnhancedMatching && data.summary.matchingRate > 70 && (
        <div className="mx-6 mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <SparklesIcon className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-purple-800">
                🚀 Enhanced AI Matching Successful
              </h4>
              <p className="mt-1 text-sm text-purple-700">
                Enhanced matching with ML patterns found {data.summary.matchingRate}% auto-matchable
                items using advanced AI analysis.{' '}
                {(data.enhancedMetadata?.patternsLearned || 0) > 0 &&
                  `Learned ${data.enhancedMetadata.patternsLearned || 0} new patterns for future improvements.`}
              </p>

              {/* Enhanced AI Metrics */}
              <div className="mt-3 bg-white rounded-lg p-3 border border-purple-200">
                <h5 className="text-xs font-semibold text-purple-800 mb-2">
                  🤖 Enhanced AI Analysis Summary:
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-3">
                  {data.enhancedMetadata?.qualityScore && (
                    <div className="bg-green-50 p-2 rounded">
                      <span className="text-green-600 font-medium">
                        {Math.round(data.enhancedMetadata.qualityScore * 100)}%
                      </span>
                      <br />
                      <span className="text-gray-600">Quality Score</span>
                    </div>
                  )}
                  {data.enhancedMetadata?.avgConfidence && (
                    <div className="bg-blue-50 p-2 rounded">
                      <span className="text-blue-600 font-medium">
                        {Math.round(data.enhancedMetadata.avgConfidence * 100)}%
                      </span>
                      <br />
                      <span className="text-gray-600">Avg Confidence</span>
                    </div>
                  )}
                  {data.enhancedMetadata?.batchEfficiency && (
                    <div className="bg-purple-50 p-2 rounded">
                      <span className="text-purple-600 font-medium">
                        {Math.round(data.enhancedMetadata.batchEfficiency * 100)}%
                      </span>
                      <br />
                      <span className="text-gray-600">Batch Efficiency</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-green-600 font-medium">
                      {
                        data.matchingResults
                          .flatMap(r => r.matches)
                          .filter(m => m.matchType === 'suggested' && m.confidence >= 0.7).length
                      }
                    </span>
                    <br />
                    <span className="text-gray-600">High confidence AI matches</span>
                  </div>
                  <div>
                    <span className="text-yellow-600 font-medium">
                      {
                        data.matchingResults
                          .flatMap(r => r.matches)
                          .filter(
                            m =>
                              m.matchType === 'suggested' &&
                              m.confidence >= 0.5 &&
                              m.confidence < 0.7
                          ).length
                      }
                    </span>
                    <br />
                    <span className="text-gray-600">Medium confidence matches</span>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">
                      {
                        data.matchingResults
                          .flatMap(r => r.matches)
                          .filter(m => m.matchType === 'existing').length
                      }
                    </span>
                    <br />
                    <span className="text-gray-600">Already matched items</span>
                  </div>
                  <div>
                    <span className="text-red-600 font-medium">
                      {
                        data.matchingResults
                          .flatMap(r => r.matches)
                          .filter(m => m.matchType === 'unmatched').length
                      }
                    </span>
                    <br />
                    <span className="text-gray-600">Need manual review</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-green-100">
                  <p className="text-xs text-green-700">
                    💡 <strong>Next steps:</strong> Review AI suggestions below, check confidence
                    scores, and click "Apply" for matches you approve.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {data?.enhancedMetadata?.fallbackUsed && (
        <div className="mx-6 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Enhanced AI Matching Temporarily Unavailable
              </h4>
              <p className="mt-1 text-sm text-yellow-700">
                We're using our backup logic-based matching system. Enhanced features like pattern
                learning and batch processing are not available, but basic matching will still work.
              </p>
              {data.enhancedMetadata.error && (
                <p className="mt-2 text-xs text-yellow-600">
                  Technical details: {data.enhancedMetadata.error}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grouped Invoice Sections */}
      {(() => {
        // Group invoices by status for better UX
        const unmatchedInvoices = filteredInvoices.filter(invoice => {
          const matchResults = data.matchingResults.find(r => r.invoiceId === invoice.id)
          return matchResults?.matches.some(m => m.matchType === 'unmatched') || false
        })

        const matchedPendingInvoices = filteredInvoices.filter(invoice => {
          const matchResults = data.matchingResults.find(r => r.invoiceId === invoice.id)
          const hasUnmatched = matchResults?.matches.some(m => m.matchType === 'unmatched') || false
          return !hasUnmatched && invoice.status === 'PENDING'
        })

        const processedInvoices = filteredInvoices.filter(invoice => 
          invoice.status === 'APPROVED' || invoice.status === 'PAID'
        )

        const renderInvoiceCard = (invoice: any, sectionType: 'unmatched' | 'matched' | 'processed') => {
          const matchResults = data.matchingResults.find(r => r.invoiceId === invoice.id)
          const isExpanded = expandedInvoices.has(invoice.id)
          const existingMatches =
            matchResults?.matches.filter(m => m.matchType === 'existing').length || 0
          const highConfidenceMatches =
            matchResults?.matches.filter(m => m.confidence >= 0.7 && m.matchType !== 'existing')
              .length || 0
          const unmatchedItems =
            matchResults?.matches.filter(m => m.matchType === 'unmatched').length || 0

          return (
            <div key={invoice.id} className="border-b border-gray-100 last:border-b-0">
              {/* Invoice Header */}
              <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                {/* Approval Checkbox for fully matched invoices */}
                {canInvoiceBeApproved(invoice, matchResults) && (
                  <div className="mr-3">
                    <input
                      type="checkbox"
                      checked={selectedInvoicesForApproval.has(invoice.id)}
                      onChange={e => {
                        e.stopPropagation()
                        handleInvoiceSelectionForApproval(invoice.id, e.target.checked)
                      }}
                      className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      title="Select for approval"
                    />
                  </div>
                )}

                <div
                  className="flex items-center space-x-3 cursor-pointer flex-1"
                  onClick={() => toggleInvoiceExpansion(invoice.id)}
                  title={
                    isExpanded
                      ? 'Click to collapse matching details'
                      : 'Click to expand and view/edit matches'
                  }
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  )}

                  <DocumentTextIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-500 truncate">{invoice.supplierName}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
                        <p className="text-xs text-gray-500">{formatDate(invoice.invoiceDate)}</p>
                      </div>
                    </div>

                    <div className="mt-1 flex items-center space-x-2 text-xs">
                      {existingMatches > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {existingMatches} matched
                        </span>
                      )}
                      {highConfidenceMatches > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {highConfidenceMatches} AI suggested
                        </span>
                      )}
                      {unmatchedItems > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          {unmatchedItems} unmatched
                        </span>
                      )}
                      {invoice.status === 'APPROVED' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          ✓ Approved
                        </span>
                      )}
                      {invoice.status === 'PAID' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          ✓ Paid
                        </span>
                      )}
                      {canInvoiceBeApproved(invoice, matchResults) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          Ready to approve
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Line Items (when expanded) */}
              {isExpanded && matchResults && (
                <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="space-y-3">
                    {invoice.lineItems.map((lineItem: any) => {
                      const match = matchResults.matches.find(
                        m => m.invoiceLineItemId === lineItem.id
                      )
                      const selectedEstimateId = selectedMatches.get(lineItem.id)

                      if (!match) return null

                      const estimateItem = match.estimateLineItemId
                        ? data.estimateLineItems.find(e => e.id === match.estimateLineItemId)
                        : null

                      return (
                        <div
                          key={lineItem.id}
                          className={`rounded-lg p-3 border ${
                            match.matchType === 'suggested' && match.confidence >= 0.7
                              ? 'border-green-300 bg-green-50'
                              : match.matchType === 'suggested' && match.confidence >= 0.5
                                ? 'border-yellow-300 bg-yellow-50'
                                : match.matchType === 'existing'
                                  ? 'border-blue-300 bg-blue-50'
                                  : 'border-red-200 bg-red-50'
                          }`}
                        >
                          {/* Invoice Line Item Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{lineItem.description}</p>
                              <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
                                <span>Qty: {lineItem.quantity}</span>
                                <span>{formatCurrency(lineItem.totalPrice)}</span>
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{lineItem.category}</span>
                              </div>
                            </div>

                            {/* Match Status Badge */}
                            {match.matchType === 'existing' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                Matched
                              </span>
                            )}
                            {match.matchType === 'suggested' && (
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                                  match.confidence >= 0.7
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                <SparklesIcon className="h-3 w-3 mr-1" />
                                {Math.round(match.confidence * 100)}%
                              </span>
                            )}
                            {match.matchType === 'unmatched' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">
                                <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                Unmatched
                              </span>
                            )}
                          </div>

                          {/* PRIMARY MATCHING INTERFACE */}
                          {enableLearning ? (
                            <LearningEnhancedMatching
                              invoiceLineItem={{
                                id: lineItem.id,
                                description: lineItem.description,
                                totalPrice: lineItem.totalPrice,
                              }}
                              invoice={{
                                id: invoice.id,
                                supplierName: invoice.supplierName,
                              }}
                              projectId={projectId}
                              estimateLineItems={data.estimateLineItems}
                              onMatchSelected={estimateLineItemId =>
                                handleMatchSelection(lineItem.id, estimateLineItemId)
                              }
                              currentMatch={
                                selectedMatches.get(lineItem.id) || match.estimateLineItemId
                              }
                            />
                          ) : (
                            <div className="bg-white rounded border p-3">
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-700">
                                  Match to estimate line item:
                                </label>
                                <select
                                  value={
                                    selectedMatches.get(lineItem.id) ||
                                    match.estimateLineItemId ||
                                    ''
                                  }
                                  onChange={e => {
                                    const value = e.target.value
                                    handleMatchSelection(lineItem.id, value || null)
                                  }}
                                  className="block w-full text-sm border-gray-300 rounded focus:border-blue-500 focus:ring-blue-500"
                                >
                                  <option value="">-- No Match --</option>
                                  {Object.entries(
                                    data.estimateLineItems.reduce(
                                      (groups, item) => {
                                        const tradeName = item.trade.name
                                        if (!groups[tradeName]) groups[tradeName] = []
                                        groups[tradeName].push(item)
                                        return groups
                                      },
                                      {} as Record<string, any[]>
                                    )
                                  ).map(([tradeName, items]) => (
                                    <optgroup key={tradeName} label={tradeName}>
                                      {items.map(estItem => {
                                        const totalCost =
                                          estItem.materialCostEst +
                                          estItem.laborCostEst +
                                          estItem.equipmentCostEst
                                        return (
                                          <option key={estItem.id} value={estItem.id}>
                                            {estItem.description} - {formatCurrency(totalCost)}
                                          </option>
                                        )
                                      })}
                                    </optgroup>
                                  ))}
                                </select>

                                {/* Current Selection Display */}
                                {(selectedMatches.get(lineItem.id) || match.estimateLineItemId) && (
                                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                    {(() => {
                                      const currentEstimateId =
                                        selectedMatches.get(lineItem.id) || match.estimateLineItemId
                                      const currentEstimate = data.estimateLineItems.find(
                                        e => e.id === currentEstimateId
                                      )
                                      if (!currentEstimate) return null

                                      const totalCost =
                                        currentEstimate.materialCostEst +
                                        currentEstimate.laborCostEst +
                                        currentEstimate.equipmentCostEst
                                      const variance = lineItem.totalPrice - totalCost

                                      return (
                                        <div>
                                          <p className="font-medium text-blue-900">
                                            → {currentEstimate.description}
                                          </p>
                                          <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                                            <span>Trade: {currentEstimate.trade.name}</span>
                                            <span>Est: {formatCurrency(totalCost)}</span>
                                            <span className={variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : 'text-gray-600'}>
                                              Var: {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                                            </span>
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* AI Suggestion Info */}
                          {match.matchType === 'suggested' && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                              <p className="text-green-800">
                                <SparklesIcon className="h-3 w-3 inline mr-1" />
                                <strong>AI:</strong> {match.reason}
                              </p>
                            </div>
                          )}

                          {/* Unmatched Actions */}
                          {match.matchType === 'unmatched' && !selectedMatches.get(lineItem.id) && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleCreateNewLineItem(lineItem)}
                                className="px-2 py-1 bg-green-100 hover:bg-green-200 border border-green-300 rounded text-xs text-green-800"
                              >
                                ➕ Create Estimate
                              </button>
                              <button
                                onClick={() => handleCreateNewTrade(lineItem)}
                                className="px-2 py-1 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded text-xs text-blue-800"
                              >
                                🏗️ Create Trade
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        }

        // Return grouped sections with clear visual separation
        return (
          <div className="space-y-6">
            {/* UNMATCHED INVOICES SECTION */}
            {unmatchedInvoices.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg">
                <div className="px-4 py-3 border-b border-red-200 bg-red-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                      <h3 className="text-sm font-semibold text-red-900">
                        Unmatched Invoices ({unmatchedInvoices.length})
                      </h3>
                    </div>
                    {unmatchedInvoices.length > 0 && (
                      <button
                        onClick={() => {
                          // Auto-expand all unmatched invoices for easier processing
                          const newExpanded = new Set(expandedInvoices)
                          unmatchedInvoices.forEach(inv => newExpanded.add(inv.id))
                          setExpandedInvoices(newExpanded)
                        }}
                        className="text-xs text-red-700 hover:text-red-800 underline"
                      >
                        Expand all for matching
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-red-700 mt-1">
                    These invoices have line items that need to be matched before approval. Use AI matching or manual selection.
                  </p>
                </div>
                <div className="divide-y divide-red-200">
                  {unmatchedInvoices.map(invoice => renderInvoiceCard(invoice, 'unmatched'))}
                </div>
              </div>
            )}

            {/* MATCHED PENDING INVOICES SECTION */}
            {matchedPendingInvoices.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg">
                <div className="px-4 py-3 border-b border-green-200 bg-green-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      <h3 className="text-sm font-semibold text-green-900">
                        Ready for Approval ({matchedPendingInvoices.length})
                      </h3>
                    </div>
                    {matchedPendingInvoices.length > 0 && (
                      <button
                        onClick={() => {
                          // Select all for approval
                          setSelectedInvoicesForApproval(new Set(matchedPendingInvoices.map(inv => inv.id)))
                        }}
                        className="text-xs text-green-700 hover:text-green-800 underline"
                      >
                        Select all for approval
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    All line items are matched. These invoices are ready to approve for payment.
                  </p>
                </div>
                <div className="divide-y divide-green-200">
                  {matchedPendingInvoices.map(invoice => renderInvoiceCard(invoice, 'matched'))}
                </div>
              </div>
            )}

            {/* PROCESSED INVOICES SECTION */}
            {processedInvoices.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg">
                <div className="px-4 py-3 border-b border-blue-200 bg-blue-100">
                  <div className="flex items-center space-x-2">
                    <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-900">
                      Processed Invoices ({processedInvoices.length})
                    </h3>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    These invoices have been approved or paid. Expand to view matching details.
                  </p>
                </div>
                <div className="divide-y divide-blue-200">
                  {processedInvoices.map(invoice => renderInvoiceCard(invoice, 'processed'))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Empty State */}
      {filteredInvoices.length === 0 && (
        <div className="px-6 py-12 text-center">
          <AdjustmentsHorizontalIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices match your filters</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search terms or confidence filter
          </p>
        </div>
      )}
    </div>
  )
}
