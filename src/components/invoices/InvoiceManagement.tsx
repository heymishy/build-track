/**
 * Invoice Management Component
 * Displays and manages already uploaded invoices with editing capabilities
 */

'use client'

import { useState, useEffect } from 'react'
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  DocumentIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { InvoiceApprovalModal } from './InvoiceApprovalModal'
import { InvoiceCategorySummary } from './InvoiceCategorySummary'
import { ParsedInvoice, MultiInvoiceResult } from '@/lib/pdf-parser'
import ClientOnlyPdfViewer from './ClientOnlyPdfViewer'
import ExtractionQualityDisplay from './ExtractionQualityDisplay'

interface Invoice {
  id: string
  invoiceNumber: string
  supplierName: string
  invoiceDate: string
  dueDate?: string
  totalAmount: number
  gstAmount: number
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'DISPUTED' | 'REJECTED'
  notes?: string
  pdfUrl?: string
  project: {
    id: string
    name: string
    status: string
  }
  user: {
    id: string
    name: string
    email: string
  }
  lineItems: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
    category: string
  }>
  _count: {
    lineItems: number
  }
  createdAt: string
  updatedAt: string
}

interface InvoiceManagementProps {
  projectId?: string
  className?: string
  pendingParsedInvoices?: MultiInvoiceResult | null
  onAssignParsedInvoices?: () => void
  uploadedPdfFile?: File | null
}

// Mock project data for category summary (should come from context in real implementation)
const getCurrentProject = () => {
  return {
    id: 'mock-project-id',
    name: 'Mock Project',
  }
}

