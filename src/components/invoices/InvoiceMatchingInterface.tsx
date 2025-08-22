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
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

interface InvoiceLineItemMatch {
  invoiceLineItemId: string
  estimateLineItemId: string | null
  confidence: number
  reason: string
}

interface MatchingResult {
  invoiceId: string
  matches: InvoiceLineItemMatch[]
}

interface InvoiceMatchingData {
  pendingInvoices: any[]
  estimateLineItems: any[]
  matchingResults: MatchingResult[]
  summary: {
    totalPendingInvoices: number
    totalPendingAmount: number
    totalLineItems: number
    totalHighConfidenceMatches: number
    matchingRate: number
  }
  llmMetadata?: {
    usedLLM: boolean
    fallbackUsed: boolean
    processingTime: number
    cost?: number
    error?: string
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
  className = '' 
}: InvoiceMatchingInterfaceProps) {
  const [data, setData] = useState<InvoiceMatchingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set())
  const [selectedMatches, setSelectedMatches] = useState<Map<string, string | null>>(new Map())
  const [searchTerm, setSearchTerm] = useState('')
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [autoSelectMode, setAutoSelectMode] = useState<'high' | 'medium' | 'all' | 'none'>('high')
  const [manualMatchingItem, setManualMatchingItem] = useState<string | null>(null)
  const [showLLMDetails, setShowLLMDetails] = useState(false)

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
      
      const matches = Array.from(selectedMatches.entries()).map(([invoiceLineItemId, estimateLineItemId]) => ({
        invoiceLineItemId,
        estimateLineItemId
      }))
      
      const response = await fetch('/api/invoices/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          matches
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchMatchingData() // Refresh data
        setSelectedMatches(new Map()) // Clear selections
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-700 bg-green-50 border-green-200'
    if (confidence >= 0.5) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    if (confidence >= 0.3) return 'text-orange-700 bg-orange-50 border-orange-200'
    return 'text-red-700 bg-red-50 border-red-200'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.7) return 'High'
    if (confidence >= 0.5) return 'Medium'
    if (confidence >= 0.3) return 'Low'
    return 'Very Low'
  }

  const getMatchingInvoices = () => {
    if (!data) return []
    
    return data.pendingInvoices.filter(invoice => {
      const matchResults = data.matchingResults.find(r => r.invoiceId === invoice.id)
      if (!matchResults) return false
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        if (!invoice.invoiceNumber.toLowerCase().includes(searchLower) &&
            !invoice.supplierName.toLowerCase().includes(searchLower)) {
          return false
        }
      }
      
      // Apply confidence filter
      if (confidenceFilter !== 'all') {
        const hasMatchingConfidence = matchResults.matches.some(match => {
          switch (confidenceFilter) {
            case 'high': return match.confidence >= 0.7
            case 'medium': return match.confidence >= 0.5 && match.confidence < 0.7
            case 'low': return match.confidence < 0.5
            default: return true
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
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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

  if (!data || data.pendingInvoices.length === 0) {
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
                {data.summary.totalPendingInvoices} pending invoices • {formatCurrency(data.summary.totalPendingAmount)} total • {data.summary.matchingRate}% auto-matchable
              </p>
              {data.llmMetadata && (
                <div className="flex items-center space-x-4 text-xs">
                  {data.llmMetadata.usedLLM ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      <SparklesIcon className="h-3 w-3 mr-1" />
                      AI-Powered Matching
                    </span>
                  ) : data.llmMetadata.fallbackUsed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Logic-Based Fallback
                    </span>
                  ) : null}
                  
                  <span className="text-gray-500">
                    Processed in {data.llmMetadata.processingTime}ms
                  </span>
                  
                  {data.llmMetadata.cost && (
                    <span className="text-gray-500">
                      Cost: ${data.llmMetadata.cost.toFixed(4)}
                    </span>
                  )}
                  
                  {data.llmMetadata.error && (
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
              onChange={(e) => setAutoSelectMode(e.target.value as any)}
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
              Re-run AI Matching
            </button>
            
            {selectedCount > 0 && (
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
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Invoice number, supplier..."
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confidence Filter</label>
            <select
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value as any)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Confidences</option>
              <option value="high">High Confidence (70%+)</option>
              <option value="medium">Medium Confidence (50-69%)</option>
              <option value="low">Low Confidence (&lt;50%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="divide-y divide-gray-200">
        {filteredInvoices.map(invoice => {
          const matchResults = data.matchingResults.find(r => r.invoiceId === invoice.id)
          const isExpanded = expandedInvoices.has(invoice.id)
          const highConfidenceMatches = matchResults?.matches.filter(m => m.confidence >= 0.7).length || 0
          
          return (
            <div key={invoice.id} className="px-6 py-4">
              {/* Invoice Header */}
              <div className="flex items-center justify-between">
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
                        <p className="text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-sm text-gray-500">{invoice.supplierName}</p>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>Date: {formatDate(invoice.invoiceDate)}</span>
                      <span>Amount: {formatCurrency(invoice.totalAmount)}</span>
                      <span>Line Items: {invoice.lineItems.length}</span>
                      {highConfidenceMatches > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {highConfidenceMatches} high confidence matches
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
                      const match = matchResults.matches.find(m => m.invoiceLineItemId === lineItem.id)
                      const selectedEstimateId = selectedMatches.get(lineItem.id)
                      
                      if (!match) return null
                      
                      const estimateItem = match.estimateLineItemId ? 
                        data.estimateLineItems.find(e => e.id === match.estimateLineItemId) : null
                      
                      return (
                        <div key={lineItem.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
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
                                {/* Confidence Badge */}
                                <div className="flex items-center justify-between">
                                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getConfidenceColor(match.confidence)}`}>
                                    <SparklesIcon className="h-3 w-3 mr-1" />
                                    {getConfidenceLabel(match.confidence)} ({Math.round(match.confidence * 100)}%)
                                  </div>
                                  <span className="text-xs text-gray-500">{match.reason}</span>
                                </div>
                                
                                {/* Suggested Estimate Match */}
                                <div className="bg-white border border-gray-200 rounded p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900">
                                        {estimateItem.description}
                                      </p>
                                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                                        <span>Trade: {estimateItem.trade.name}</span>
                                        <span>Qty: {estimateItem.quantity} {estimateItem.unit}</span>
                                        <span>
                                          Est: {formatCurrency(
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
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            handleMatchSelection(lineItem.id, estimateItem.id)
                                          } else {
                                            handleMatchSelection(lineItem.id, null)
                                          }
                                        }}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <label className="text-sm text-gray-700">Accept</label>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Manual Override Option */}
                                <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-3">
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">Override with Different Match</h5>
                                  <select
                                    value={selectedMatches.get(lineItem.id) !== estimateItem.id ? (selectedMatches.get(lineItem.id) || "") : ""}
                                    onChange={(e) => {
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
                                          {estItem.trade.name}: {estItem.description} - {formatCurrency(
                                            estItem.materialCostEst + estItem.laborCostEst + estItem.equipmentCostEst
                                          )}
                                        </option>
                                      ))}
                                  </select>
                                  {selectedMatches.get(lineItem.id) && selectedMatches.get(lineItem.id) !== estimateItem.id && (
                                    <div className="mt-2 text-xs text-green-600">
                                      ✓ Override applied - now matching to different estimate
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-center py-2 text-sm text-gray-500">
                                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                                  No automatic match found
                                </div>
                                
                                {/* Manual Matching */}
                                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">Manual Matching</h5>
                                  <div className="space-y-2">
                                    <select
                                      value={selectedMatches.get(lineItem.id) || ''}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        handleMatchSelection(lineItem.id, value || null)
                                      }}
                                      className="block w-full text-sm border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                                    >
                                      <option value="">Select an estimate to match...</option>
                                      {data.estimateLineItems.map(estItem => (
                                        <option key={estItem.id} value={estItem.id}>
                                          {estItem.trade.name}: {estItem.description} - {formatCurrency(
                                            estItem.materialCostEst + estItem.laborCostEst + estItem.equipmentCostEst
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