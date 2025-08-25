'use client'

import React from 'react'
import { 
  ChartBarIcon,
  DocumentArrowDownIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Project {
  id: string
  name: string
  description?: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'
  totalBudget: number
  currency: string
  startDate?: string
  estimatedEndDate?: string
  actualEndDate?: string
}

interface CompletionStageProps {
  project: Project
  activeTab: string
}

export function CompletionStage({ project, activeTab }: CompletionStageProps) {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <CompletionOverview project={project} />
      
      case 'reports':
        return <FinalReports project={project} />
      
      case 'reconciliation':
        return <FinalReconciliation project={project} />
      
      case 'documents':
        return <DocumentArchive project={project} />
      
      default:
        return <CompletionOverview project={project} />
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {renderTabContent()}
    </div>
  )
}

function CompletionOverview({ project }: { project: Project }) {
  const completionMetrics = [
    {
      title: 'Generate Final Report',
      description: 'Comprehensive project completion report',
      icon: ClipboardDocumentListIcon,
      color: 'bg-green-500',
      action: () => console.log('Generate report')
    },
    {
      title: 'Export Documents',
      description: 'Download all project documents',
      icon: DocumentArrowDownIcon,
      color: 'bg-blue-500',
      action: () => console.log('Export documents')
    },
    {
      title: 'Final Reconciliation',
      description: 'Review budget vs actual costs',
      icon: CurrencyDollarIcon,
      color: 'bg-purple-500',
      action: () => console.log('Final reconciliation')
    },
    {
      title: 'Archive Project',
      description: 'Move project to long-term storage',
      icon: ChartBarIcon,
      color: 'bg-gray-500',
      action: () => console.log('Archive project')
    }
  ]

  // Calculate project duration
  const startDate = project.startDate ? new Date(project.startDate) : null
  const endDate = project.actualEndDate ? new Date(project.actualEndDate) : new Date()
  const durationDays = startDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <div className="space-y-6">
      {/* Completion Stage Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Project Completed
            </h1>
            <p className="text-gray-600 mb-4">
              Review final results, generate reports, and archive project documents
            </p>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                Completed
              </Badge>
              <span className="text-sm text-gray-500">
                Completed: {project.actualEndDate ? new Date(project.actualEndDate).toLocaleDateString() : 'Today'}
              </span>
              {durationDays > 0 && (
                <span className="text-sm text-gray-500">
                  Duration: {durationDays} days
                </span>
              )}
            </div>
          </div>
          <Button className="bg-green-600 hover:bg-green-700">
            <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
            Export Project
          </Button>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {completionMetrics.map((action, index) => (
          <Card key={index} className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={action.action}>
            <div className="flex items-start">
              <div className={`rounded-lg p-3 ${action.color}`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {action.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Project Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Planned Duration</span>
              <span className="font-medium">
                {project.startDate && project.estimatedEndDate ? 
                  Math.ceil((new Date(project.estimatedEndDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0} days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Actual Duration</span>
              <span className="font-medium">{durationDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Variance</span>
              <span className={`font-medium ${
                project.estimatedEndDate && project.startDate && durationDays > 0 ? 
                (durationDays > Math.ceil((new Date(project.estimatedEndDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)) ? 'text-red-600' : 'text-green-600') : 
                'text-gray-900'
              }`}>
                {project.estimatedEndDate && project.startDate && durationDays > 0 ? 
                  `${durationDays - Math.ceil((new Date(project.estimatedEndDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))} days` : 
                  'N/A'}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Budget Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Budget</span>
              <span className="font-medium">{project.currency} {project.totalBudget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Spent</span>
              <span className="font-medium">{project.currency} 0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Variance</span>
              <span className="font-medium text-green-600">{project.currency} {project.totalBudget.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Completion Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Milestones</span>
              <span className="font-medium">0 / 0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Invoices</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Documents</span>
              <span className="font-medium">0</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function FinalReports({ project }: { project: Project }) {
  const reportTypes = [
    {
      name: 'Cost Analysis Report',
      description: 'Detailed breakdown of all project costs vs budget',
      icon: CurrencyDollarIcon,
      status: 'Ready',
      color: 'bg-green-100 text-green-800'
    },
    {
      name: 'Timeline Report',
      description: 'Project timeline analysis with milestones',
      icon: ClockIcon,
      status: 'Ready',
      color: 'bg-green-100 text-green-800'
    },
    {
      name: 'Quality Report',
      description: 'Quality metrics and completion standards',
      icon: CheckCircleIcon,
      status: 'Ready',
      color: 'bg-green-100 text-green-800'
    },
    {
      name: 'Final Summary',
      description: 'Executive summary of project completion',
      icon: ClipboardDocumentListIcon,
      status: 'Ready',
      color: 'bg-green-100 text-green-800'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Final Reports</h2>
        <Button>
          <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
          Download All Reports
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <report.icon className="w-6 h-6 text-gray-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    {report.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {report.description}
                  </p>
                  <Badge className={report.color}>{report.status}</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Download
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function FinalReconciliation({ project }: { project: Project }) {
  const reconciliationItems = [
    {
      category: 'Materials',
      budgeted: 25000,
      actual: 0,
      variance: 25000,
      variangePercent: 100
    },
    {
      category: 'Labor',
      budgeted: 35000,
      actual: 0,
      variance: 35000,
      variangePercent: 100
    },
    {
      category: 'Equipment',
      budgeted: 8000,
      actual: 0,
      variance: 8000,
      variangePercent: 100
    },
    {
      category: 'Subcontractors',
      budgeted: 15000,
      actual: 0,
      variance: 15000,
      variangePercent: 100
    },
    {
      category: 'Permits & Fees',
      budgeted: 3000,
      actual: 0,
      variance: 3000,
      variangePercent: 100
    }
  ]

  const totalBudgeted = reconciliationItems.reduce((sum, item) => sum + item.budgeted, 0)
  const totalActual = reconciliationItems.reduce((sum, item) => sum + item.actual, 0)
  const totalVariance = totalBudgeted - totalActual

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Final Reconciliation</h2>
        <Button>
          <CurrencyDollarIcon className="w-5 h-5 mr-2" />
          Export Reconciliation
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Budget</h3>
          <div className="text-3xl font-bold text-gray-900">
            {project.currency} {totalBudgeted.toLocaleString()}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Spent</h3>
          <div className="text-3xl font-bold text-gray-900">
            {project.currency} {totalActual.toLocaleString()}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Variance</h3>
          <div className={`text-3xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {project.currency} {Math.abs(totalVariance).toLocaleString()}
          </div>
          <p className="text-sm text-gray-500">
            {totalVariance >= 0 ? 'Under Budget' : 'Over Budget'}
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Margin</h3>
          <div className={`text-3xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalBudgeted > 0 ? ((totalVariance / totalBudgeted) * 100).toFixed(1) : 0}%
          </div>
        </Card>
      </div>

      {/* Detailed Reconciliation Table */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budgeted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reconciliationItems.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.currency} {item.budgeted.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.currency} {item.actual.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.variance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {project.currency} {Math.abs(item.variance).toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.variance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.budgeted > 0 ? ((item.variance / item.budgeted) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  {project.currency} {totalBudgeted.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  {project.currency} {totalActual.toLocaleString()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                  totalVariance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {project.currency} {Math.abs(totalVariance).toLocaleString()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                  totalVariance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {totalBudgeted > 0 ? ((totalVariance / totalBudgeted) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}

function DocumentArchive({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Document Archive</h2>
        <Button>
          <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
          Download All
        </Button>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-800">
              <strong>Project Completed:</strong> All documents are now archived and available for download. 
              This data will be retained according to your retention policy.
            </p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No archived documents</h3>
          <p className="mt-1 text-sm text-gray-500">
            Documents from all project stages will appear here once available
          </p>
          <div className="mt-6">
            <Button variant="outline">
              View All Documents
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}