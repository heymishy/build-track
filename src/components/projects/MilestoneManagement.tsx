/**
 * Milestone Management Component
 * Manage construction milestones for a project
 */

'use client'

import { useState, useEffect } from 'react'
import {
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FlagIcon,
} from '@heroicons/react/24/outline'

interface Milestone {
  id: string
  name: string
  description?: string
  targetDate: string
  actualDate?: string
  paymentAmount: number
  percentComplete: number
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  sortOrder: number
  createdAt: string
  updatedAt: string
  // Dependency tracking
  dependencies?: { id: string; name: string; status: string }[] // Milestones this one depends on
  dependentOn?: { id: string; name: string; status: string }[] // Milestones that depend on this one
}

interface MilestoneSummary {
  totalMilestones: number
  completedMilestones: number
  totalPaymentAmount: number
  completedPaymentAmount: number
  overallProgress: number
}

interface Project {
  id: string
  name: string
  description?: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  budget: number
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
  ownerId: string
}

interface MilestoneManagementProps {
  project: Project
  className?: string
}

export function MilestoneManagement({ project, className = '' }: MilestoneManagementProps) {
  const projectId = project.id
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [summary, setSummary] = useState<MilestoneSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetDate: '',
    paymentAmount: '',
    percentComplete: '',
    status: 'PENDING' as const,
    dependencies: [] as string[], // Array of milestone IDs this milestone depends on
  })

  useEffect(() => {
    fetchMilestones()
  }, [projectId])

  const fetchMilestones = async () => {
    try {
      setLoading(true)

      // Check if we're in a test environment
      const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'

      if (isTest && global.fetch) {
        // In test environment, use the mocked fetch
        const response = await global.fetch(`/api/projects/${projectId}/milestones`)
        const data = await response.json()

        if (data.success) {
          setMilestones(data.milestones || [])
          setSummary(data.summary || null)
        } else {
          setError(data.error || 'Failed to fetch milestones')
        }
      } else {
        // Non-test environment - make actual API call
        const response = await fetch(`/api/projects/${projectId}/milestones`)
        const data = await response.json()

        if (data.success) {
          setMilestones(data.milestones)
          setSummary(data.summary)
        } else {
          setError(data.error || 'Failed to fetch milestones')
        }
      }
    } catch (err) {
      setError('Failed to fetch milestones')
      console.error('Milestone fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          targetDate: formData.targetDate,
          paymentAmount: parseFloat(formData.paymentAmount),
          sortOrder: milestones.length,
          dependencies: formData.dependencies,
        }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchMilestones() // Refresh the list
        setShowCreateModal(false)
        setFormData({
          name: '',
          description: '',
          targetDate: '',
          paymentAmount: '',
          percentComplete: '',
          status: 'PENDING',
          dependencies: [],
        })
      } else {
        setError(data.error || 'Failed to create milestone')
      }
    } catch (err) {
      setError('Failed to create milestone')
      console.error('Create milestone error:', err)
    }
  }

  const handleUpdateMilestone = async (milestoneId: string, updates: Partial<Milestone>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (data.success) {
        await fetchMilestones() // Refresh the list
        setEditingMilestone(null)
        setShowEditModal(false)
      } else {
        setError(data.error || 'Failed to update milestone')
      }
    } catch (err) {
      setError('Failed to update milestone')
      console.error('Update milestone error:', err)
    }
  }

  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone)
    setFormData({
      name: milestone.name,
      description: milestone.description || '',
      targetDate: milestone.targetDate.split('T')[0], // Format for date input
      paymentAmount: milestone.paymentAmount.toString(),
      percentComplete: milestone.percentComplete.toString(),
      status: milestone.status,
      dependencies: milestone.dependencies?.map(dep => dep.id) || [],
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingMilestone) return

    try {
      const updates: Partial<Milestone> & { dependencies?: string[] } = {
        name: formData.name,
        description: formData.description || undefined,
        targetDate: formData.targetDate,
        paymentAmount: parseFloat(formData.paymentAmount),
        percentComplete: parseFloat(formData.percentComplete),
        status: formData.status,
        dependencies: formData.dependencies,
      }

      // Auto-set actual date if completing
      if (formData.status === 'COMPLETED' && editingMilestone.status !== 'COMPLETED') {
        updates.actualDate = new Date().toISOString()
      }

      await handleUpdateMilestone(editingMilestone.id, updates)
    } catch (err) {
      setError('Failed to update milestone')
      console.error('Edit milestone error:', err)
    }
  }

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        await fetchMilestones() // Refresh the list
      } else {
        setError(data.error || 'Failed to delete milestone')
      }
    } catch (err) {
      setError('Failed to delete milestone')
      console.error('Delete milestone error:', err)
    }
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
      case 'COMPLETED':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'IN_PROGRESS':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'PENDING':
        return 'text-gray-700 bg-gray-50 border-gray-200'
      case 'OVERDUE':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'IN_PROGRESS':
        return <PlayIcon className="h-4 w-4" />
      case 'PENDING':
        return <ClockIcon className="h-4 w-4" />
      case 'OVERDUE':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      default:
        return <FlagIcon className="h-4 w-4" />
    }
  }

  // Check if a milestone can be started based on its dependencies
  const canStartMilestone = (milestone: Milestone): boolean => {
    if (!milestone.dependencies || milestone.dependencies.length === 0) {
      return true
    }
    return milestone.dependencies.every(dep => dep.status === 'COMPLETED')
  }

  // Get blocked reason for a milestone
  const getBlockedReason = (milestone: Milestone): string | null => {
    if (canStartMilestone(milestone)) {
      return null
    }
    const incomplete = milestone.dependencies?.filter(dep => dep.status !== 'COMPLETED') || []
    if (incomplete.length === 1) {
      return `Waiting for "${incomplete[0].name}" to be completed`
    }
    return `Waiting for ${incomplete.length} dependencies to be completed`
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

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FlagIcon className="h-5 w-5 mr-2 text-blue-500" />
              Construction Milestones
            </h3>
            {summary && (
              <p className="mt-1 text-sm text-gray-500">
                {summary.completedMilestones} of {summary.totalMilestones} completed •{' '}
                {formatCurrency(summary.completedPaymentAmount)} of{' '}
                {formatCurrency(summary.totalPaymentAmount)} earned • {summary.overallProgress}%
                progress
              </p>
            )}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Milestone
          </button>
        </div>

        {/* Progress Bar */}
        {summary && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-medium">{summary.overallProgress}%</span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${summary.overallProgress}%` }}
              ></div>
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

      {/* Milestone List */}
      <div className="divide-y divide-gray-200">
        {milestones.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FlagIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No milestones defined</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add construction milestones to track project progress and payments
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add First Milestone
            </button>
          </div>
        ) : (
          milestones.map(milestone => (
            <div key={milestone.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {milestone.name}
                        </h4>
                        <div
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(milestone.status)}`}
                        >
                          {getStatusIcon(milestone.status)}
                          <span className="ml-1">{milestone.status.replace('_', ' ')}</span>
                        </div>
                      </div>

                      {milestone.description && (
                        <p className="mt-1 text-sm text-gray-500 truncate">
                          {milestone.description}
                        </p>
                      )}

                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          Due: {formatDate(milestone.targetDate)}
                        </span>
                        <span className="flex items-center">
                          <CurrencyDollarIcon className="h-3 w-3 mr-1" />
                          {formatCurrency(milestone.paymentAmount)}
                        </span>
                        {milestone.percentComplete > 0 && (
                          <span>{milestone.percentComplete}% complete</span>
                        )}
                        {milestone.actualDate && (
                          <span className="text-green-600">
                            Completed: {formatDate(milestone.actualDate)}
                          </span>
                        )}
                      </div>

                      {/* Dependencies Display */}
                      {milestone.dependencies && milestone.dependencies.length > 0 && (
                        <div className="mt-2 text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">Depends on:</span>
                            <div className="flex flex-wrap gap-1">
                              {milestone.dependencies.map(dep => (
                                <span
                                  key={dep.id}
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    dep.status === 'COMPLETED'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {dep.name}
                                  {dep.status === 'COMPLETED' ? ' ✓' : ' ⏳'}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Blocked Status */}
                      {!canStartMilestone(milestone) && milestone.status === 'PENDING' && (
                        <div className="mt-2 flex items-center text-xs text-orange-600">
                          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                          {getBlockedReason(milestone)}
                        </div>
                      )}

                      {/* Progress Bar */}
                      {milestone.percentComplete > 0 && milestone.status !== 'COMPLETED' && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{milestone.percentComplete}%</span>
                          </div>
                          <div
                            className="w-full bg-gray-200 rounded-full h-1.5"
                            role="progressbar"
                            aria-valuenow={milestone.percentComplete}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          >
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                milestone.percentComplete >= 100
                                  ? 'bg-green-500'
                                  : milestone.percentComplete >= 75
                                    ? 'bg-blue-500'
                                    : milestone.percentComplete >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-gray-400'
                              }`}
                              style={{ width: `${milestone.percentComplete}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Overdue Warning */}
                      {milestone.status !== 'COMPLETED' &&
                        new Date(milestone.targetDate) < new Date() && (
                          <div className="mt-2 flex items-center text-xs text-red-600">
                            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                            Overdue by{' '}
                            {Math.ceil(
                              (new Date().getTime() - new Date(milestone.targetDate).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )}{' '}
                            days
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Status Dropdown */}
                  <select
                    value={milestone.status}
                    onChange={e => {
                      const newStatus = e.target.value as any
                      // Prevent starting milestone if dependencies aren't met
                      if (newStatus === 'IN_PROGRESS' && !canStartMilestone(milestone)) {
                        alert(getBlockedReason(milestone))
                        return
                      }
                      handleUpdateMilestone(milestone.id, {
                        status: newStatus,
                        actualDate:
                          newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
                      })
                    }}
                    className={`text-xs border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 ${
                      !canStartMilestone(milestone) && milestone.status === 'PENDING'
                        ? 'bg-gray-100 text-gray-500'
                        : ''
                    }`}
                  >
                    <option value="PENDING">Pending</option>
                    <option
                      value="IN_PROGRESS"
                      disabled={!canStartMilestone(milestone) && milestone.status === 'PENDING'}
                    >
                      In Progress
                    </option>
                    <option value="COMPLETED">Completed</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>

                  {/* Action Buttons */}
                  <button
                    onClick={() => handleEditMilestone(milestone)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Edit milestone"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMilestone(milestone.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete milestone"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Milestone Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowCreateModal(false)}
            ></div>

            {/* This span hack is required for centering on mobile Safari */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-50">
              <form onSubmit={handleCreateMilestone}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Milestone</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="e.g., Foundation Complete"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Optional description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Date
                      </label>
                      <input
                        type="date"
                        value={formData.targetDate}
                        onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Amount (NZD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.paymentAmount}
                        onChange={e => setFormData({ ...formData, paymentAmount: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    {/* Dependencies Selector */}
                    {milestones.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dependencies
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Select milestones that must be completed before this one can start
                        </p>
                        <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                          {milestones.map(milestone => (
                            <label key={milestone.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={formData.dependencies.includes(milestone.id)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      dependencies: [...formData.dependencies, milestone.id],
                                    })
                                  } else {
                                    setFormData({
                                      ...formData,
                                      dependencies: formData.dependencies.filter(
                                        id => id !== milestone.id
                                      ),
                                    })
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{milestone.name}</span>
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${
                                  milestone.status === 'COMPLETED'
                                    ? 'bg-green-100 text-green-800'
                                    : milestone.status === 'IN_PROGRESS'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {milestone.status.replace('_', ' ')}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create Milestone
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Milestone Modal */}
      {showEditModal && editingMilestone && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                setShowEditModal(false)
                setEditingMilestone(null)
              }}
            ></div>

            {/* This span hack is required for centering on mobile Safari */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-50">
              <form onSubmit={handleEditSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Milestone</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="e.g., Foundation Complete"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Optional description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Date
                      </label>
                      <input
                        type="date"
                        value={formData.targetDate}
                        onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Amount (NZD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.paymentAmount}
                        onChange={e => setFormData({ ...formData, paymentAmount: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Progress ({formData.percentComplete}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.percentComplete}
                        onChange={e =>
                          setFormData({ ...formData, percentComplete: e.target.value })
                        }
                        className="block w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="OVERDUE">Overdue</option>
                      </select>
                    </div>

                    {/* Dependencies Selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dependencies
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Select milestones that must be completed before this one can start
                      </p>
                      <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                        {milestones
                          .filter(m => m.id !== editingMilestone?.id) // Exclude self when editing
                          .map(milestone => (
                            <label key={milestone.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={formData.dependencies.includes(milestone.id)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      dependencies: [...formData.dependencies, milestone.id],
                                    })
                                  } else {
                                    setFormData({
                                      ...formData,
                                      dependencies: formData.dependencies.filter(
                                        id => id !== milestone.id
                                      ),
                                    })
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{milestone.name}</span>
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${
                                  milestone.status === 'COMPLETED'
                                    ? 'bg-green-100 text-green-800'
                                    : milestone.status === 'IN_PROGRESS'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {milestone.status.replace('_', ' ')}
                              </span>
                            </label>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Update Milestone
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingMilestone(null)
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
