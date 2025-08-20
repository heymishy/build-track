'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { CameraIcon } from '@heroicons/react/24/outline'
import { ParsedInvoice, MultiInvoiceResult } from '@/lib/pdf-parser'
import { InvoiceTrainingModal } from '@/components/training/InvoiceTrainingModal'
import { TrainingStats } from '@/components/training/TrainingStats'
import { InvoiceAssignmentModal } from '@/components/invoices/InvoiceAssignmentModal'
import { InvoiceApprovalModal } from '@/components/invoices/InvoiceApprovalModal'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { ProjectDashboard } from '@/components/dashboard/ProjectDashboard'
import { ProjectAnalytics } from '@/components/analytics/ProjectAnalytics'
import { MobileDashboard } from '@/components/mobile/MobileDashboard'

export default function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'uploading' | null
    message: string
  }>({ type: null, message: '' })
  const [invoiceResult, setInvoiceResult] = useState<MultiInvoiceResult | null>(null)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set())
  const [trainingModalOpen, setTrainingModalOpen] = useState(false)
  const [trainingInvoice, setTrainingInvoice] = useState<ParsedInvoice | null>(null)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [selectedInvoiceForApproval, setSelectedInvoiceForApproval] = useState<{
    invoice: ParsedInvoice
    index: number
  } | null>(null)
  const [uploadedPdfFile, setUploadedPdfFile] = useState<File | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleLogout = () => {
    logout()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Store the PDF file for later use in approval modal
    setUploadedPdfFile(file)

    if (file.type !== 'application/pdf') {
      setUploadStatus({
        type: 'error',
        message: 'Please select a PDF file',
      })
      return
    }

    setUploadStatus({ type: 'uploading', message: 'Processing PDF...' })
    setInvoiceResult(null)
    setSelectedInvoices(new Set())

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/invoices/parse', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setUploadStatus({
          type: 'success',
          message: data.warning || data.result.summary,
        })
        setInvoiceResult(data.result)
      } else {
        setUploadStatus({
          type: 'error',
          message: data.error || 'Failed to process PDF',
        })
      }
    } catch {
      setUploadStatus({
        type: 'error',
        message: 'Network error. Please try again.',
      })
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleTrainInvoice = (invoice: ParsedInvoice) => {
    setTrainingInvoice(invoice)
    setTrainingModalOpen(true)
  }

  const handleTrainingComplete = () => {
    // Refresh any relevant data after training
    console.log('Training completed, refreshing data...')
  }

  const handleAssignInvoices = () => {
    if (invoiceResult && invoiceResult.invoices.length > 0) {
      setAssignmentModalOpen(true)
    }
  }

  const handleAssignmentComplete = (results: any) => {
    console.log('Assignment completed:', results)
    // Optionally refresh dashboard data or show success message
  }

  const handleInvoiceApproval = (invoice: ParsedInvoice, index: number) => {
    if (!uploadedPdfFile) {
      console.error('No PDF file available for approval')
      return
    }
    setSelectedInvoiceForApproval({ invoice, index })
    setApprovalModalOpen(true)
  }

  const handleApprovalComplete = async (approvedData: any, corrections: any) => {
    console.log('Invoice approved:', approvedData)
    console.log('Corrections made:', corrections)

    // Send corrections to training API for model improvement
    if (Object.keys(corrections).length > 0 && selectedInvoiceForApproval) {
      try {
        const trainingData = {
          invoiceText: '', // Would extract from PDF in real implementation
          originalExtraction: selectedInvoiceForApproval.invoice,
          correctedData: approvedData,
          userConfidence: Object.keys(corrections).reduce((acc: any, key) => {
            acc[key] = 1.0 // User correction implies 100% confidence
            return acc
          }, {}),
          pdfMetadata: {
            filename: uploadedPdfFile?.name || 'unknown.pdf',
            pageCount: 1, // Would detect from PDF
            fileSize: uploadedPdfFile?.size || 0,
          },
        }

        const response = await fetch('/api/invoices/training', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(trainingData),
        })

        if (response.ok) {
          const result = await response.json()
          console.log('Training data sent successfully:', result)
          setUploadStatus({
            type: 'success',
            message: `Invoice approved! ${result.corrections} corrections will improve AI accuracy.`,
          })
        }
      } catch (error) {
        console.error('Failed to send training data:', error)
        // Don't block approval on training failure
      }
    }

    setApprovalModalOpen(false)
    setSelectedInvoiceForApproval(null)

    // Update the invoice in the result
    if (invoiceResult && selectedInvoiceForApproval) {
      const updatedInvoices = [...invoiceResult.invoices]
      updatedInvoices[selectedInvoiceForApproval.index] = {
        ...updatedInvoices[selectedInvoiceForApproval.index],
        ...approvedData,
        isApproved: true,
      }
      setInvoiceResult({
        ...invoiceResult,
        invoices: updatedInvoices,
      })
    }
  }

  const handleApprovalRejection = (reason: string) => {
    console.log('Invoice rejected:', reason)

    // Here you would typically:
    // 1. Log the rejection reason
    // 2. Mark invoice as rejected
    // 3. Potentially trigger reprocessing or manual review

    setApprovalModalOpen(false)
    setSelectedInvoiceForApproval(null)

    // Update the invoice status
    if (invoiceResult && selectedInvoiceForApproval) {
      const updatedInvoices = [...invoiceResult.invoices]
      updatedInvoices[selectedInvoiceForApproval.index] = {
        ...updatedInvoices[selectedInvoiceForApproval.index],
        isRejected: true,
        rejectionReason: reason,
      }
      setInvoiceResult({
        ...invoiceResult,
        invoices: updatedInvoices,
      })
    }
  }

  if (!isAuthenticated || !user) {
    return null // Will redirect
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <MobileDashboard user={user} onLogout={handleLogout}>
        {/* PDF Invoice Upload - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mx-2 mb-4">
          <div className="p-4">
            <h3 className="text-base font-medium text-gray-900 mb-3">Upload Invoice PDF</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload invoices to extract cost information automatically.
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <CameraIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
              <label
                htmlFor="mobile-file-upload"
                className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 inline-block"
              >
                Choose File
                <input
                  ref={fileInputRef}
                  id="mobile-file-upload"
                  type="file"
                  accept=".pdf"
                  className="sr-only"
                  onChange={handleFileUpload}
                  disabled={uploadStatus.type === 'uploading'}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">PDF files up to 10MB</p>
            </div>

            {/* Upload Status - Mobile */}
            {uploadStatus.type && (
              <div
                className={`mt-4 p-3 rounded-md text-sm ${
                  uploadStatus.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : uploadStatus.type === 'error'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}
              >
                {uploadStatus.message}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Invoice Display */}
        {invoiceResult && invoiceResult.invoices.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mx-2 mb-4">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium text-gray-900">
                  Parsed Invoices ({invoiceResult.totalInvoices})
                </h3>
                <span className="text-sm font-semibold text-green-600">
                  {formatCurrency(invoiceResult.totalAmount)}
                </span>
              </div>

              <div className="space-y-3">
                {invoiceResult.invoices.map((invoice, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {invoice.invoiceNumber || `Invoice ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {invoice.vendorName} • {invoice.date}
                        </p>
                      </div>
                      <div className="ml-2 text-right">
                        <p className="text-sm font-semibold text-green-600">
                          ${(invoice.total || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        {!(invoice as any).isApproved && !(invoice as any).isRejected ? (
                          <button
                            onClick={() => handleInvoiceApproval(invoice, index)}
                            className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700"
                          >
                            Review
                          </button>
                        ) : (invoice as any).isApproved ? (
                          <button
                            onClick={() => console.log('Add to project')}
                            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
                          >
                            Add to Project
                          </button>
                        ) : (
                          <button
                            onClick={() => handleInvoiceApproval(invoice, index)}
                            className="text-xs bg-yellow-600 text-white px-3 py-1.5 rounded hover:bg-yellow-700"
                          >
                            Re-review
                          </button>
                        )}
                      </div>

                      {/* Status indicators */}
                      <div className="flex items-center space-x-2 text-xs">
                        {(invoice as any).isApproved && (
                          <span className="text-green-600 font-medium">✓ Approved</span>
                        )}
                        {(invoice as any).isRejected && (
                          <span className="text-red-600 font-medium">✗ Rejected</span>
                        )}
                        {invoice.confidence &&
                          invoice.confidence < 0.7 &&
                          !(invoice as any).isApproved && (
                            <span className="text-orange-600 font-medium">Low confidence</span>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={handleAssignInvoices}
                  className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Assign to Project
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modals for Mobile */}
        {trainingInvoice && (
          <InvoiceTrainingModal
            isOpen={trainingModalOpen}
            onClose={() => {
              setTrainingModalOpen(false)
              setTrainingInvoice(null)
            }}
            invoice={trainingInvoice}
            onTrainingComplete={handleTrainingComplete}
          />
        )}

        {invoiceResult && invoiceResult.invoices.length > 0 && (
          <InvoiceAssignmentModal
            isOpen={assignmentModalOpen}
            onClose={() => setAssignmentModalOpen(false)}
            invoices={invoiceResult.invoices}
            onAssignmentComplete={handleAssignmentComplete}
          />
        )}

        {selectedInvoiceForApproval && uploadedPdfFile && (
          <InvoiceApprovalModal
            isOpen={approvalModalOpen}
            onClose={() => {
              setApprovalModalOpen(false)
              setSelectedInvoiceForApproval(null)
            }}
            invoice={selectedInvoiceForApproval.invoice}
            pdfFile={uploadedPdfFile}
            onApproval={handleApprovalComplete}
            onRejection={handleApprovalRejection}
          />
        )}
      </MobileDashboard>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount)
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-gray-50 hidden lg:block">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">BuildTrack</h1>
              <p className="mt-1 text-sm text-gray-500">Construction Project Management</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{user.name}</span>
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-8">
          {/* Dashboard Overview */}
          <DashboardOverview />

          {/* Project Management Dashboard */}
          <ProjectDashboard />

          {/* Project Analytics & Reporting */}
          <ProjectAnalytics />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* PDF Invoice Upload */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Upload Invoice PDF
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload a PDF invoice to extract project cost information automatically.
                </p>

                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload Invoice</span>
                        <input
                          ref={fileInputRef}
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          accept=".pdf"
                          className="sr-only"
                          onChange={handleFileUpload}
                          disabled={uploadStatus.type === 'uploading'}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF files up to 10MB</p>
                  </div>
                </div>

                {/* Upload Status */}
                {uploadStatus.type && (
                  <div
                    data-testid={
                      uploadStatus.type === 'error' ? 'parsing-error' : 'parsing-progress'
                    }
                    className={`mt-4 p-3 rounded-md ${
                      uploadStatus.type === 'success'
                        ? 'bg-green-50 border border-green-200'
                        : uploadStatus.type === 'error'
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        uploadStatus.type === 'success'
                          ? 'text-green-800'
                          : uploadStatus.type === 'error'
                            ? 'text-red-800'
                            : 'text-blue-800'
                      }`}
                    >
                      {uploadStatus.message}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Multiple Invoices Display */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Parsed Invoice Data
                </h3>

                {invoiceResult && invoiceResult.invoices.length > 0 ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-blue-900">
                            {invoiceResult.totalInvoices} Invoice
                            {invoiceResult.totalInvoices !== 1 ? 's' : ''} Found
                          </h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Total Amount:{' '}
                            <span className="font-semibold">
                              ${invoiceResult.totalAmount.toFixed(2)}
                            </span>
                          </p>
                        </div>
                        <div className="text-right space-y-2">
                          <p className="text-xs text-blue-600">{selectedInvoices.size} selected</p>
                          <div className="flex flex-col space-y-1">
                            {selectedInvoices.size > 0 && (
                              <button
                                onClick={() => {
                                  const selectedInvoicesList = Array.from(selectedInvoices).map(
                                    index => invoiceResult.invoices[index]
                                  )
                                  console.log('Add selected invoices:', selectedInvoicesList)
                                  // TODO: Implement bulk add functionality
                                }}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                              >
                                Add Selected ({selectedInvoices.size})
                              </button>
                            )}
                            <button
                              onClick={handleAssignInvoices}
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                            >
                              Assign to Project
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Individual Invoices */}
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {invoiceResult.invoices.map((invoice, index) => (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 transition-colors ${
                            selectedInvoices.has(index)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              {/* Invoice Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedInvoices.has(index)}
                                    onChange={e => {
                                      const newSelected = new Set(selectedInvoices)
                                      if (e.target.checked) {
                                        newSelected.add(index)
                                      } else {
                                        newSelected.delete(index)
                                      }
                                      setSelectedInvoices(newSelected)
                                    }}
                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                  <div className="text-sm">
                                    <span className="font-medium text-gray-900">
                                      {invoice.invoiceNumber || `Invoice ${index + 1}`}
                                    </span>
                                    {invoice.pageNumber && (
                                      <span className="ml-2 text-gray-500">
                                        (Page {invoice.pageNumber})
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-semibold text-green-600">
                                    ${(invoice.total || 0).toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              {/* Invoice Details */}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                                <div>
                                  <span className="font-medium">Date:</span> {invoice.date || 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">Vendor:</span>{' '}
                                  {invoice.vendorName || 'N/A'}
                                </div>
                                {invoice.amount && invoice.amount !== invoice.total && (
                                  <>
                                    <div>
                                      <span className="font-medium">Amount:</span> ${invoice.amount}
                                    </div>
                                    <div>
                                      <span className="font-medium">Tax:</span> ${invoice.tax || 0}
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Description */}
                              {invoice.description && (
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium">Description:</span>{' '}
                                  {invoice.description}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="ml-3 flex flex-col space-y-1">
                              {/* Show different buttons based on approval status */}
                              {!(invoice as any).isApproved && !(invoice as any).isRejected ? (
                                <>
                                  <button
                                    onClick={() => handleInvoiceApproval(invoice, index)}
                                    className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    title="Review and approve invoice data"
                                  >
                                    Review
                                  </button>
                                  <button
                                    onClick={() => handleTrainInvoice(invoice)}
                                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    title="Train AI on this invoice"
                                  >
                                    Train
                                  </button>
                                </>
                              ) : (invoice as any).isApproved ? (
                                <button
                                  onClick={() => {
                                    // TODO: Add approved invoice to project
                                    console.log('Add approved invoice:', invoice)
                                  }}
                                  className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                  Add to Project
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleInvoiceApproval(invoice, index)}
                                  className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                  title="Re-review rejected invoice"
                                >
                                  Re-review
                                </button>
                              )}
                              {/* Status Indicators */}
                              {(invoice as any).isApproved && (
                                <div className="text-xs text-green-600 font-medium">✓ Approved</div>
                              )}
                              {(invoice as any).isRejected && (
                                <div className="text-xs text-red-600 font-medium">✗ Rejected</div>
                              )}
                              {invoice.confidence &&
                                invoice.confidence < 0.7 &&
                                !(invoice as any).isApproved && (
                                  <div className="text-xs text-orange-600 font-medium">
                                    Low confidence
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mt-2">No invoice data yet</p>
                    <p className="text-sm">Upload a PDF to see parsed data here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Training Section */}
          <div className="mt-8">
            <TrainingStats />
          </div>
        </div>
      </main>

      {/* Training Modal */}
      {trainingInvoice && (
        <InvoiceTrainingModal
          isOpen={trainingModalOpen}
          onClose={() => {
            setTrainingModalOpen(false)
            setTrainingInvoice(null)
          }}
          invoice={trainingInvoice}
          onTrainingComplete={handleTrainingComplete}
        />
      )}

      {/* Invoice Assignment Modal */}
      {invoiceResult && invoiceResult.invoices.length > 0 && (
        <InvoiceAssignmentModal
          isOpen={assignmentModalOpen}
          onClose={() => setAssignmentModalOpen(false)}
          invoices={invoiceResult.invoices}
          onAssignmentComplete={handleAssignmentComplete}
        />
      )}

      {/* Invoice Approval Modal */}
      {selectedInvoiceForApproval && uploadedPdfFile && (
        <InvoiceApprovalModal
          isOpen={approvalModalOpen}
          onClose={() => {
            setApprovalModalOpen(false)
            setSelectedInvoiceForApproval(null)
          }}
          invoice={selectedInvoiceForApproval.invoice}
          pdfFile={uploadedPdfFile}
          onApproval={handleApprovalComplete}
          onRejection={handleApprovalRejection}
        />
      )}
    </div>
  )
}
