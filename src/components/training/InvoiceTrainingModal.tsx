/**
 * Invoice Training Modal
 * Allows users to correct parsing errors and train the system
 */

'use client'

import { useState } from 'react'
import { ParsedInvoice, trainParser } from '@/lib/pdf-parser'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface InvoiceTrainingModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: ParsedInvoice
  onTrainingComplete: () => void
}

export function InvoiceTrainingModal({
  isOpen,
  onClose,
  invoice,
  onTrainingComplete,
}: InvoiceTrainingModalProps) {
  const [correctedData, setCorrectedData] = useState({
    invoiceNumber: invoice.invoiceNumber || '',
    date: invoice.date || '',
    vendorName: invoice.vendorName || '',
    description: invoice.description || '',
    amount: invoice.amount?.toString() || '',
    tax: invoice.tax?.toString() || '',
    total: invoice.total?.toString() || '',
  })
  const [invoiceType, setInvoiceType] = useState('construction')
  const [isTraining, setIsTraining] = useState(false)
  const [trainingComplete, setTrainingComplete] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsTraining(true)

    try {
      const corrections: Partial<ParsedInvoice> = {}

      // Only include fields that were actually corrected
      if (correctedData.invoiceNumber !== (invoice.invoiceNumber || '')) {
        corrections.invoiceNumber = correctedData.invoiceNumber || null
      }
      if (correctedData.date !== (invoice.date || '')) {
        corrections.date = correctedData.date || null
      }
      if (correctedData.vendorName !== (invoice.vendorName || '')) {
        corrections.vendorName = correctedData.vendorName || null
      }
      if (correctedData.description !== (invoice.description || '')) {
        corrections.description = correctedData.description || null
      }
      if (correctedData.amount !== (invoice.amount?.toString() || '')) {
        corrections.amount = parseFloat(correctedData.amount) || null
      }
      if (correctedData.tax !== (invoice.tax?.toString() || '')) {
        corrections.tax = parseFloat(correctedData.tax) || null
      }
      if (correctedData.total !== (invoice.total?.toString() || '')) {
        corrections.total = parseFloat(correctedData.total) || null
      }

      // Train the parser with corrections
      const trainingId = trainParser(invoice, corrections, invoiceType)
      console.log('Training completed with ID:', trainingId)

      setTrainingComplete(true)
      setTimeout(() => {
        onTrainingComplete()
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Training failed:', error)
    } finally {
      setIsTraining(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setCorrectedData(prev => ({ ...prev, [field]: value }))
  }

  if (trainingComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Training Complete!</h3>
            <p className="mt-1 text-sm text-gray-500">
              The parser has learned from your corrections and will be more accurate for similar
              invoices.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Train Invoice Parser</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Correct any parsing errors below to help improve the AI's accuracy for future
              invoices. Only modify fields that were parsed incorrectly.
            </p>

            {/* Confidence indicator */}
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-sm font-medium text-gray-700">Parsing Confidence:</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                <div
                  className={`h-2 rounded-full ${
                    (invoice.confidence || 0) > 0.7
                      ? 'bg-green-600'
                      : (invoice.confidence || 0) > 0.4
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                  }`}
                  style={{ width: `${(invoice.confidence || 0) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-500">
                {Math.round((invoice.confidence || 0) * 100)}%
              </span>
            </div>

            {/* Invoice Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Type (helps categorize training data)
              </label>
              <select
                value={invoiceType}
                onChange={e => setInvoiceType(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="construction">Construction/General</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="hvac">HVAC</option>
                <option value="materials">Materials/Supplies</option>
                <option value="labor">Labor</option>
                <option value="equipment">Equipment Rental</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Invoice Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={correctedData.invoiceNumber}
                  onChange={e => handleInputChange('invoiceNumber', e.target.value)}
                  placeholder="Enter correct invoice number"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {invoice.invoiceNumber && (
                  <p className="text-xs text-gray-500 mt-1">Original: {invoice.invoiceNumber}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date</label>
                <input
                  type="date"
                  value={correctedData.date}
                  onChange={e => handleInputChange('date', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {invoice.date && (
                  <p className="text-xs text-gray-500 mt-1">Original: {invoice.date}</p>
                )}
              </div>

              {/* Vendor Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor/Company Name
                </label>
                <input
                  type="text"
                  value={correctedData.vendorName}
                  onChange={e => handleInputChange('vendorName', e.target.value)}
                  placeholder="Enter correct vendor name"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {invoice.vendorName && (
                  <p className="text-xs text-gray-500 mt-1">Original: {invoice.vendorName}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={correctedData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  placeholder="Enter work description"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {invoice.description && (
                  <p className="text-xs text-gray-500 mt-1">Original: {invoice.description}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtotal Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={correctedData.amount}
                  onChange={e => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {invoice.amount && (
                  <p className="text-xs text-gray-500 mt-1">Original: ${invoice.amount}</p>
                )}
              </div>

              {/* Tax */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={correctedData.tax}
                  onChange={e => handleInputChange('tax', e.target.value)}
                  placeholder="0.00"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {invoice.tax && (
                  <p className="text-xs text-gray-500 mt-1">Original: ${invoice.tax}</p>
                )}
              </div>

              {/* Total */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={correctedData.total}
                  onChange={e => handleInputChange('total', e.target.value)}
                  placeholder="0.00"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {invoice.total && (
                  <p className="text-xs text-gray-500 mt-1">Original: ${invoice.total}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isTraining}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTraining ? 'Training...' : 'Train Parser'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
