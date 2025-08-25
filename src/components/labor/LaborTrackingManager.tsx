'use client'

import React, { useState, useEffect } from 'react'
import {
  PlusIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

type LaborRole = 'SENIOR_BUILDER' | 'BUILDER' | 'APPRENTICE' | 'LABOURER' | 'SPECIALIST'

interface LaborEntry {
  id: string
  projectId: string
  workDate: string
  workerRole: LaborRole
  hoursWorked: number
  hourlyRate: number
  description?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface LaborTrackingManagerProps {
  projectId: string
}

const LABOR_ROLES = {
  SENIOR_BUILDER: { label: 'Senior Builder', baseRate: 85, color: 'bg-purple-100 text-purple-800' },
  BUILDER: { label: 'Builder', baseRate: 65, color: 'bg-blue-100 text-blue-800' },
  APPRENTICE: { label: 'Apprentice', baseRate: 45, color: 'bg-green-100 text-green-800' },
  LABOURER: { label: 'Labourer', baseRate: 35, color: 'bg-gray-100 text-gray-800' },
  SPECIALIST: { label: 'Specialist', baseRate: 95, color: 'bg-red-100 text-red-800' },
} as const

const GST_RATE = 0.15 // 15% GST for New Zealand

export function LaborTrackingManager({ projectId }: LaborTrackingManagerProps) {
  const [laborEntries, setLaborEntries] = useState<LaborEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('week') // week, month, all

  useEffect(() => {
    fetchLaborEntries()
  }, [projectId])

  const fetchLaborEntries = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/labor-entries`)
      const data = await response.json()

      if (data.success) {
        setLaborEntries(data.entries)
      }
    } catch (error) {
      console.error('Error fetching labor entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredEntries = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Start of week (Monday)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    switch (selectedPeriod) {
      case 'week':
        return laborEntries.filter(entry => new Date(entry.workDate) >= startOfWeek)
      case 'month':
        return laborEntries.filter(entry => new Date(entry.workDate) >= startOfMonth)
      default:
        return laborEntries
    }
  }

  const calculateTotals = (entries: LaborEntry[]) => {
    const totals = {
      totalHours: 0,
      subtotal: 0,
      gst: 0,
      total: 0,
      byRole: {} as Record<LaborRole, { hours: number; amount: number }>,
    }

    entries.forEach(entry => {
      const amount = entry.hoursWorked * entry.hourlyRate
      totals.totalHours += entry.hoursWorked
      totals.subtotal += amount

      if (!totals.byRole[entry.workerRole]) {
        totals.byRole[entry.workerRole] = { hours: 0, amount: 0 }
      }
      totals.byRole[entry.workerRole].hours += entry.hoursWorked
      totals.byRole[entry.workerRole].amount += amount
    })

    totals.gst = totals.subtotal * GST_RATE
    totals.total = totals.subtotal + totals.gst

    return totals
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  const filteredEntries = getFilteredEntries()
  const totals = calculateTotals(filteredEntries)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading labor entries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Labor Tracking</h2>
          <p className="text-gray-600">
            Track work hours and generate invoices for construction labor
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Log Hours
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{totals.totalHours.toFixed(1)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Subtotal</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.subtotal)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">GST (15%)</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.gst)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total (inc GST)</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.total)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Role Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Hours by Role</h3>
        <div className="space-y-4">
          {Object.entries(LABOR_ROLES).map(([role, config]) => {
            const roleData = totals.byRole[role as LaborRole]
            const hours = roleData?.hours || 0
            const amount = roleData?.amount || 0

            return (
              <div
                key={role}
                className="flex items-center justify-between py-3 border-b last:border-b-0"
              >
                <div className="flex items-center">
                  <Badge className={config.color}>{config.label}</Badge>
                  <span className="ml-3 text-sm text-gray-500">
                    {formatCurrency(config.baseRate)}/hr + GST
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{hours.toFixed(1)} hrs</div>
                  <div className="text-sm text-gray-500">{formatCurrency(amount)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Recent Entries */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Entries</h3>
          {filteredEntries.length > 0 && (
            <Button variant="outline" size="sm">
              Generate Invoice
            </Button>
          )}
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No labor entries</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start tracking work hours for your construction team
            </p>
            <div className="mt-6">
              <Button onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="w-5 h-5 mr-2" />
                Log First Entry
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.slice(0, 10).map(entry => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-3 border-b last:border-b-0"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <UserIcon className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <Badge className={LABOR_ROLES[entry.workerRole].color} size="sm">
                        {LABOR_ROLES[entry.workerRole].label}
                      </Badge>
                      <span className="text-sm text-gray-500">{formatDate(entry.workDate)}</span>
                    </div>
                    {entry.description && (
                      <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{entry.hoursWorked} hrs</div>
                  <div className="text-sm text-gray-500">
                    {formatCurrency(entry.hoursWorked * entry.hourlyRate)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Labor Entry Modal */}
      <CreateLaborEntryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={projectId}
        onEntryCreated={newEntry => {
          setLaborEntries([newEntry, ...laborEntries])
          setShowCreateModal(false)
        }}
      />
    </div>
  )
}

// Create Labor Entry Modal
function CreateLaborEntryModal({
  isOpen,
  onClose,
  projectId,
  onEntryCreated,
}: {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onEntryCreated: (entry: LaborEntry) => void
}) {
  const [formData, setFormData] = useState({
    workDate: new Date().toISOString().split('T')[0],
    workerRole: 'BUILDER' as LaborRole,
    hoursWorked: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const hourlyRate = LABOR_ROLES[formData.workerRole].baseRate

      const response = await fetch(`/api/projects/${projectId}/labor-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          hoursWorked: parseFloat(formData.hoursWorked),
          hourlyRate,
        }),
      })

      const data = await response.json()
      if (data.success) {
        onEntryCreated(data.entry)
        setFormData({
          workDate: new Date().toISOString().split('T')[0],
          workerRole: 'BUILDER',
          hoursWorked: '',
          description: '',
        })
      }
    } catch (error) {
      console.error('Error creating labor entry:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Work Hours">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Date</label>
            <input
              type="date"
              value={formData.workDate}
              onChange={e => setFormData(prev => ({ ...prev, workDate: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked</label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="16"
              value={formData.hoursWorked}
              onChange={e => setFormData(prev => ({ ...prev, hoursWorked: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="8.0"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Worker Role</label>
          <select
            value={formData.workerRole}
            onChange={e =>
              setFormData(prev => ({ ...prev, workerRole: e.target.value as LaborRole }))
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          >
            {Object.entries(LABOR_ROLES).map(([role, config]) => (
              <option key={role} value={role}>
                {config.label} - NZD ${config.baseRate}/hr + GST
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Work Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Describe the work performed..."
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Hours:</span>
            <span>{formData.hoursWorked || '0'} hrs</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Rate:</span>
            <span>NZD ${LABOR_ROLES[formData.workerRole].baseRate}/hr</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>
              {new Intl.NumberFormat('en-NZ', {
                style: 'currency',
                currency: 'NZD',
              }).format(
                (parseFloat(formData.hoursWorked) || 0) * LABOR_ROLES[formData.workerRole].baseRate
              )}
            </span>
          </div>
          <div className="flex justify-between text-sm font-medium border-t pt-2 mt-2">
            <span>Total (inc 15% GST):</span>
            <span>
              {new Intl.NumberFormat('en-NZ', {
                style: 'currency',
                currency: 'NZD',
              }).format(
                (parseFloat(formData.hoursWorked) || 0) *
                  LABOR_ROLES[formData.workerRole].baseRate *
                  1.15
              )}
            </span>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Logging...' : 'Log Hours'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
