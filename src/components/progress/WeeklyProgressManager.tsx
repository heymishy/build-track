'use client'

import React, { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  PhotoIcon, 
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

interface WeeklyProgressLog {
  id: string
  projectId: string
  weekStarting: string
  weekEnding: string
  summary: string
  issues?: string
  nextWeekPlan?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  photos: ProgressPhoto[]
}

interface ProgressPhoto {
  id: string
  logId: string
  fileName: string
  fileUrl: string
  caption?: string
  sortOrder: number
  createdAt: string
}

interface WeeklyProgressManagerProps {
  projectId: string
}

export function WeeklyProgressManager({ projectId }: WeeklyProgressManagerProps) {
  const [progressLogs, setProgressLogs] = useState<WeeklyProgressLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLog, setSelectedLog] = useState<WeeklyProgressLog | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)

  useEffect(() => {
    fetchProgressLogs()
  }, [projectId])

  const fetchProgressLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/progress-logs`)
      const data = await response.json()

      if (data.success) {
        setProgressLogs(data.logs)
      }
    } catch (error) {
      console.error('Error fetching progress logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentWeekDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)) // Start on Monday
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0]
    }
  }

  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }

  const getWeekStatus = (log: WeeklyProgressLog) => {
    const today = new Date()
    const weekEnd = new Date(log.weekEnding)
    const weekStart = new Date(log.weekStarting)
    
    if (today < weekStart) return 'upcoming'
    if (today > weekEnd) return 'completed'
    return 'current'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return <Badge className="bg-blue-100 text-blue-800">Current Week</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'upcoming':
        return <Badge className="bg-gray-100 text-gray-800">Planned</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading progress logs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Weekly Progress Logs</h2>
          <p className="text-gray-600">
            Document construction progress with photos and weekly summaries
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Progress Log
        </Button>
      </div>

      {/* Current Week Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClockIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">This Week</p>
              <p className="font-semibold text-gray-900">
                {formatWeekRange(...Object.values(getCurrentWeekDates()))}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Total Logs</p>
              <p className="font-semibold text-gray-900">{progressLogs.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <PhotoIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Total Photos</p>
              <p className="font-semibold text-gray-900">
                {progressLogs.reduce((total, log) => total + log.photos.length, 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DocumentTextIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Recent Updates</p>
              <p className="font-semibold text-gray-900">
                {progressLogs.filter(log => {
                  const weekAgo = new Date()
                  weekAgo.setDate(weekAgo.getDate() - 7)
                  return new Date(log.updatedAt) > weekAgo
                }).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Logs List */}
      {progressLogs.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No progress logs yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start documenting your weekly construction progress with photos and updates
            </p>
            <div className="mt-6">
              <Button onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="w-5 h-5 mr-2" />
                Create First Progress Log
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {progressLogs.map((log) => (
            <Card key={log.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      Week of {formatWeekRange(log.weekStarting, log.weekEnding)}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(getWeekStatus(log))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLog(log)
                          setShowViewModal(true)
                        }}
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-2">{log.summary}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <PhotoIcon className="w-4 h-4 mr-1" />
                        {log.photos.length} photos
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {log.issues && (
                      <div className="flex items-center text-sm text-amber-600">
                        <XCircleIcon className="w-4 h-4 mr-1" />
                        Issues reported
                      </div>
                    )}
                  </div>

                  {/* Photo Preview */}
                  {log.photos.length > 0 && (
                    <div className="mt-4 flex space-x-2 overflow-x-auto">
                      {log.photos.slice(0, 4).map((photo, index) => (
                        <div key={photo.id} className="flex-shrink-0">
                          <img
                            src={photo.fileUrl}
                            alt={photo.caption || `Progress photo ${index + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                      ))}
                      {log.photos.length > 4 && (
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-sm text-gray-500">
                          +{log.photos.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Progress Log Modal */}
      <CreateProgressLogModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={projectId}
        onLogCreated={(newLog) => {
          setProgressLogs([newLog, ...progressLogs])
          setShowCreateModal(false)
        }}
      />

      {/* View Progress Log Modal */}
      {selectedLog && (
        <ViewProgressLogModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false)
            setSelectedLog(null)
          }}
          log={selectedLog}
        />
      )}
    </div>
  )
}

// Create Progress Log Modal Component
function CreateProgressLogModal({
  isOpen,
  onClose,
  projectId,
  onLogCreated
}: {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onLogCreated: (log: WeeklyProgressLog) => void
}) {
  const [formData, setFormData] = useState({
    weekStarting: '',
    weekEnding: '',
    summary: '',
    issues: '',
    nextWeekPlan: ''
  })
  const [photos, setPhotos] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const { start, end } = getCurrentWeekDates()
      setFormData(prev => ({
        ...prev,
        weekStarting: start,
        weekEnding: end
      }))
    }
  }, [isOpen])

  const getCurrentWeekDates = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0]
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Create the progress log first
      const response = await fetch(`/api/projects/${projectId}/progress-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        // TODO: Upload photos if any
        // For now, just return the log without photos
        onLogCreated(data.log)
        setFormData({
          weekStarting: '',
          weekEnding: '',
          summary: '',
          issues: '',
          nextWeekPlan: ''
        })
        setPhotos([])
      }
    } catch (error) {
      console.error('Error creating progress log:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Progress Log">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Week Starting
            </label>
            <input
              type="date"
              value={formData.weekStarting}
              onChange={e => setFormData(prev => ({ ...prev, weekStarting: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Week Ending
            </label>
            <input
              type="date"
              value={formData.weekEnding}
              onChange={e => setFormData(prev => ({ ...prev, weekEnding: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Progress Summary
          </label>
          <textarea
            value={formData.summary}
            onChange={e => setFormData(prev => ({ ...prev, summary: e.target.value }))}
            rows={4}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Describe the work completed this week..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Issues Encountered (Optional)
          </label>
          <textarea
            value={formData.issues}
            onChange={e => setFormData(prev => ({ ...prev, issues: e.target.value }))}
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Any problems or challenges this week..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Next Week Plans (Optional)
          </label>
          <textarea
            value={formData.nextWeekPlan}
            onChange={e => setFormData(prev => ({ ...prev, nextWeekPlan: e.target.value }))}
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="What's planned for next week..."
          />
        </div>

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Progress Log'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// View Progress Log Modal Component  
function ViewProgressLogModal({
  isOpen,
  onClose,
  log
}: {
  isOpen: boolean
  onClose: () => void
  log: WeeklyProgressLog
}) {
  if (!isOpen) return null

  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Progress Log - ${formatWeekRange(log.weekStarting, log.weekEnding)}`}>
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Progress Summary</h4>
          <p className="text-gray-600">{log.summary}</p>
        </div>

        {log.issues && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Issues Encountered</h4>
            <p className="text-gray-600">{log.issues}</p>
          </div>
        )}

        {log.nextWeekPlan && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Next Week Plans</h4>
            <p className="text-gray-600">{log.nextWeekPlan}</p>
          </div>
        )}

        {log.photos.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Photos ({log.photos.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {log.photos.map((photo) => (
                <div key={photo.id} className="group relative">
                  <img
                    src={photo.fileUrl}
                    alt={photo.caption || 'Progress photo'}
                    className="w-full h-32 object-cover rounded-lg border border-gray-200"
                  />
                  {photo.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}