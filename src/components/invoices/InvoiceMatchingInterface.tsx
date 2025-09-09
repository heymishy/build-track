/**
 * Modern Invoice Matching Interface
 * Provides intuitive UX for matching pending invoices against project estimates
 */

'use client'

import { useState, useEffect } from 'react'
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
} from '@heroicons/react/24/outline'

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

  useEffect(() => {
    fetchMatchingData()
  }, [projectId])

  useEffect(() => {
    if (data) {
      autoSelectMatches()
    }
  }, [data, autoSelectMode])

  const fetchMatchingData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/invoices/matching?projectId=${projectId}`)
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
              fetchMatchingData()
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

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2 text-blue-500" />
              Smart Invoice Matching
            </h3>
            <div className="mt-1 space-y-1">
              <p className="text-sm text-gray-500">
                {data.summary.totalInvoices} invoices • {formatCurrency(data.summary.totalAmount)}{' '}
                total • {data.summary.matchingRate}% auto-matchable
              </p>
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

          <div className="flex items-center space-x-3">
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
                fetchMatchingData()
              }}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowPathIcon className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Running AI Analysis...' : 'Re-run AI Matching'}
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
            ) : selectedCount > 0 ? (
              // Have pending matches to apply
              <button
                onClick={handleApplyMatches}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LinkIcon className="h-4 w-4 mr-2" />
                )}
                Apply {selectedCount} Match{selectedCount !== 1 ? 'es' : ''}
              </button>
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

      {/* Current Mappings Summary Table */}
      {data && data.matchingResults.length > 0 && (
        <div className="mx-6 mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Current Invoice → Estimate Mappings</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Item
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mapped to Estimate
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trade
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.matchingResults.map(result => {
                  const invoice = data.invoices.find(inv => inv.id === result.invoiceId)
                  return invoice?.lineItems.map((lineItem: any) => {
                    const match = result.matches.find(m => m.invoiceLineItemId === lineItem.id)
                    const estimateItem = match?.estimateLineItemId
                      ? data.estimateLineItems.find(e => e.id === match.estimateLineItemId)
                      : null
                    const selectedEstimateId = selectedMatches.get(lineItem.id)
                    const finalEstimate = selectedEstimateId 
                      ? data.estimateLineItems.find(e => e.id === selectedEstimateId)
                      : estimateItem

                    return (
                      <tr key={lineItem.id} className={
                        match?.matchType === 'existing' ? 'bg-blue-50' :
                        match?.matchType === 'suggested' && match.confidence >= 0.7 ? 'bg-green-50' :
                        match?.matchType === 'unmatched' ? 'bg-red-50' : ''
                      }>
                        <td className="px-4 py-2 text-gray-900">
                          <div className="max-w-xs truncate" title={lineItem.description}>
                            {lineItem.description}
                          </div>
                          <div className="text-xs text-gray-500">
                            {invoice?.invoiceNumber}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-gray-900">
                          {formatCurrency(lineItem.totalPrice)}
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {lineItem.category}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-900">
                          {finalEstimate ? (
                            <div>
                              <div className="max-w-xs truncate font-medium" title={finalEstimate.description}>
                                {finalEstimate.description}
                              </div>
                              <div className="text-xs text-gray-500">
                                Est: {formatCurrency(
                                  finalEstimate.materialCostEst +
                                  finalEstimate.laborCostEst +
                                  finalEstimate.equipmentCostEst
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-red-600 text-xs">Not mapped</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {finalEstimate?.trade?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-2">
                          {match?.matchType === 'existing' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Matched
                            </span>
                          ) : match?.matchType === 'suggested' ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              match.confidence >= 0.7 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              <SparklesIcon className="h-3 w-3 mr-1" />
                              AI: {Math.round(match.confidence * 100)}%
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                              Unmatched
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  }) || []
                })}
              </tbody>
            </table>
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
                {data.enhancedMetadata?.patternsLearned > 0 &&
                  `Learned ${data.enhancedMetadata.patternsLearned} new patterns for future improvements.`}
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

      {/* Invoice List */}
      <div className="divide-y divide-gray-200">
        {filteredInvoices.map(invoice => {
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
            <div key={invoice.id} className="px-6 py-4">
              {/* Invoice Header */}
              <div className="flex items-center justify-between">
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
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  )}

                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-500">{invoice.supplierName}</p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>Date: {formatDate(invoice.invoiceDate)}</span>
                      <span>Amount: {formatCurrency(invoice.totalAmount)}</span>
                      <span>Line Items: {invoice.lineItems.length}</span>
                      {existingMatches > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {existingMatches} matched
                        </span>
                      )}
                      {highConfidenceMatches > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {highConfidenceMatches} suggested
                        </span>
                      )}
                      {unmatchedItems > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {unmatchedItems} unmatched
                        </span>
                      )}
                      {/* Invoice Status Badge */}
                      {invoice.status === 'APPROVED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          ✓ Approved
                        </span>
                      )}
                      {invoice.status === 'PAID' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          ✓ Paid
                        </span>
                      )}
                      {canInvoiceBeApproved(invoice, matchResults) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          Ready to Approve
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Line Items (when expanded) */}
              {isExpanded && matchResults && (
                <div className="mt-4 ml-8">
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
                          className={`rounded-lg p-4 ${
                            match.matchType === 'suggested' && match.confidence >= 0.7
                              ? 'border-2 border-green-300 bg-green-50'
                              : match.matchType === 'suggested' && match.confidence >= 0.5
                                ? 'border-2 border-yellow-300 bg-yellow-50'
                                : match.matchType === 'existing'
                                  ? 'border border-blue-200 bg-blue-50'
                                  : 'border border-gray-200 bg-gray-50'
                          }`}
                        >
                          {/* Invoice Line Item */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {lineItem.description}
                              </p>
                              <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                                <span>Qty: {lineItem.quantity}</span>
                                <span>Unit: {formatCurrency(lineItem.unitPrice)}</span>
                                <span>Total: {formatCurrency(lineItem.totalPrice)}</span>
                                <span className="uppercase">{lineItem.category}</span>
                              </div>
                            </div>
                          </div>

                          {/* Matching Section */}
                          <div className="mt-3 pt-3 border-t border-gray-300">
                            {match.estimateLineItemId && estimateItem ? (
                              <div className="space-y-3">
                                {/* Enhanced AI Suggestion Header */}
                                {match.matchType === 'suggested' && (
                                  <div className="bg-white/80 rounded-lg p-3 border-l-4 border-green-500">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center space-x-2">
                                        <SparklesIcon className="h-4 w-4 text-green-600" />
                                        <span className="text-sm font-semibold text-green-800">
                                          🤖 AI Suggestion
                                        </span>
                                        <div
                                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border-2 ${getConfidenceColor(match)}`}
                                        >
                                          {Math.round(match.confidence * 100)}% Confidence
                                        </div>
                                      </div>
                                    </div>
                                    <p className="mt-1 text-sm text-green-700 font-medium">
                                      💭 <strong>AI Reasoning:</strong> {match.reason}
                                    </p>
                                  </div>
                                )}

                                {/* Standard Confidence Badge for non-AI matches */}
                                {match.matchType !== 'suggested' && (
                                  <div className="flex items-center justify-between">
                                    <div
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getConfidenceColor(match)}`}
                                    >
                                      {getMatchIcon(match)}
                                      {getConfidenceLabel(match)}
                                      {match.matchType !== 'existing' &&
                                        match.matchType !== 'unmatched' &&
                                        ` (${Math.round(match.confidence * 100)}%)`}
                                    </div>
                                    <span className="text-xs text-gray-500">{match.reason}</span>
                                  </div>
                                )}

                                {/* Suggested Estimate Match */}
                                <div
                                  className={`border rounded p-3 ${
                                    match.matchType === 'suggested'
                                      ? 'bg-white border-green-300 shadow-md'
                                      : 'bg-white border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900">
                                        {estimateItem.description}
                                      </p>
                                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                                        <span>Trade: {estimateItem.trade.name}</span>
                                        <span>
                                          Qty: {estimateItem.quantity} {estimateItem.unit}
                                        </span>
                                        <span>
                                          Est:{' '}
                                          {formatCurrency(
                                            estimateItem.materialCostEst +
                                              estimateItem.laborCostEst +
                                              estimateItem.equipmentCostEst
                                          )}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedEstimateId === estimateItem.id}
                                        onChange={e => {
                                          if (e.target.checked) {
                                            handleMatchSelection(lineItem.id, estimateItem.id)
                                          } else {
                                            handleMatchSelection(lineItem.id, null)
                                          }
                                        }}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <label
                                        className={`text-sm font-medium ${
                                          match.matchType === 'suggested'
                                            ? 'text-green-700'
                                            : 'text-gray-700'
                                        }`}
                                      >
                                        {match.matchType === 'suggested'
                                          ? '✅ Accept AI Match'
                                          : 'Accept Match'}
                                      </label>
                                    </div>
                                  </div>
                                </div>

                                {/* Manual Override Option */}
                                <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-3">
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                                    Override with Different Match
                                  </h5>
                                  <select
                                    value={
                                      selectedMatches.get(lineItem.id) !== estimateItem.id
                                        ? selectedMatches.get(lineItem.id) || ''
                                        : ''
                                    }
                                    onChange={e => {
                                      const value = e.target.value
                                      if (value) {
                                        handleMatchSelection(lineItem.id, value)
                                      }
                                    }}
                                    className="block w-full text-sm border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                                  >
                                    <option value="">Choose different estimate...</option>
                                    {data.estimateLineItems
                                      .filter(estItem => estItem.id !== estimateItem.id)
                                      .map(estItem => (
                                        <option key={estItem.id} value={estItem.id}>
                                          {estItem.trade.name}: {estItem.description} -{' '}
                                          {formatCurrency(
                                            estItem.materialCostEst +
                                              estItem.laborCostEst +
                                              estItem.equipmentCostEst
                                          )}
                                        </option>
                                      ))}
                                  </select>
                                  {selectedMatches.get(lineItem.id) &&
                                    selectedMatches.get(lineItem.id) !== estimateItem.id && (
                                      <div className="mt-2 text-xs text-green-600">
                                        ✓ Override applied - now matching to different estimate
                                      </div>
                                    )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {/* Enhanced Unmatched Item Alert */}
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <div className="flex items-start space-x-2">
                                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <h5 className="text-sm font-semibold text-red-800">
                                        ⚠️ No Match Found - Action Needed
                                      </h5>
                                      <p className="text-xs text-red-700 mt-1">
                                        <strong>AI Analysis:</strong> {match.reason}
                                      </p>
                                      <div className="mt-2 p-2 bg-white rounded border border-red-200">
                                        <p className="text-xs font-medium text-red-800">
                                          💡 <strong>Possible Actions:</strong>
                                        </p>
                                        <div className="mt-2 space-y-2">
                                          <button
                                            onClick={() => handleCreateNewLineItem(lineItem)}
                                            className="w-full text-left px-3 py-2 bg-green-100 hover:bg-green-200 border border-green-300 rounded text-xs font-medium text-green-800 transition-colors"
                                          >
                                            ➕ <strong>Create New Estimate Item</strong>
                                            <div className="text-green-700 mt-1">
                                              Add "{lineItem.description}" as a new line item to
                                              project estimates
                                            </div>
                                          </button>

                                          <button
                                            onClick={() => handleCreateNewTrade(lineItem)}
                                            className="w-full text-left px-3 py-2 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded text-xs font-medium text-blue-800 transition-colors"
                                          >
                                            🏗️ <strong>Create New Trade Category</strong>
                                            <div className="text-blue-700 mt-1">
                                              Create new trade category and add this item to it
                                            </div>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Manual Matching */}
                                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                                    Manual Matching
                                  </h5>
                                  <div className="space-y-2">
                                    <select
                                      value={selectedMatches.get(lineItem.id) || ''}
                                      onChange={e => {
                                        const value = e.target.value
                                        handleMatchSelection(lineItem.id, value || null)
                                      }}
                                      className="block w-full text-sm border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                                    >
                                      <option value="">Select an estimate to match...</option>
                                      {data.estimateLineItems.map(estItem => (
                                        <option key={estItem.id} value={estItem.id}>
                                          {estItem.trade.name}: {estItem.description} -{' '}
                                          {formatCurrency(
                                            estItem.materialCostEst +
                                              estItem.laborCostEst +
                                              estItem.equipmentCostEst
                                          )}
                                        </option>
                                      ))}
                                    </select>

                                    {selectedMatches.get(lineItem.id) && (
                                      <div className="text-xs text-gray-600">
                                        ✓ Manually matched to estimate
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

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
