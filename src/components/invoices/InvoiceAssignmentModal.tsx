/**
 * Invoice Assignment Modal
 * Allows users to assign parsed invoices to projects
 */

'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { ProjectSelector } from '@/components/projects/ProjectSelector'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { ParsedInvoice } from '@/lib/pdf-parser'

interface InvoiceAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  invoices: ParsedInvoice[]
  onAssignmentComplete: (results: any) => void
}

export function InvoiceAssignmentModal({
  isOpen,
  onClose,
  invoices,
  onAssignmentComplete,
}: InvoiceAssignmentModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [assignmentResults, setAssignmentResults] = useState<any>(null)

  useEffect(() => {
    if (isOpen) {
      // Select all invoices by default
      setSelectedInvoices(new Set(invoices.map((_, index) => index)))
      setError(null)
      setAssignmentResults(null)
    }
  }, [isOpen, invoices])

  if (!isOpen) return null

  const handleInvoiceToggle = (index: number) => {
    const newSelected = new Set(selectedInvoices)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedInvoices(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedInvoices.size === invoices.length) {
      setSelectedInvoices(new Set())
    } else {
      setSelectedInvoices(new Set(invoices.map((_, index) => index)))
    }
  }

  const handleProjectCreated = (project: any) => {
    setSelectedProjectId(project.id)
    setShowCreateProject(false)
  }

  const handleAssign = async () => {
    if (!selectedProjectId || selectedInvoices.size === 0) {
      setError('Please select a project and at least one invoice')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const invoicesToSave = Array.from(selectedInvoices).map(index => invoices[index])

      const response = await fetch('/api/invoices/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          projectId: selectedProjectId,
          invoices: invoicesToSave,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAssignmentResults(data)
        setTimeout(() => {
          onAssignmentComplete(data)
          onClose()
        }, 2000)
      } else {
        setError(data.error || 'Failed to assign invoices')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Error assigning invoices:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show success results
  if (assignmentResults) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <CheckIcon className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Assignment Complete!</h3>
            <div className="mt-4 text-sm text-gray-600">
              <p>
                Successfully saved {assignmentResults.summary.savedCount} out of{' '}
                {assignmentResults.summary.totalInvoices} invoices
              </p>
              {assignmentResults.summary.errorCount > 0 && (
                <p className="text-red-600 mt-1">
                  {assignmentResults.summary.errorCount} invoice(s) had errors
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Assign Invoices to Project</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Project</label>
              <ProjectSelector
                selectedProjectId={selectedProjectId}
                onProjectSelect={project => setSelectedProjectId(project?.id || null)}
                onCreateProject={() => setShowCreateProject(true)}
              />
            </div>

            {/* Invoice Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Select Invoices ({selectedInvoices.size} of {invoices.length} selected)
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedInvoices.size === invoices.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div
                className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg"
                data-testid="parsed-invoices"
              >
                {invoices.map((invoice, index) => (
                  <div
                    key={index}
                    data-testid="invoice-item"
                    className={`p-4 border-b border-gray-100 last:border-b-0 transition-colors ${
                      selectedInvoices.has(index) ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.has(index)}
                        onChange={() => handleInvoiceToggle(index)}
                        className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h4
                              className="text-sm font-medium text-gray-900"
                              data-testid="invoice-number"
                            >
                              {invoice.invoiceNumber || `Invoice ${index + 1}`}
                            </h4>
                            {invoice.pageNumber && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Page {invoice.pageNumber}
                              </span>
                            )}
                            {invoice.confidence && invoice.confidence < 0.7 && (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                                data-testid="low-confidence-badge"
                              >
                                Low confidence
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p
                              className="text-sm font-semibold text-green-600"
                              data-testid="total-amount"
                            >
                              ${(invoice.total || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">Date:</span>{' '}
                            <span data-testid="invoice-date">{invoice.date || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium">Vendor:</span>{' '}
                            <span data-testid="vendor-name">{invoice.vendorName || 'N/A'}</span>
                          </div>
                        </div>

                        {invoice.description && (
                          <div className="mt-2 text-xs text-gray-600">
                            <span className="font-medium">Description:</span> {invoice.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            {selectedInvoices.size > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900">Assignment Summary</h4>
                <div className="mt-2 text-sm text-blue-700">
                  <p>{selectedInvoices.size} invoice(s) will be assigned to the selected project</p>
                  <p className="mt-1">
                    Total amount: $
                    {Array.from(selectedInvoices)
                      .reduce((sum, index) => sum + (invoices[index].total || 0), 0)
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            )}

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
                type="button"
                onClick={handleAssign}
                disabled={isSubmitting || !selectedProjectId || selectedInvoices.size === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Assigning...' : `Assign ${selectedInvoices.size} Invoice(s)`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onProjectCreated={handleProjectCreated}
      />
    </>
  )
}
