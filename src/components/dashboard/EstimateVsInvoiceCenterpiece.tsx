/**
 * Estimate vs Invoice Centerpiece Component
 * The hero component that showcases the core value proposition of BuildTrack
 */

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  SparklesIcon,
  EyeIcon,
  ArrowRightIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  ArrowTrendingDownIcon as TrendingDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline'
import { ProjectSelector } from '@/components/projects/ProjectSelector'

interface ProjectHealthData {
  projectId: string
  projectName: string
  totalBudget: number
  estimatedCost: number
  actualCost: number
  variance: number
  variancePercent: number
  currency: string
  completionPercent: number
  healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'EXCELLENT'
  pendingInvoices: number
  unmatchedInvoices: number
  matchingAccuracy: number
  lastUpdated: string
  topVariances: Array<{
    trade: string
    variance: number
    variancePercent: number
    impact: 'HIGH' | 'MEDIUM' | 'LOW'
  }>
  nextActions: Array<{
    type: 'MATCH_INVOICES' | 'REVIEW_VARIANCE' | 'UPDATE_ESTIMATES' | 'APPROVE_INVOICES'
    description: string
    urgency: 'HIGH' | 'MEDIUM' | 'LOW'
    count?: number
  }>
}

interface EstimateVsInvoiceCenterpieceProps {
  initialProjectId?: string
  onProjectChange?: (projectId: string) => void
  className?: string
}

export function EstimateVsInvoiceCenterpiece({
  initialProjectId,
  onProjectChange,
  className = '',
}: EstimateVsInvoiceCenterpieceProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || '')
  const [healthData, setHealthData] = useState<ProjectHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectHealth()
    }
  }, [selectedProjectId])

  const fetchProjectHealth = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/projects/${selectedProjectId}/cost-tracking?enhanced=true`,
        {
          credentials: 'include',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch project health data')
      }

      const result = await response.json()
      if (result.success) {
        setHealthData(result.data)
      } else {
        throw new Error(result.error || 'Failed to load project health data')
      }
    } catch (err) {
      console.error('Project health fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load project health data')
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getHealthStatusConfig = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
        return {
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          icon: CheckCircleIcon,
          label: 'Excellent',
          description: 'Under budget with high accuracy',
        }
      case 'HEALTHY':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: CheckCircleIcon,
          label: 'Healthy',
          description: 'On track within budget',
        }
      case 'WARNING':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: ExclamationTriangleIcon,
          label: 'Attention Needed',
          description: 'Some variances detected',
        }
      case 'CRITICAL':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: ExclamationTriangleIcon,
          label: 'Critical',
          description: 'Significant budget overrun',
        }
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: ChartBarIcon,
          label: 'Unknown',
          description: 'Status not available',
        }
    }
  }

  const getVarianceIcon = (variance: number) => {
    if (variance > 1000) return <ArrowTrendingUpIcon className="h-5 w-5 text-red-500" />
    if (variance < -1000) return <ArrowTrendingDownIcon className="h-5 w-5 text-green-500" />
    return <MinusIcon className="h-5 w-5 text-gray-400" />
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'HIGH':
        return 'text-red-600'
      case 'MEDIUM':
        return 'text-yellow-600'
      case 'LOW':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <Card className={`p-8 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (error || !healthData) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Project Health</h3>
        <p className="text-gray-600 mb-6">{error || 'Please select a project to continue'}</p>
        <ProjectSelector
          selectedProjectId={selectedProjectId}
          onProjectChange={handleProjectChange}
          showStats={true}
          className="max-w-md mx-auto"
        />
      </Card>
    )
  }

  const statusConfig = getHealthStatusConfig(healthData.healthStatus)
  const StatusIcon = statusConfig.icon

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Project Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Health Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time estimate vs invoice tracking</p>
        </div>
        <div className="min-w-0 flex-1 max-w-md">
          <ProjectSelector
            selectedProjectId={selectedProjectId}
            onProjectChange={handleProjectChange}
            showStats={true}
          />
        </div>
      </div>

      {/* Main Health Status Card */}
      <Card className={`p-8 border-2 ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Overview */}
          <div className="lg:col-span-2">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-full ${statusConfig.bgColor}`}>
                <StatusIcon className={`h-8 w-8 ${statusConfig.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{healthData.projectName}</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`text-lg font-semibold ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600">{statusConfig.description}</span>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div>
                    <div className="text-sm text-gray-500">Budget</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(healthData.totalBudget, healthData.currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Estimated</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(healthData.estimatedCost, healthData.currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Actual</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(healthData.actualCost, healthData.currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Variance</div>
                    <div
                      className={`text-lg font-semibold flex items-center space-x-1 ${
                        healthData.variance > 0
                          ? 'text-red-600'
                          : healthData.variance < 0
                            ? 'text-green-600'
                            : 'text-gray-600'
                      }`}
                    >
                      {getVarianceIcon(healthData.variance)}
                      <span>
                        {formatCurrency(Math.abs(healthData.variance), healthData.currency)}
                      </span>
                      <span className="text-sm">
                        ({healthData.variancePercent >= 0 ? '+' : ''}
                        {(healthData.variancePercent || 0).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:border-l lg:border-gray-200 lg:pl-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Actions</h3>
            <div className="space-y-3">
              {healthData.nextActions.slice(0, 3).map((action, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium ${getUrgencyColor(action.urgency)}`}>
                      {action.description}
                    </div>
                    {action.count && (
                      <div className="text-xs text-gray-500 mt-1">{action.count} items</div>
                    )}
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-gray-400 ml-2" />
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2">
              <Button
                variant="primary"
                fullWidth
                icon={<SparklesIcon className="h-4 w-4" />}
                onClick={() =>
                  (window.location.href = `/invoices?project=${selectedProjectId}&tab=matching`)
                }
              >
                Smart Invoice Matching
              </Button>
              <Button
                variant="secondary"
                fullWidth
                icon={<ChartBarIcon className="h-4 w-4" />}
                onClick={() =>
                  (window.location.href = `/invoices?project=${selectedProjectId}&tab=comparison`)
                }
              >
                Detailed Analysis
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm text-gray-500">Pending Invoices</div>
              <div className="text-2xl font-bold text-gray-900">{healthData.pendingInvoices}</div>
              {healthData.unmatchedInvoices > 0 && (
                <div className="text-sm text-yellow-600">
                  {healthData.unmatchedInvoices} unmatched
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <SparklesIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm text-gray-500">Matching Accuracy</div>
              <div className="text-2xl font-bold text-gray-900">
                {(healthData.matchingAccuracy || 0).toFixed(1)}%
              </div>
              <div className="text-sm text-green-600">AI-powered</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUpIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm text-gray-500">Completion</div>
              <div className="text-2xl font-bold text-gray-900">
                {(healthData.completionPercent || 0).toFixed(0)}%
              </div>
              <div className="text-sm text-purple-600">Project progress</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
