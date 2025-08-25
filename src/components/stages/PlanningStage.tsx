'use client'

import React, { useState } from 'react'
import {
  PlusIcon,
  DocumentArrowUpIcon,
  UserPlusIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EstimateManager } from '@/components/estimates/EstimateManager'

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

interface PlanningStageProps {
  project: Project
  activeTab: string
}

export function PlanningStage({ project, activeTab }: PlanningStageProps) {
  const [showEstimateModal, setShowEstimateModal] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <PlanningOverview project={project} />

      case 'estimates':
        return <EstimateManager projectId={project.id} />

      case 'documents':
        return <DocumentManager project={project} />

      case 'client':
        return <ClientManagement project={project} />

      default:
        return <PlanningOverview project={project} />
    }
  }

  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{renderTabContent()}</div>
}

function PlanningOverview({ project }: { project: Project }) {
  const quickActions = [
    {
      title: 'Create Estimate',
      description: 'Build detailed cost estimates for trades and materials',
      icon: ClipboardDocumentListIcon,
      color: 'bg-blue-500',
      action: () => console.log('Create estimate'),
    },
    {
      title: 'Upload Documents',
      description: 'Add plans, permits, and contracts',
      icon: DocumentArrowUpIcon,
      color: 'bg-green-500',
      action: () => console.log('Upload documents'),
    },
    {
      title: 'Set Budget',
      description: 'Define project budget and financial parameters',
      icon: CurrencyDollarIcon,
      color: 'bg-purple-500',
      action: () => console.log('Set budget'),
    },
    {
      title: 'Add Team Members',
      description: 'Invite clients and team members to project',
      icon: UserPlusIcon,
      color: 'bg-orange-500',
      action: () => console.log('Add team'),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Planning Stage Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Planning & Estimation</h1>
            <p className="text-gray-600 mb-4">
              Set up your project foundation with estimates, documents, and team collaboration
            </p>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                Planning Stage
              </Badge>
              <span className="text-sm text-gray-500">
                Budget: {project.currency} {project.totalBudget.toLocaleString()}
              </span>
            </div>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">Ready for Construction</Button>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
          <Card
            key={index}
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={action.action}
          >
            <div className="flex items-start">
              <div className={`rounded-lg p-3 ${action.color}`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Project Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estimates</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Line Items</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Total</span>
              <span className="font-medium">{project.currency} 0</span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Estimate
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Documents</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Files</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Categories</span>
              <span className="font-medium">0</span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Team</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Team Members</span>
              <span className="font-medium">1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Client Access</span>
              <span className="font-medium">Pending</span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              <UserPlusIcon className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function DocumentManager({ project }: { project: Project }) {
  const documentCategories = [
    { name: 'Blueprints', count: 0, color: 'bg-blue-100 text-blue-800' },
    { name: 'Permits', count: 0, color: 'bg-green-100 text-green-800' },
    { name: 'Contracts', count: 0, color: 'bg-purple-100 text-purple-800' },
    { name: 'Photos', count: 0, color: 'bg-orange-100 text-orange-800' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Project Documents</h2>
        <Button>
          <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
          Upload Documents
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {documentCategories.map(category => (
          <Card key={category.name} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">{category.name}</h3>
              <Badge className={category.color}>{category.count}</Badge>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              No {category.name.toLowerCase()} uploaded yet
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Add {category.name}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by uploading your first document</p>
          <div className="mt-6">
            <Button>
              <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function ClientManagement({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Client & Team</h2>
        <Button>
          <UserPlusIcon className="w-5 h-5 mr-2" />
          Invite Member
        </Button>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
          <p className="mt-1 text-sm text-gray-500">
            Invite your client and team members to collaborate
          </p>
          <div className="mt-6">
            <Button>
              <UserPlusIcon className="w-5 h-5 mr-2" />
              Send Invitation
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
