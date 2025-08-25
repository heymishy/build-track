/**
 * Edit Project Modal
 * Allows users to edit and delete existing projects
 */

'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  description?: string
  totalBudget: number
  currency: string
  startDate?: string
  estimatedEndDate?: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
}

interface EditProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project
  onProjectUpdated: (project: Project) => void
  onProjectDeleted: (projectId: string) => void
}

export function EditProjectModal({
  isOpen,
  onClose,
  project,
  onProjectUpdated,
  onProjectDeleted,
}: EditProjectModalProps) {
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
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        totalBudget: project.totalBudget.toString(),
        currency: project.currency,
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        estimatedEndDate: project.estimatedEndDate ? project.estimatedEndDate.split('T')[0] : '',
        status: project.status,
      })
      setError(null)
      setShowDeleteConfirm(false)
    }
  }, [isOpen, project])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${project.id}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          totalBudget: parseFloat(formData.totalBudget),
          startDate: formData.startDate || null,
          estimatedEndDate: formData.estimatedEndDate || null,
          status: formData.status,
        }),
      })

      const data = await response.json()

      if (data.success) {
        onProjectUpdated(data.project)
        onClose()
      } else {
        setError(data.error || 'Failed to update project')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Error updating project:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${project.id}/delete`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (data.success) {
        onProjectDeleted(project.id)
        onClose()
      } else {
        setError(data.error || 'Failed to delete project')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Error deleting project:', err)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null)
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">Edit Project</h2>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete project"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter project name"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Project description (optional)"
            />
          </div>

          {/* Budget and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="totalBudget" className="block text-sm font-medium text-gray-700 mb-2">
                Total Budget *
              </label>
              <input
                id="totalBudget"
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.totalBudget}
                onChange={e => handleInputChange('totalBudget', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="0.00"
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="NZD">NZD</option>
                <option value="USD">USD</option>
                <option value="AUD">AUD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={e => handleInputChange('startDate', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Project Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={e => handleInputChange('status', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="PLANNING">Planning</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Project'}
            </button>
          </div>
        </form>

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg border max-w-md mx-4">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Delete Project</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete "{project.name}"? This action cannot be undone and
                will also delete all associated invoices, trades, and milestones.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Project'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null
}
