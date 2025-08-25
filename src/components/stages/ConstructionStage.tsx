'use client'

import React, { useState } from 'react'
import { 
  PlusIcon,
  ClockIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MilestoneManagement } from '@/components/projects/MilestoneManagement'
import { WeeklyProgressManager } from '@/components/progress/WeeklyProgressManager'
import { LaborTrackingManager } from '@/components/labor/LaborTrackingManager'

interface Project {
  id: string
  name: string
  description?: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'
  totalBudget: number
  currency: string
  startDate?: string
  estimatedEndDate?: string
}

interface ConstructionStageProps {
  project: Project
  activeTab: string
}

export function ConstructionStage({ project, activeTab }: ConstructionStageProps) {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ConstructionOverview project={project} />
      
      case 'progress':
        return <WeeklyProgressManager projectId={project.id} />
      
      case 'milestones':
        return <MilestoneManagement project={project} />
      
      case 'labor':
        return <LaborTrackingManager projectId={project.id} />
      
      case 'invoices':
        return <InvoiceManagement project={project} />
      
      case 'subcontractors':
        return <SubcontractorManagement project={project} />
      
      case 'documents':
        return <ConstructionDocuments project={project} />
      
      default:
        return <ConstructionOverview project={project} />
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {renderTabContent()}
    </div>
  )
}

function ConstructionOverview({ project }: { project: Project }) {
  const quickActions = [
    {
      title: 'Log Progress',
      description: 'Add weekly progress with photos',
      icon: PhotoIcon,
      color: 'bg-orange-500',
      action: () => console.log('Log progress')
    },
    {
      title: 'Track Labor',
      description: 'Log work hours for team members',
      icon: ClockIcon,
      color: 'bg-blue-500',
      action: () => console.log('Track labor')
    },
    {
      title: 'Process Invoice',
      description: 'Add supplier and subcontractor invoices',
      icon: CurrencyDollarIcon,
      color: 'bg-green-500',
      action: () => console.log('Process invoice')
    },
    {
      title: 'Update Milestone',
      description: 'Mark milestones as complete',
      icon: CheckCircleIcon,
      color: 'bg-purple-500',
      action: () => console.log('Update milestone')
    }
  ]

  return (
    <div className="space-y-6">
      {/* Construction Stage Header */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Construction in Progress
            </h1>
            <p className="text-gray-600 mb-4">
              Track work progress, manage labor, and process invoices
            </p>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                Construction Stage
              </Badge>
              <span className="text-sm text-gray-500">
                Started: {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}
              </span>
            </div>
          </div>
          <Button className="bg-green-600 hover:bg-green-700">
            Mark Complete
          </Button>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
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

      {/* Progress Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Days Active</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completion Date</span>
              <span className="font-medium text-sm">
                {project.estimatedEndDate ? new Date(project.estimatedEndDate).toLocaleDateString() : 'TBD'}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Labor</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Hours This Week</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Hours</span>
              <span className="font-medium">0</span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              <ClockIcon className="w-4 h-4 mr-2" />
              Log Hours
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Progress</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Milestones</span>
              <span className="font-medium">0 / 0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Progress Logs</span>
              <span className="font-medium">0</span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              <PhotoIcon className="w-4 h-4 mr-2" />
              Add Progress
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Invoices</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Pending</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">This Week</span>
              <span className="font-medium">{project.currency} 0</span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              <CurrencyDollarIcon className="w-4 h-4 mr-2" />
              Add Invoice
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function ProgressLogs({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Weekly Progress Logs</h2>
        <Button>
          <PlusIcon className="w-5 h-5 mr-2" />
          New Progress Log
        </Button>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No progress logs</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start documenting your weekly construction progress
          </p>
          <div className="mt-6">
            <Button>
              <PhotoIcon className="w-5 h-5 mr-2" />
              Create First Log
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function LaborTracking({ project }: { project: Project }) {
  const laborRoles = [
    { role: 'Senior Builder', rate: 85, hours: 0 },
    { role: 'Builder', rate: 65, hours: 0 },
    { role: 'Apprentice', rate: 45, hours: 0 },
    { role: 'Labourer', rate: 35, hours: 0 },
    { role: 'Specialist', rate: 95, hours: 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Labor Tracking</h2>
        <Button>
          <ClockIcon className="w-5 h-5 mr-2" />
          Log Hours
        </Button>
      </div>

      {/* Labor Rates */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Hourly Rates</h3>
        <div className="space-y-4">
          {laborRoles.map((labor) => (
            <div key={labor.role} className="flex items-center justify-between py-3 border-b last:border-b-0">
              <div>
                <span className="font-medium text-gray-900">{labor.role}</span>
                <span className="text-sm text-gray-500 ml-2">
                  {project.currency} {labor.rate}/hr + GST
                </span>
              </div>
              <div className="text-right">
                <span className="font-medium">{labor.hours} hours</span>
                <div className="text-sm text-gray-500">This week</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Weekly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">This Week</h3>
          <div className="text-3xl font-bold text-gray-900">0 hrs</div>
          <p className="text-sm text-gray-500">Across all roles</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Labor Cost</h3>
          <div className="text-3xl font-bold text-gray-900">{project.currency} 0</div>
          <p className="text-sm text-gray-500">This week</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Invoices</h3>
          <div className="text-3xl font-bold text-gray-900">0</div>
          <p className="text-sm text-gray-500">Generated</p>
          <Button variant="outline" size="sm" className="w-full mt-4">
            Generate Invoice
          </Button>
        </Card>
      </div>
    </div>
  )
}

function InvoiceManagement({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Invoice Management</h2>
        <Button>
          <CurrencyDollarIcon className="w-5 h-5 mr-2" />
          Add Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pending</h3>
          <div className="text-center py-8">
            <div className="text-2xl font-bold text-orange-600">0</div>
            <p className="text-sm text-gray-500">Awaiting approval</p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Approved</h3>
          <div className="text-center py-8">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <p className="text-sm text-gray-500">Ready for payment</p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Paid</h3>
          <div className="text-center py-8">
            <div className="text-2xl font-bold text-green-600">0</div>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function SubcontractorManagement({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Sub-contractors</h2>
        <Button>
          <UserGroupIcon className="w-5 h-5 mr-2" />
          Add Sub-contractor
        </Button>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No sub-contractors</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add sub-contractors to manage their invoices and access
          </p>
          <div className="mt-6">
            <Button>
              <UserGroupIcon className="w-5 h-5 mr-2" />
              Add Sub-contractor
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function ConstructionDocuments({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Construction Documents</h2>
        <Button>
          <PlusIcon className="w-5 h-5 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <PhotoIcon className="h-5 w-5 text-orange-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-orange-800">
              <strong>Construction Stage:</strong> Estimates are now locked. Documents uploaded here are for construction tracking and progress documentation.
            </p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No construction documents</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload progress photos, updated plans, and construction documentation
          </p>
          <div className="mt-6">
            <Button>
              Upload Documents
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}