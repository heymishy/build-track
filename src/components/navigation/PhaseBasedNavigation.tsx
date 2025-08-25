'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  DocumentCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { Badge } from '@/components/ui/Badge'

type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'

interface Project {
  id: string
  name: string
  status: ProjectStatus
  totalBudget: number
  currency: string
  stats?: {
    totalInvoices: number
    completedMilestones: number
    totalMilestones: number
  }
}

interface PhaseBasedNavigationProps {
  projects: Project[]
  activeView: string
  onViewChange: (view: string) => void
  loading?: boolean
}

interface NavItem {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  count?: number
  description: string
}

export function PhaseBasedNavigation({
  projects,
  activeView,
  onViewChange,
  loading = false,
}: PhaseBasedNavigationProps) {
  const router = useRouter()

  // Calculate project counts by phase
  const projectCounts = {
    all: projects.length,
    planning: projects.filter(p => p.status === 'PLANNING').length,
    construction: projects.filter(p => p.status === 'IN_PROGRESS').length,
    completed: projects.filter(p => p.status === 'COMPLETED').length,
    onHold: projects.filter(p => p.status === 'ON_HOLD').length,
  }

  // Don't show "Get Started" if we're still loading projects
  const hasMultipleProjects = projects.length > 1
  const hasActiveProjects = projectCounts.planning + projectCounts.construction > 0
  const shouldShowGetStarted = !loading && projects.length === 0

  // For now, always show the multi-project view (construction company perspective)
  // This can be made configurable later based on user role or settings
  const useMultiProjectView = projects.length > 0

  // Define navigation items based on user type
  const getNavItems = (): NavItem[] => {
    if (useMultiProjectView && !shouldShowGetStarted) {
      // Construction company view - show all phases with counts
      return [
        {
          key: 'all',
          label: 'All Projects',
          icon: BuildingOffice2Icon,
          color: 'text-gray-800',
          bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-300',
          count: projectCounts.all,
          description: `Manage all ${projectCounts.all} projects`,
        },
        {
          key: 'planning',
          label: 'Planning Phase',
          icon: DocumentCheckIcon,
          color: 'text-blue-800',
          bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-300',
          count: projectCounts.planning,
          description: 'Projects in planning and estimation',
        },
        {
          key: 'construction',
          label: 'Construction',
          icon: ClockIcon,
          color: 'text-orange-800',
          bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-300',
          count: projectCounts.construction,
          description: 'Active construction projects',
        },
        {
          key: 'completed',
          label: 'Completed',
          icon: CheckCircleIcon,
          color: 'text-green-800',
          bgColor: 'bg-green-50 hover:bg-green-100 border-green-300',
          count: projectCounts.completed,
          description: 'Completed projects and reports',
        },
      ]
    } else {
      // Single project client view - focus on current project's phase
      const currentProject = projects[0]
      if (shouldShowGetStarted) {
        return [
          {
            key: 'planning',
            label: 'Get Started',
            icon: DocumentCheckIcon,
            color: 'text-blue-800',
            bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-300',
            description: 'Create your first project',
          },
        ]
      }

      // If we have projects but loading, or currentProject exists
      return [
        {
          key: 'planning',
          label: 'Planning',
          icon: DocumentCheckIcon,
          color: 'text-blue-800',
          bgColor:
            currentProject.status === 'PLANNING'
              ? 'bg-blue-100 border-blue-400'
              : 'bg-blue-50 hover:bg-blue-100 border-blue-300',
          description: 'Estimates and project setup',
        },
        {
          key: 'construction',
          label: 'Construction',
          icon: ClockIcon,
          color: 'text-orange-800',
          bgColor:
            currentProject.status === 'IN_PROGRESS'
              ? 'bg-orange-100 border-orange-400'
              : 'bg-orange-50 hover:bg-orange-100 border-orange-300',
          description: 'Track progress and manage work',
        },
        {
          key: 'completed',
          label: 'Completion',
          icon: CheckCircleIcon,
          color: 'text-green-800',
          bgColor:
            currentProject.status === 'COMPLETED'
              ? 'bg-green-100 border-green-400'
              : 'bg-green-50 hover:bg-green-100 border-green-300',
          description: 'Final reports and documentation',
        },
      ]
    }
  }

  const navItems = getNavItems()

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto">
        {/* Header section with context */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">BuildTrack</h1>
              <p className="text-gray-600 text-sm mt-1">
                {projects.length > 1
                  ? `Managing ${projects.length} construction projects`
                  : projects.length === 1
                    ? `Project: ${projects[0].name}`
                    : 'Construction Project Management'}
              </p>
            </div>

            {/* Quick stats for project view */}
            {useMultiProjectView && (
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{projectCounts.planning}</div>
                  <div>Planning</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-orange-600">{projectCounts.construction}</div>
                  <div>Active</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">{projectCounts.completed}</div>
                  <div>Done</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Phase navigation */}
        <nav className="px-6">
          <div className="flex space-x-1 py-4">
            {navItems.map(item => {
              const isActive = item.key === activeView
              const Icon = item.icon

              return (
                <button
                  key={item.key}
                  onClick={() => onViewChange(item.key)}
                  className={`
                    relative flex items-center px-4 py-3 rounded-lg border transition-all duration-200
                    ${
                      isActive
                        ? `${item.bgColor} ${item.color} border-current shadow-sm`
                        : `${item.bgColor} text-gray-700 border-gray-200 hover:shadow-sm`
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? item.color : 'text-gray-500'}`} />

                  <div className="flex-1 text-left">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{item.label}</span>
                      {typeof item.count !== 'undefined' && (
                        <Badge
                          variant="secondary"
                          className={`${isActive ? 'bg-white bg-opacity-50' : 'bg-gray-100'} text-xs`}
                        >
                          {item.count}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <div
                      className={`absolute bottom-0 left-0 right-0 h-1 ${item.color.replace('text-', 'bg-')} rounded-b-lg`}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Secondary navigation hint */}
        {useMultiProjectView && activeView !== 'all' && (
          <div className="px-6 pb-3">
            <div className="text-xs text-gray-500">
              Showing projects in{' '}
              <span className="font-medium">{navItems.find(n => n.key === activeView)?.label}</span>{' '}
              phase
              <button
                onClick={() => onViewChange('all')}
                className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                View all projects
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Context provider for phase-based navigation state
interface PhaseNavigationContextType {
  activePhase: string
  setActivePhase: (phase: string) => void
  filteredProjects: Project[]
  allProjects: Project[]
}

const PhaseNavigationContext = React.createContext<PhaseNavigationContextType | null>(null)

export function PhaseNavigationProvider({
  children,
  projects,
}: {
  children: React.ReactNode
  projects: Project[]
}) {
  const [activePhase, setActivePhase] = useState('all')

  const filteredProjects = React.useMemo(() => {
    switch (activePhase) {
      case 'planning':
        return projects.filter(p => p.status === 'PLANNING')
      case 'construction':
        return projects.filter(p => p.status === 'IN_PROGRESS')
      case 'completed':
        return projects.filter(p => p.status === 'COMPLETED')
      case 'all':
      default:
        return projects
    }
  }, [projects, activePhase])

  return (
    <PhaseNavigationContext.Provider
      value={{
        activePhase,
        setActivePhase,
        filteredProjects,
        allProjects: projects,
      }}
    >
      {children}
    </PhaseNavigationContext.Provider>
  )
}

export function usePhaseNavigation() {
  const context = React.useContext(PhaseNavigationContext)
  if (!context) {
    throw new Error('usePhaseNavigation must be used within PhaseNavigationProvider')
  }
  return context
}
