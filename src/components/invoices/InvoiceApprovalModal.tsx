'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { InvoicePdfViewer } from './InvoicePdfViewer'
import { ParsedInvoice } from '@/lib/pdf-parser'

interface InvoiceField {
  key: string
  label: string
  extractedValue: string | number | null
  userValue: string | number | null
  confidence?: number
  isVerified: boolean
  isRequired: boolean
  type: 'text' | 'number' | 'date' | 'currency'
  highlight?: {
    page: number
    x: number
    y: number
    width: number
    height: number
  }
}

interface InvoiceApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: ParsedInvoice
  pdfFile: File
  onApproval: (approvedData: any, corrections: any) => void
  onRejection: (reason: string) => void
}

export function InvoiceApprovalModal({
  isOpen,
  onClose,
  invoice,
  pdfFile,
  onApproval,
  onRejection,
}: InvoiceApprovalModalProps) {
  const [fields, setFields] = useState<InvoiceField[]>([])
  const [showPdf, setShowPdf] = useState(true)
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>(
    'pending'
  )
  const [rejectionReason, setRejectionReason] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    if (invoice) {
      initializeFields()
    }
  }, [invoice])

  const initializeFields = () => {
    const invoiceFields: InvoiceField[] = [
      {
        key: 'invoiceNumber',
        label: 'Invoice Number',
        extractedValue: invoice.invoiceNumber || '',
        userValue: invoice.invoiceNumber || '',
        confidence: invoice.confidence,
        isVerified: false,
        isRequired: true,
        type: 'text',
      },
      {
        key: 'vendorName',
        label: 'Vendor Name',
        extractedValue: invoice.vendorName || '',
        userValue: invoice.vendorName || '',
        confidence: invoice.confidence,
        isVerified: false,
        isRequired: true,
        type: 'text',
      },
      {
        key: 'date',
        label: 'Invoice Date',
        extractedValue: invoice.date || '',
        userValue: invoice.date || '',
        confidence: invoice.confidence,
        isVerified: false,
        isRequired: true,
        type: 'date',
      },
      {
        key: 'amount',
        label: 'Subtotal',
        extractedValue: invoice.amount || 0,
        userValue: invoice.amount || 0,
        confidence: invoice.confidence,
        isVerified: false,
        isRequired: true,
        type: 'currency',
      },
      {
        key: 'tax',
        label: 'Tax/GST',
        extractedValue: invoice.tax || 0,
        userValue: invoice.tax || 0,
        confidence: invoice.confidence,
        isVerified: false,
        isRequired: false,
        type: 'currency',
      },
      {
        key: 'total',
        label: 'Total Amount',
        extractedValue: invoice.total || 0,
        userValue: invoice.total || 0,
        confidence: invoice.confidence,
        isVerified: false,
        isRequired: true,
        type: 'currency',
      },
      {
        key: 'description',
        label: 'Description',
        extractedValue: invoice.description || '',
        userValue: invoice.description || '',
        confidence: invoice.confidence,
        isVerified: false,
        isRequired: false,
        type: 'text',
      },
    ]

    setFields(invoiceFields)
  }

  const updateFieldValue = (key: string, value: string | number) => {
    setFields(prev =>
      prev.map(field =>
        field.key === key ? { ...field, userValue: value, isVerified: true } : field
      )
    )
  }

  const toggleFieldVerification = (key: string) => {
    setFields(prev =>
      prev.map(field => (field.key === key ? { ...field, isVerified: !field.isVerified } : field))
    )
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500'
    if (confidence > 0.8) return 'text-green-600'
    if (confidence > 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return null
    if (confidence > 0.8) return <CheckCircleIcon className="h-4 w-4 text-green-600" />
    if (confidence > 0.6) return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
    return <XCircleIcon className="h-4 w-4 text-red-600" />
  }

  const validateFields = () => {
    const errors: string[] = []
    const requiredFields = fields.filter(f => f.isRequired)

    requiredFields.forEach(field => {
      if (!field.userValue || field.userValue === '') {
        errors.push(`${field.label} is required`)
      }
    })

    // Validate total calculation
    const amount = Number(fields.find(f => f.key === 'amount')?.userValue || 0)
    const tax = Number(fields.find(f => f.key === 'tax')?.userValue || 0)
    const total = Number(fields.find(f => f.key === 'total')?.userValue || 0)

    if (Math.abs(amount + tax - total) > 0.01) {
      errors.push('Total amount does not match subtotal + tax')
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleApproval = () => {
    if (!validateFields()) return

    const corrections = fields.reduce((acc, field) => {
      if (field.extractedValue !== field.userValue) {
        acc[field.key] = {
          original: field.extractedValue,
          corrected: field.userValue,
          confidence: field.confidence,
        }
      }
      return acc
    }, {} as any)

    const approvedData = fields.reduce((acc, field) => {
      acc[field.key] = field.userValue
      return acc
    }, {} as any)

    onApproval(approvedData, corrections)
    setApprovalStatus('approved')
  }

  const handleRejection = () => {
    if (!rejectionReason.trim()) {
      setValidationErrors(['Please provide a reason for rejection'])
      return
    }

    onRejection(rejectionReason)
    setApprovalStatus('rejected')
  }

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(num || 0)
  }

  const renderFieldInput = (field: InvoiceField) => {
    const commonClasses =
      'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'

    switch (field.type) {
      case 'currency':
        return (
          <input
            type="number"
            step="0.01"
            value={field.userValue || ''}
            onChange={e => updateFieldValue(field.key, parseFloat(e.target.value) || 0)}
            className={commonClasses}
          />
        )
      case 'date':
        return (
          <input
            type="date"
            value={field.userValue || ''}
            onChange={e => updateFieldValue(field.key, e.target.value)}
            className={commonClasses}
          />
        )
      default:
        return (
          <input
            type="text"
            value={field.userValue || ''}
            onChange={e => updateFieldValue(field.key, e.target.value)}
            className={commonClasses}
          />
        )
    }
  }

  // Generate highlights for PDF viewer
  const highlights = fields
    .filter(field => field.highlight)
    .map(field => ({
      ...field.highlight!,
      label: field.label,
      confidence: field.confidence,
    }))

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-25" />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-6xl w-full bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <Dialog.Title className="text-lg font-medium text-gray-900">
                  Invoice Approval & Verification
                </Dialog.Title>
                <p className="mt-1 text-sm text-gray-500">
                  Review the extracted data and verify accuracy against the PDF
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowPdf(!showPdf)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  {showPdf ? 'Hide' : 'Show'} PDF
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex h-[700px]">
              {/* PDF Viewer */}
              {showPdf && (
                <div className="w-1/2 border-r border-gray-200">
                  <InvoicePdfViewer
                    pdfFile={pdfFile}
                    className="h-full border-none rounded-none"
                    highlightRegions={highlights}
                  />
                </div>
              )}

              {/* Fields Verification */}
              <div className={`${showPdf ? 'w-1/2' : 'w-full'} p-6 overflow-y-auto`}>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Extracted Data Verification
                </h3>

                {validationErrors.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                      <XCircleIcon className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
                        <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                          {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {fields.map(field => (
                    <div key={field.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.label}
                          {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className="flex items-center space-x-2">
                          {field.confidence && (
                            <div className="flex items-center space-x-1">
                              {getConfidenceIcon(field.confidence)}
                              <span className={`text-xs ${getConfidenceColor(field.confidence)}`}>
                                {Math.round(field.confidence * 100)}%
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => toggleFieldVerification(field.key)}
                            className={`p-1 rounded ${
                              field.isVerified
                                ? 'text-green-600 bg-green-50'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                            title={field.isVerified ? 'Verified' : 'Click to verify'}
                          >
                            {field.isVerified ? (
                              <CheckCircleIcon className="h-4 w-4" />
                            ) : (
                              <PencilIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Show extracted vs current value */}
                      {field.extractedValue !== field.userValue && (
                        <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                          Original:{' '}
                          {field.type === 'currency'
                            ? formatCurrency(field.extractedValue as number)
                            : String(field.extractedValue)}
                        </div>
                      )}

                      {renderFieldInput(field)}

                      {field.type === 'currency' && field.userValue && (
                        <div className="text-sm text-gray-500">
                          {formatCurrency(field.userValue as number)}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Rejection Reason (if needed) */}
                  {approvalStatus === 'pending' && (
                    <div className="pt-6 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rejection Reason (optional)
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        rows={3}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Provide reason if rejecting this invoice..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  Verified: {fields.filter(f => f.isVerified).length} / {fields.length} fields
                </div>
                {invoice.confidence && (
                  <div className="text-sm">
                    <span className="text-gray-500">Overall Confidence: </span>
                    <span className={getConfidenceColor(invoice.confidence)}>
                      {Math.round(invoice.confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejection}
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject
                </button>
                <button
                  onClick={handleApproval}
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                >
                  Approve & Process
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  )
}
