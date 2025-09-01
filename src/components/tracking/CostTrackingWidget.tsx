/**
 * Cost Tracking Widget
 * Displays project spend vs estimate with milestone progress
 */

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { ProjectSelector } from '@/components/projects/ProjectSelector'
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline'

interface CostTrackingData {
  projectId: string
  projectName: string
  totalBudget: number
  totalSpend: number
  variance: number
  variancePercent: number
  currency: string
  milestones: {
    id: string
    name: string
    targetDate: string
    actualDate?: string
    paymentAmount: number
    percentComplete: number
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  }[]
  spendByCategory: {
    category: string
    estimated: number
    actual: number
    variance: number
  }[]
}

interface CostTrackingWidgetProps {
  projectId?: string
  showProjectSelector?: boolean
  className?: string
  onProjectChange?: (projectId: string) => void
}

export function CostTrackingWidget({
  projectId: initialProjectId,
  showProjectSelector = true,
  className = '',
  onProjectChange,
}: CostTrackingWidgetProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || 'all')
  const [trackingData, setTrackingData] = useState<CostTrackingData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCostTrackingData()
  }, [selectedProjectId])

  const fetchCostTrackingData = async () => {
    try {
      setLoading(true)
      setError(null)

      const url = selectedProjectId === 'all' 
        ? '/api/analytics/cost-tracking'
        : `/api/projects/${selectedProjectId}/cost-tracking`

      const response = await fetch(url, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch cost tracking data')
      }

      const result = await response.json()
      if (result.success) {
        setTrackingData(Array.isArray(result.data) ? result.data : [result.data])
      } else {
        throw new Error(result.error || 'Failed to load cost tracking data')
      }
    } catch (err) {
      console.error('Cost tracking fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load cost tracking data')
    } finally {
      setLoading(false)
    }
  }

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId)
    onProjectChange?.(projectId)
  }

  const formatCurrency = (amount: number, currency: string = 'NZD') => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600' // Over budget
    if (variance < -1000) return 'text-green-600' // Under budget
    return 'text-gray-600' // On budget
  }

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <ArrowTrendingUpIcon className="h-4 w-4 text-red-600" />
    if (variance < -1000) return <ArrowTrendingDownIcon className="h-4 w-4 text-green-600" />
    return <ChartBarIcon className="h-4 w-4 text-gray-600" />
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-red-400 mb-2" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">Error Loading Data</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchCostTrackingData}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Project Selector */}
      {showProjectSelector && (
        <div className="mb-6">
          <ProjectSelector
            selectedProjectId={selectedProjectId}
            onProjectChange={handleProjectChange}
            includeAllOption={true}
            label="Filter by Project"
          />
        </div>
      )}

      {/* Cost Tracking Cards */}
      <div className="space-y-6">
        {trackingData.length === 0 ? (
          <Card className="p-6 text-center">
            <ChartBarIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No Data Available</h3>
            <p className="text-sm text-gray-500">No projects with cost data found.</p>
          </Card>
        ) : (
          trackingData.map(project => (
            <Card key={project.projectId} className="p-6">
              {/* Project Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{project.projectName}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    <span>Budget: {formatCurrency(project.totalBudget, project.currency)}</span>
                    <span>Spent: {formatCurrency(project.totalSpend, project.currency)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center">
                    {getVarianceIcon(project.variance)}
                    <span className={`ml-1 text-sm font-medium ${getVarianceColor(project.variance)}`}>
                      {project.variance > 0 ? '+' : ''}{formatCurrency(Math.abs(project.variance), project.currency)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {project.variancePercent > 0 ? '+' : ''}{project.variancePercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Budget Utilization</span>
                  <span className="text-sm text-gray-900">
                    {((project.totalSpend / project.totalBudget) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      project.variance > 0
                        ? 'bg-red-500'
                        : project.totalSpend / project.totalBudget > 0.9
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min((project.totalSpend / project.totalBudget) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Milestones */}
              {project.milestones.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Milestones</h4>
                  <div className="space-y-2">
                    {project.milestones.map(milestone => (
                      <div key={milestone.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                        <div className="flex items-center">
                          {milestone.status === 'COMPLETED' ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                          ) : milestone.status === 'IN_PROGRESS' ? (
                            <ClockIcon className="h-4 w-4 text-yellow-500 mr-2" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300 mr-2"></div>
                          )}
                          <span className="text-sm text-gray-900">{milestone.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-900">
                            {formatCurrency(milestone.paymentAmount, project.currency)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {milestone.percentComplete}% complete
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spend by Category */}
              {project.spendByCategory.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Spend by Category</h4>
                  <div className="space-y-2">
                    {project.spendByCategory.map(category => (
                      <div key={category.category} className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-600 capitalize">{category.category.toLowerCase()}</span>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-gray-500">
                            {formatCurrency(category.estimated, project.currency)} est.
                          </span>
                          <span className="text-gray-900">
                            {formatCurrency(category.actual, project.currency)} actual
                          </span>
                          <span className={`font-medium ${getVarianceColor(category.variance)}`}>
                            {category.variance > 0 ? '+' : ''}{formatCurrency(Math.abs(category.variance), project.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}