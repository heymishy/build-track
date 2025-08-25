'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  DocumentTextIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  DocumentIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'
  totalBudget: number
  actualCost?: number
  currency: string
  startDate?: Date
  endDate?: Date
  completionDate?: Date
  clientId: string
  description?: string
}

interface CompletionReportsProps {
  projectId: string
}

interface CostSummary {
  originalEstimate: number
  revisedEstimate: number
  actualCost: number
  variance: number
  variancePercentage: number
  savings: number
  overruns: number
}

interface ProjectMetrics {
  estimatedDuration: number
  actualDuration: number
  timeVariance: number
  timeVariancePercentage: number
  milestoneMetrics: {
    totalMilestones: number
    completedOnTime: number
    completedLate: number
    averageDelay: number
  }
  qualityMetrics: {
    totalInspections: number
    passedFirstTime: number
    reworkRequired: number
    clientSatisfactionScore: number
  }
}

interface ReconciliationItem {
  category: string
  estimated: number
  actual: number
  variance: number
  varianceType: 'saving' | 'overrun' | 'onbudget'
  notes?: string
}

export function CompletionReports({ projectId }: CompletionReportsProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null)
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics | null>(null)
  const [reconciliation, setReconciliation] = useState<ReconciliationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<
    'summary' | 'reconciliation' | 'metrics' | 'documentation'
  >('summary')

  useEffect(() => {
    if (projectId) {
      loadCompletionData()
    }
  }, [projectId])

  const loadCompletionData = async () => {
    try {
      setLoading(true)

      // Load project data
      const projectResponse = await fetch(`/api/projects/${projectId}`)
      const projectData = await projectResponse.json()
      if (projectData.success) {
        setProject(projectData.project)
      }

      // Load cost summary
      const costResponse = await fetch(`/api/projects/${projectId}/completion/cost-summary`)
      const costData = await costResponse.json()
      if (costData.success) {
        setCostSummary(costData.summary)
      }

      // Load project metrics
      const metricsResponse = await fetch(`/api/projects/${projectId}/completion/metrics`)
      const metricsData = await metricsResponse.json()
      if (metricsData.success) {
        setProjectMetrics(metricsData.metrics)
      }

      // Load reconciliation data
      const reconciliationResponse = await fetch(
        `/api/projects/${projectId}/completion/reconciliation`
      )
      const reconciliationData = await reconciliationResponse.json()
      if (reconciliationData.success) {
        setReconciliation(reconciliationData.reconciliation)
      }
    } catch (error) {
      console.error('Failed to load completion data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateFinalReport = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/completion/generate-report`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        // Download the generated PDF report
        const link = document.createElement('a')
        link.href = data.reportUrl
        link.download = `${project?.name}-Final-Report.pdf`
        link.click()
      }
    } catch (error) {
      console.error('Failed to generate final report:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: project?.currency || 'NZD',
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) <= 5) return 'text-green-600'
    if (variance > 5) return 'text-red-600'
    return 'text-blue-600'
  }

  const getVarianceIcon = (varianceType: string) => {
    switch (varianceType) {
      case 'saving':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'overrun':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default:
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <Card>
        <Card.Body>
          <div className="text-center py-12">
            <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Project Data</h3>
            <p className="mt-1 text-sm text-gray-500">Unable to load project completion data.</p>
          </div>
        </Card.Body>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-green-900">
              {project.name} - Project Completion
            </h2>
            <p className="text-green-700 mt-1">
              Completed on{' '}
              {project.completionDate
                ? new Date(project.completionDate).toLocaleDateString()
                : 'Unknown Date'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm text-green-600">Final Status</div>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
                <span className="text-lg font-semibold text-green-900">COMPLETED</span>
              </div>
            </div>
            <Button
              onClick={generateFinalReport}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Generate Final Report
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'summary', name: 'Executive Summary', icon: DocumentTextIcon },
            { id: 'reconciliation', name: 'Cost Reconciliation', icon: CurrencyDollarIcon },
            { id: 'metrics', name: 'Performance Metrics', icon: ChartBarIcon },
            { id: 'documentation', name: 'Project Documentation', icon: DocumentIcon },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } flex items-center whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Summary */}
          <Card>
            <Card.Header>
              <div className="flex items-center space-x-2">
                <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Cost Summary</h3>
              </div>
            </Card.Header>
            <Card.Body>
              {costSummary ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-600">Original Estimate</div>
                      <div className="text-xl font-bold text-blue-900">
                        {formatCurrency(costSummary.originalEstimate)}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Final Cost</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(costSummary.actualCost)}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`p-4 rounded-lg ${costSummary.variance >= 0 ? 'bg-red-50' : 'bg-green-50'}`}
                  >
                    <div
                      className={`text-sm ${costSummary.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}
                    >
                      Total Variance
                    </div>
                    <div
                      className={`text-xl font-bold ${costSummary.variance >= 0 ? 'text-red-900' : 'text-green-900'}`}
                    >
                      {costSummary.variance >= 0 ? '+' : ''}
                      {formatCurrency(costSummary.variance)}(
                      {formatPercentage(costSummary.variancePercentage)})
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">Cost data not available</div>
              )}
            </Card.Body>
          </Card>

          {/* Timeline Summary */}
          <Card>
            <Card.Header>
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Timeline Summary</h3>
              </div>
            </Card.Header>
            <Card.Body>
              {projectMetrics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-600">Planned Duration</div>
                      <div className="text-xl font-bold text-blue-900">
                        {projectMetrics.estimatedDuration} days
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Actual Duration</div>
                      <div className="text-xl font-bold text-gray-900">
                        {projectMetrics.actualDuration} days
                      </div>
                    </div>
                  </div>
                  <div
                    className={`p-4 rounded-lg ${projectMetrics.timeVariance >= 0 ? 'bg-red-50' : 'bg-green-50'}`}
                  >
                    <div
                      className={`text-sm ${projectMetrics.timeVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}
                    >
                      Schedule Variance
                    </div>
                    <div
                      className={`text-xl font-bold ${projectMetrics.timeVariance >= 0 ? 'text-red-900' : 'text-green-900'}`}
                    >
                      {projectMetrics.timeVariance >= 0 ? '+' : ''}
                      {projectMetrics.timeVariance} days (
                      {formatPercentage(projectMetrics.timeVariancePercentage)})
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">Timeline data not available</div>
              )}
            </Card.Body>
          </Card>
        </div>
      )}

      {activeTab === 'reconciliation' && (
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Detailed Cost Reconciliation
                </h3>
              </div>
              <Button
                onClick={() => {
                  /* Export reconciliation */
                }}
                className="bg-green-600 hover:bg-green-700 text-white text-sm"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            {reconciliation.length > 0 ? (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estimated
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actual
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variance
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reconciliation.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(item.estimated)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(item.actual)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getVarianceColor(item.variance)}`}
                        >
                          {formatCurrency(Math.abs(item.variance))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getVarianceIcon(item.varianceType)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Reconciliation Data</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Cost reconciliation data will appear here once available.
                </p>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Milestone Performance */}
          <Card>
            <Card.Header>
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Milestone Performance</h3>
              </div>
            </Card.Header>
            <Card.Body>
              {projectMetrics?.milestoneMetrics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {projectMetrics.milestoneMetrics.totalMilestones}
                      </div>
                      <div className="text-sm text-gray-600">Total Milestones</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {projectMetrics.milestoneMetrics.completedOnTime}
                      </div>
                      <div className="text-sm text-gray-600">On Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {projectMetrics.milestoneMetrics.completedLate}
                      </div>
                      <div className="text-sm text-gray-600">Late</div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-sm text-gray-600">Average Delay</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {projectMetrics.milestoneMetrics.averageDelay} days
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">Milestone data not available</div>
              )}
            </Card.Body>
          </Card>

          {/* Quality Metrics */}
          <Card>
            <Card.Header>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Quality Metrics</h3>
              </div>
            </Card.Header>
            <Card.Body>
              {projectMetrics?.qualityMetrics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-green-600">First-Time Pass Rate</div>
                      <div className="text-xl font-bold text-green-900">
                        {Math.round(
                          (projectMetrics.qualityMetrics.passedFirstTime /
                            projectMetrics.qualityMetrics.totalInspections) *
                            100
                        )}
                        %
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-600">Client Satisfaction</div>
                      <div className="text-xl font-bold text-blue-900">
                        {projectMetrics.qualityMetrics.clientSatisfactionScore}/5
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {projectMetrics.qualityMetrics.totalInspections}
                      </div>
                      <div className="text-sm text-gray-600">Total Inspections</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">
                        {projectMetrics.qualityMetrics.reworkRequired}
                      </div>
                      <div className="text-sm text-gray-600">Rework Required</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">Quality data not available</div>
              )}
            </Card.Body>
          </Card>
        </div>
      )}

      {activeTab === 'documentation' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Documents Summary */}
          <Card>
            <Card.Header>
              <div className="flex items-center space-x-2">
                <DocumentIcon className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Project Documents</h3>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">As-Built Drawings</span>
                  <span className="text-sm font-medium text-gray-900">12 files</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Warranties</span>
                  <span className="text-sm font-medium text-gray-900">8 files</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">User Manuals</span>
                  <span className="text-sm font-medium text-gray-900">5 files</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Certificates</span>
                  <span className="text-sm font-medium text-gray-900">3 files</span>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Photos Summary */}
          <Card>
            <Card.Header>
              <div className="flex items-center space-x-2">
                <PhotoIcon className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Project Photos</h3>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Progress Photos</span>
                  <span className="text-sm font-medium text-gray-900">156 photos</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Before/After</span>
                  <span className="text-sm font-medium text-gray-900">24 photos</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completion Photos</span>
                  <span className="text-sm font-medium text-gray-900">18 photos</span>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Handover Checklist */}
          <Card>
            <Card.Header>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Handover Status</h3>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-900">Final Inspection</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-900">Client Walkthrough</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-900">Documentation Package</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-900">Final Payment</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  )
}
