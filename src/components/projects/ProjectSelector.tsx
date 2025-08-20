/**
 * Project Selector Component
 * Allows users to select projects and assign invoices
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronDownIcon, PlusIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  status: string
  totalBudget: number
  currency: string
  stats: {
    totalInvoices: number
    budgetUsed: number
    budgetRemaining: number
    budgetUsedPercent: number
    isOverBudget: boolean
  }
}

interface ProjectSelectorProps {
  selectedProjectId?: string | null
  onProjectSelect: (project: Project | null) => void
  onCreateProject: () => void
  showCreateButton?: boolean
}

export function ProjectSelector({
  selectedProjectId,
  onProjectSelect,
  onCreateProject,
  showCreateButton = true,
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        credentials: 'include', // Include cookies for authentication
      })
      const data = await response.json()

      if (data.success) {
        setProjects(data.projects)
      } else {
        setError(data.error || 'Failed to fetch projects')
      }
    } catch (err) {
      setError('Failed to fetch projects')
      console.error('Error fetching projects:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'text-blue-600 bg-blue-100'
      case 'IN_PROGRESS':
        return 'text-green-600 bg-green-100'
      case 'ON_HOLD':
        return 'text-yellow-600 bg-yellow-100'
      case 'COMPLETED':
        return 'text-gray-600 bg-gray-100'
      case 'CANCELLED':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatCurrency = (amount: number, currency: string = 'NZD') => {
    const symbol = currency === 'NZD' ? 'NZ$' : '$'
    return `${symbol}${amount.toLocaleString()}`
  }

  if (isLoading) {
    return (
      <div className="relative">
        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-gray-300 rounded w-32"></div>
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative">
        <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50">
          <span className="text-sm text-red-600">{error}</span>
        </div>
        {showCreateButton && (
          <button
            onClick={onCreateProject}
            className="mt-2 w-full flex items-center justify-center px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:border-gray-400"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create New Project
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="project-selector"
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          selectedProject ? 'border-gray-300 bg-white' : 'border-gray-300 bg-gray-50 text-gray-500'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          {selectedProject ? (
            <div className="flex items-center space-x-3 min-w-0">
              <BuildingOfficeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {selectedProject.name}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedProject.status)}`}
                  >
                    {selectedProject.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <span>
                    Budget: {formatCurrency(selectedProject.totalBudget, selectedProject.currency)}
                  </span>
                  <span
                    className={
                      selectedProject.stats.isOverBudget ? 'text-red-600' : 'text-green-600'
                    }
                  >
                    {selectedProject.stats.budgetUsedPercent.toFixed(1)}% used
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <span className="text-sm">Select a project...</span>
          )}
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {projects.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">No projects available</div>
          ) : (
            <>
              {projects.map(project => (
                <button
                  key={project.id}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  onClick={() => {
                    onProjectSelect(project)
                    setIsOpen(false)
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {project.name}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}
                        >
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>
                            {formatCurrency(project.totalBudget, project.currency)} budget
                          </span>
                          <span>{project.stats.totalInvoices} invoices</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                project.stats.isOverBudget ? 'bg-red-500' : 'bg-green-500'
                              }`}
                              style={{
                                width: `${Math.min(100, project.stats.budgetUsedPercent)}%`,
                              }}
                            ></div>
                          </div>
                          <span
                            className={`text-xs font-medium ${
                              project.stats.isOverBudget ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {project.stats.budgetUsedPercent.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {/* Clear Selection Option */}
              {selectedProject && (
                <>
                  <div className="border-t border-gray-200"></div>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 text-gray-500"
                    onClick={() => {
                      onProjectSelect(null)
                      setIsOpen(false)
                    }}
                  >
                    <span className="text-sm">Clear selection</span>
                  </button>
                </>
              )}
            </>
          )}

          {/* Create New Project Option */}
          {showCreateButton && (
            <>
              <div className="border-t border-gray-200"></div>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:outline-none focus:bg-blue-50 text-blue-600"
                onClick={() => {
                  onCreateProject()
                  setIsOpen(false)
                }}
              >
                <div className="flex items-center space-x-2">
                  <PlusIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Create New Project</span>
                </div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
