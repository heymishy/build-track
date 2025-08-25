'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface Milestone {
  id: string
  title: string
  description: string
  paymentAmount: number
  dueDate: Date
  completionDate?: Date
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  percentComplete: number
}

interface MilestoneTrackerProps {
  projectId?: string
  compact?: boolean
}

export function MilestoneTracker({ projectId, compact = false }: MilestoneTrackerProps) {
  // Mock data - in real implementation, this would come from API
  const milestones: Milestone[] = [
    {
      id: '1',
      title: 'Foundation Complete',
      description: 'Foundation poured and cured',
      paymentAmount: 50000,
      dueDate: new Date('2024-09-15'),
      completionDate: new Date('2024-09-12'),
      status: 'COMPLETED',
      percentComplete: 100,
    },
    {
      id: '2',
      title: 'Framing Complete',
      description: 'All structural framing finished',
      paymentAmount: 75000,
      dueDate: new Date('2024-10-01'),
      status: 'IN_PROGRESS',
      percentComplete: 80,
    },
    {
      id: '3',
      title: 'Electrical Rough-in',
      description: 'Electrical wiring rough-in complete',
      paymentAmount: 25000,
      dueDate: new Date('2024-10-15'),
      status: 'PENDING',
      percentComplete: 0,
    },
    {
      id: '4',
      title: 'Plumbing Rough-in',
      description: 'Plumbing rough-in complete',
      paymentAmount: 30000,
      dueDate: new Date('2024-10-20'),
      status: 'PENDING',
      percentComplete: 0,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING':
        return 'bg-gray-100 text-gray-800'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return CheckCircleIcon
      case 'IN_PROGRESS':
        return ClockIcon
      case 'PENDING':
        return CalendarIcon
      case 'OVERDUE':
        return ExclamationTriangleIcon
      default:
        return CalendarIcon
    }
  }

  const stats = React.useMemo(() => {
    const completed = milestones.filter(m => m.status === 'COMPLETED').length
    const inProgress = milestones.filter(m => m.status === 'IN_PROGRESS').length
    const totalValue = milestones.reduce((sum, m) => sum + m.paymentAmount, 0)
    const completedValue = milestones
      .filter(m => m.status === 'COMPLETED')
      .reduce((sum, m) => sum + m.paymentAmount, 0)
    const overallProgress =
      milestones.length > 0
        ? milestones.reduce((sum, m) => sum + m.percentComplete, 0) / milestones.length
        : 0

    return {
      total: milestones.length,
      completed,
      inProgress,
      totalValue,
      completedValue,
      overallProgress,
    }
  }, [milestones])

  if (compact) {
    return (
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Milestone Progress</h3>
            <Badge className="bg-blue-100 text-blue-800">
              {stats.completed}/{stats.total} Complete
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="space-y-4">
            {/* Overall Progress */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">Overall Progress</span>
                <span>{Math.round(stats.overallProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.overallProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Payment Progress */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Milestone Payments</span>
                <span className="font-medium">
                  ${stats.completedValue.toLocaleString()} / ${stats.totalValue.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-green-600 h-1 rounded-full"
                  style={{ width: `${(stats.completedValue / stats.totalValue) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Next Milestone */}
            {milestones.find(m => m.status === 'IN_PROGRESS' || m.status === 'PENDING') && (
              <div className="border-t pt-3">
                <div className="text-xs text-gray-500 mb-1">Next Up:</div>
                <div className="text-sm font-medium text-gray-900">
                  {
                    milestones.find(m => m.status === 'IN_PROGRESS' || m.status === 'PENDING')
                      ?.title
                  }
                </div>
                <div className="text-xs text-gray-500">
                  Due{' '}
                  {milestones
                    .find(m => m.status === 'IN_PROGRESS' || m.status === 'PENDING')
                    ?.dueDate.toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <Card.Body className="p-6 text-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body className="p-6 text-center">
            <ClockIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body className="p-6 text-center">
            <CurrencyDollarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              ${stats.completedValue.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Payments Earned</div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body className="p-6 text-center">
            <div
              className={`text-2xl font-bold ${stats.overallProgress >= 90 ? 'text-green-600' : 'text-blue-600'}`}
            >
              {Math.round(stats.overallProgress)}%
            </div>
            <div className="text-sm text-gray-600">Overall Progress</div>
          </Card.Body>
        </Card>
      </div>

      {/* Milestone List */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">Project Milestones</h3>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="space-y-4 p-6">
            {milestones.map((milestone, index) => {
              const StatusIcon = getStatusIcon(milestone.status)
              const isLast = index === milestones.length - 1

              return (
                <div key={milestone.id} className="relative">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          milestone.status === 'COMPLETED'
                            ? 'bg-green-100'
                            : milestone.status === 'IN_PROGRESS'
                              ? 'bg-blue-100'
                              : 'bg-gray-100'
                        }`}
                      >
                        <StatusIcon
                          className={`w-4 h-4 ${
                            milestone.status === 'COMPLETED'
                              ? 'text-green-600'
                              : milestone.status === 'IN_PROGRESS'
                                ? 'text-blue-600'
                                : 'text-gray-400'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{milestone.title}</h4>
                          <p className="text-sm text-gray-500">{milestone.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            ${milestone.paymentAmount.toLocaleString()}
                          </div>
                          <Badge className={getStatusColor(milestone.status)}>
                            {milestone.status.toLowerCase().replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          Due: {milestone.dueDate.toLocaleDateString()}
                          {milestone.completionDate && (
                            <span className="ml-2 text-green-600">
                              (Completed: {milestone.completionDate.toLocaleDateString()})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {milestone.percentComplete}% complete
                        </div>
                      </div>

                      {milestone.status === 'IN_PROGRESS' && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${milestone.percentComplete}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline connector */}
                  {!isLast && <div className="absolute left-4 top-8 w-0.5 h-6 bg-gray-200"></div>}
                </div>
              )
            })}
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}
