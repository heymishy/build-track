'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  DocumentCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  PauseIcon
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'
  totalBudget: number
  currency: string
  description?: string
  createdAt: Date
}

interface ProjectListProps {
  projects: Project[]
  emptyMessage?: string
}

const statusConfig = {
  PLANNING: {
    label: 'Planning',
    color: 'bg-blue-100 text-blue-800',
    icon: DocumentCheckIcon
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-orange-100 text-orange-800',
    icon: ClockIcon
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircleIcon
  },
  ON_HOLD: {
    label: 'On Hold',
    color: 'bg-gray-100 text-gray-800',
    icon: PauseIcon
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    icon: PauseIcon
  }
}

export function ProjectList({ projects, emptyMessage = "No projects found" }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">{emptyMessage}</div>
        <p className="text-gray-500">Create a new project to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => {
        const config = statusConfig[project.status]
        const Icon = config.icon

        return (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <Card.Body className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Icon className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {project.name}
                  </h3>
                </div>
                <Badge className={config.color}>
                  {config.label}
                </Badge>
              </div>

              {project.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Budget:</span>
                  <span className="font-medium text-gray-900">
                    ${project.totalBudget?.toLocaleString() || 0} {project.currency || 'NZD'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Created:</span>
                  <span className="text-gray-700">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View Details →
                </button>
              </div>
            </Card.Body>
          </Card>
        )
      })}
    </div>
  )
}