export function InvoiceManagement({
  projectId,
  className = '',
  pendingParsedInvoices,
  onAssignParsedInvoices,
  uploadedPdfFile,
}: InvoiceManagementProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [viewMode, setViewMode] = useState<'saved' | 'pending' | 'all'>('all')
  const [reviewingInvoice, setReviewingInvoice] = useState<ParsedInvoice | null>(null)
  const [showPdfReviewModal, setShowPdfReviewModal] = useState(false)
  const [detailTab, setDetailTab] = useState<'details' | 'categories' | 'image'>('details')
  const [pdfFileData, setPdfFileData] = useState<File | null>(null)

  // Mock current project (in real implementation, this would come from context)
  const currentProject = getCurrentProject()

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    fetchInvoices()
  }, [projectId, currentPage, searchTerm, statusFilter])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      })

      if (projectId) params.append('projectId', projectId)
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/invoices?${params}`)
      const data = await response.json()

      if (data.success) {
        setInvoices(data.invoices)
        setTotalPages(data.pagination.totalPages)
        setSummary(data.summary)
      } else {
        setError(data.error || 'Failed to fetch invoices')
      }
    } catch (err) {
      setError('Failed to fetch invoices')
      console.error('Invoice fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (invoiceId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()
      if (data.success) {
        // Update local state
        setInvoices(prev =>
          prev.map(inv => (inv.id === invoiceId ? { ...inv, status: newStatus as any } : inv))
        )
      } else {
        setError(data.error || 'Failed to update invoice status')
      }
    } catch (err) {
      setError('Failed to update invoice status')
      console.error('Status update error:', err)
    }
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        setInvoices(prev => prev.filter(inv => inv.id !== invoiceId))
      } else {
        setError(data.error || 'Failed to delete invoice')
      }
    } catch (err) {
      setError('Failed to delete invoice')
      console.error('Delete error:', err)
    }
  }

  const handleReviewPdf = (invoice: ParsedInvoice) => {
    if (!uploadedPdfFile) {
      setError('PDF file not available for review')
      return
    }
    setReviewingInvoice(invoice)
    setShowPdfReviewModal(true)
  }

  const handlePdfReviewClose = () => {
    setShowPdfReviewModal(false)
    setReviewingInvoice(null)
  }

  const handlePdfApproval = (approvedData: any, corrections: any) => {
    console.log('PDF Review - Approved data:', approvedData)
    console.log('PDF Review - Corrections:', corrections)
    // Could update the pending invoice data here if needed
    handlePdfReviewClose()
  }

  const handlePdfRejection = (reason: string) => {
    console.log('PDF Review - Rejection reason:', reason)
    handlePdfReviewClose()
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'PAID':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'PENDING':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'DISPUTED':
        return 'text-orange-700 bg-orange-50 border-orange-200'
      case 'REJECTED':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'PAID':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'PENDING':
        return <ClockIcon className="h-4 w-4" />
      case 'DISPUTED':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'REJECTED':
        return <XCircleIcon className="h-4 w-4" />
      default:
        return <DocumentIcon className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Invoice Management</h3>
            {viewMode === 'all' && (
              <p className="mt-1 text-sm text-gray-500">
                {(summary?.total || 0) + (pendingParsedInvoices?.totalInvoices || 0)} invoices •{' '}
                {formatCurrency(
                  (summary?.totalAmount || 0) + (pendingParsedInvoices?.totalAmount || 0)
                )}{' '}
                total
              </p>
            )}
            {viewMode === 'saved' && summary && (
              <p className="mt-1 text-sm text-gray-500">
                {summary.total} invoices • {formatCurrency(summary.totalAmount)} total
              </p>
            )}
            {viewMode === 'pending' && pendingParsedInvoices && (
              <p className="mt-1 text-sm text-gray-500">
                {pendingParsedInvoices.totalInvoices} pending invoices •{' '}
                {formatCurrency(pendingParsedInvoices.totalAmount)} total
              </p>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="mt-4">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setViewMode('all')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Invoices
              {(summary?.total || 0) + (pendingParsedInvoices?.totalInvoices || 0) > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {(summary?.total || 0) + (pendingParsedInvoices?.totalInvoices || 0)}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode('saved')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'saved'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Saved Invoices
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                {summary?.total || 0}
              </span>
            </button>
            {pendingParsedInvoices && pendingParsedInvoices.totalInvoices > 0 && (
              <button
                onClick={() => setViewMode('pending')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  viewMode === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Assignment
                <span className="ml-2 bg-orange-100 text-orange-900 py-0.5 px-2.5 rounded-full text-xs">
                  {pendingParsedInvoices.totalInvoices}
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
                <option value="DISPUTED">Disputed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="mt-2 text-xs text-red-600 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Invoice List */}
      <div className="divide-y divide-gray-200">
        {/* Saved Invoices */}
        {(viewMode === 'saved' || viewMode === 'all') && (
          <>
            {invoices.length === 0 && viewMode === 'saved' ? (
              <div className="px-6 py-12 text-center">
                <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No saved invoices found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Upload and assign invoices to see them here'}
                </p>
              </div>
            ) : (
              <>
                {viewMode === 'all' && invoices.length > 0 && (
                  <div className="px-6 py-2 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-900">Saved Invoices</h4>
                  </div>
                )}
                {invoices.map(invoice => (
                  <div key={invoice.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {invoice.invoiceNumber}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{invoice.supplierName}</p>
                          </div>
                          <div
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                              invoice.status
                            )}`}
                          >
                            {getStatusIcon(invoice.status)}
                            <span className="ml-1">{invoice.status}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <span>Date: {formatDate(invoice.invoiceDate)}</span>
                          <span>Amount: {formatCurrency(invoice.totalAmount)}</span>
                          <span>Items: {invoice._count.lineItems}</span>
                          {!projectId && <span>Project: {invoice.project.name}</span>}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Status Dropdown */}
                        <select
                          value={invoice.status}
                          onChange={e => handleStatusUpdate(invoice.id, e.target.value)}
                          className="text-xs border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="APPROVED">Approved</option>
                          <option value="PAID">Paid</option>
                          <option value="DISPUTED">Disputed</option>
                          <option value="REJECTED">Rejected</option>
                        </select>

                        {/* Action Buttons */}
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice)
                            setPdfFileData(null) // Clear PDF data when switching invoices
                            setDetailTab('details') // Reset to details tab
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="View details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingInvoice(invoice)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit invoice"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete invoice"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* Pending Parsed Invoices */}
        {(viewMode === 'pending' || viewMode === 'all') && pendingParsedInvoices && (
          <>
            {viewMode === 'all' && pendingParsedInvoices.totalInvoices > 0 && (
              <div className="px-6 py-2 bg-orange-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">Pending Assignment</h4>
                  {onAssignParsedInvoices && (
                    <button
                      onClick={onAssignParsedInvoices}
                      className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
                    >
                      Assign to Project
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* PDF Extraction Quality Display */}
            {pendingParsedInvoices.qualityMetrics && (
              <div className="px-6 py-4 border-b">
                <ExtractionQualityDisplay result={pendingParsedInvoices} />
              </div>
            )}
            {pendingParsedInvoices.invoices.map((invoice, index) => (
              <div key={`pending-${index}`} className="px-6 py-4 hover:bg-orange-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {invoice.invoiceNumber || `Invoice ${index + 1}`}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {invoice.vendorName || 'Unknown Supplier'}
                        </p>
                      </div>
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-orange-200 bg-orange-100 text-orange-800">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        Awaiting Assignment
                      </div>
                      {invoice.confidence && invoice.confidence < 0.7 && (
                        <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⚠️ Low Confidence
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>Date: {invoice.date || 'Not detected'}</span>
                      <span>Amount: {formatCurrency(invoice.total || 0)}</span>
                      {invoice.pageNumber && <span>Page: {invoice.pageNumber}</span>}
                      {invoice.confidence && (
                        <span>Confidence: {(invoice.confidence * 100).toFixed(0)}%</span>
                      )}
                    </div>
                    {invoice.description && (
                      <div className="mt-1 text-xs text-gray-600 truncate">
                        {invoice.description}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {uploadedPdfFile && (
                      <button
                        onClick={() => handleReviewPdf(invoice)}
                        className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700"
                        title="Review PDF vs extracted text"
                      >
                        <EyeIcon className="h-3 w-3 inline mr-1" />
                        Review PDF
                      </button>
                    )}
                    {onAssignParsedInvoices && (
                      <button
                        onClick={onAssignParsedInvoices}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
                        title="Assign to project"
                      >
                        Assign
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Empty state for all modes */}
        {((viewMode === 'all' &&
          invoices.length === 0 &&
          (!pendingParsedInvoices || pendingParsedInvoices.totalInvoices === 0)) ||
          (viewMode === 'pending' &&
            (!pendingParsedInvoices || pendingParsedInvoices.totalInvoices === 0))) && (
          <div className="px-6 py-12 text-center">
            <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {viewMode === 'pending' ? 'No pending invoices' : 'No invoices found'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {viewMode === 'pending'
                ? 'Upload a PDF to parse new invoices'
                : searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Upload your first invoice to get started'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal with Tabs */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Invoice Details - {selectedInvoice.invoiceNumber}
              </h3>
              <button
                onClick={() => {
                  setSelectedInvoice(null)
                  setPdfFileData(null) // Clear PDF data when closing modal
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setDetailTab('details')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    detailTab === 'details'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Invoice Details
                </button>
                <button
                  onClick={() => setDetailTab('categories')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    detailTab === 'categories'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Category Summary
                </button>
                <button
                  onClick={() => setDetailTab('image')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    detailTab === 'image'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  PDF Image
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {detailTab === 'details' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Invoice Information</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Number:</span> {selectedInvoice.invoiceNumber}
                      </p>
                      <p>
                        <span className="font-medium">Supplier:</span>{' '}
                        {selectedInvoice.supplierName}
                      </p>
                      <p>
                        <span className="font-medium">Date:</span>{' '}
                        {formatDate(selectedInvoice.invoiceDate)}
                      </p>
                      <p>
                        <span className="font-medium">Total:</span>{' '}
                        {formatCurrency(selectedInvoice.totalAmount)}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ml-2 ${getStatusColor(selectedInvoice.status)}`}
                        >
                          {getStatusIcon(selectedInvoice.status)}
                          <span className="ml-1">{selectedInvoice.status}</span>
                        </span>
                      </p>
                    </div>
                  </div>

                  {selectedInvoice.pdfUrl && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">PDF Document</h4>
                      <a
                        href={selectedInvoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <DocumentIcon className="h-4 w-4 mr-2" />
                        View PDF
                      </a>
                    </div>
                  )}
                </div>

                {/* Line Items */}
                {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Line Items</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Unit Price
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedInvoice.lineItems.map((item, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {Number(item.quantity).toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(Number(item.unitPrice))}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                {formatCurrency(Number(item.totalPrice))}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {item.category}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedInvoice.notes && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      {selectedInvoice.notes}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Category Summary Tab */}
            {detailTab === 'categories' && currentProject && (
              <InvoiceCategorySummary
                invoiceId={selectedInvoice.id}
                projectId={projectId || currentProject.id}
                onCategorize={() => {
                  // Refresh the invoice data after categorization
                  fetchInvoices()
                }}
              />
            )}

            {detailTab === 'image' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h4 className="font-medium text-gray-900 mb-2">PDF Screenshot</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Visual representation of the original invoice for verification (50% scale)
                  </p>

                  {pdfFileData ? (
                    <div className="space-y-4">
                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                        <ClientOnlyPdfViewer
                          pdfFile={pdfFileData}
                          className="max-h-96"
                          pageNumber={1}
                        />
                      </div>
                      <button
                        onClick={() => setPdfFileData(null)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Remove PDF
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                      <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500 mb-4">
                        Upload the original PDF file to view screenshots alongside extracted data
                      </p>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setPdfFileData(file)
                          }
                        }}
                        className="hidden"
                        id={`pdf-upload-${selectedInvoice.id}`}
                      />
                      <label
                        htmlFor={`pdf-upload-${selectedInvoice.id}`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                      >
                        <DocumentIcon className="h-4 w-4 mr-2" />
                        Upload PDF for Preview
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setSelectedInvoice(null)
                  setPdfFileData(null) // Clear PDF data when closing modal
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedInvoice(null)
                  setPdfFileData(null) // Clear PDF data when approving
                  // Add approval logic here if needed
                }}
                disabled={selectedInvoice.status !== 'PENDING'}
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Review Modal */}
      {reviewingInvoice && uploadedPdfFile && (
        <InvoiceApprovalModal
          isOpen={showPdfReviewModal}
          onClose={handlePdfReviewClose}
          invoice={reviewingInvoice}
          pdfFile={uploadedPdfFile}
          onApproval={handlePdfApproval}
          onRejection={handlePdfRejection}
        />
      )}
    </div>
  )
}
