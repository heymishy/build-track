/**
 * Create Project Modal
 * Allows users to create new construction projects
 */

'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: (project: any) => void
}

export function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    totalBudget: '',
    currency: 'NZD',
    startDate: '',
    estimatedEndDate: '',
    status: 'PLANNING',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          budget: parseFloat(formData.totalBudget), // API expects 'budget' but maps to 'totalBudget'
          currency: formData.currency,
          startDate: formData.startDate || null,
          expectedEndDate: formData.estimatedEndDate || null, // API expects 'expectedEndDate' but maps to 'estimatedEndDate'
          status: formData.status,
        }),
      })

      const data = await response.json()

      if (data.success) {
        onProjectCreated(data.project)
        onClose()
        // Reset form
        setFormData({
          name: '',
          description: '',
          totalBudget: '',
          currency: 'NZD',
          startDate: '',
          estimatedEndDate: '',
          status: 'PLANNING',
        })
      } else {
        setError(data.error || 'Failed to create project')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Error creating project:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null) // Clear error when user starts typing
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Project Name *
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder="e.g., Kitchen Renovation, New House Build"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Project Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              placeholder="Brief description of the construction project..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Budget and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="totalBudget" className="block text-sm font-medium text-gray-700 mb-2">
                Total Budget *
              </label>
              <input
                id="totalBudget"
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.totalBudget}
                onChange={e => handleInputChange('totalBudget', e.target.value)}
                placeholder="50000.00"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                id="currency"
                value={formData.currency}
                onChange={e => handleInputChange('currency', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="NZD">NZD (New Zealand Dollar)</option>
                <option value="AUD">AUD (Australian Dollar)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
              </select>
            </div>
          </div>

          {/* Project Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={e => handleInputChange('startDate', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="estimatedEndDate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Estimated End Date
              </label>
              <input
                id="estimatedEndDate"
                type="date"
                value={formData.estimatedEndDate}
                onChange={e => handleInputChange('estimatedEndDate', e.target.value)}
                min={formData.startDate || undefined}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Project Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Initial Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={e => handleInputChange('status', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PLANNING">Planning</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
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
              disabled={isSubmitting || !formData.name || !formData.totalBudget}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
