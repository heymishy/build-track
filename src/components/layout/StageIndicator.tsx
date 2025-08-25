'use client'

import React from 'react'
import { 
  DocumentCheckIcon, 
  ClockIcon, 
  CheckCircleIcon,
  PauseCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/solid'
import { Badge } from '@/components/ui/Badge'

type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'

interface StageIndicatorProps {
  currentStage: ProjectStatus
  projectName?: string
  compact?: boolean
  showDescription?: boolean
}

const stageConfig = {
  PLANNING: {
    label: 'Planning & Estimation',
    shortLabel: 'Planning',
    icon: DocumentCheckIcon,
    color: 'bg-blue-500',
    textColor: 'text-blue-800',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Setting up estimates and preparing contracts',
    gradient: 'from-blue-500 to-blue-600'
  },
  IN_PROGRESS: {
    label: 'Construction in Progress',
    shortLabel: 'Construction',
    icon: ClockIcon,
    color: 'bg-orange-500',
    textColor: 'text-orange-800',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Active construction and progress tracking',
    gradient: 'from-orange-500 to-orange-600'
  },
  COMPLETED: {
    label: 'Project Completed',
    shortLabel: 'Completed',
    icon: CheckCircleIcon,
    color: 'bg-green-500',
    textColor: 'text-green-800',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Project finished - final reports available',
    gradient: 'from-green-500 to-green-600'
  },
  ON_HOLD: {
    label: 'Project on Hold',
    shortLabel: 'On Hold',
    icon: PauseCircleIcon,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-800',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    description: 'Project temporarily paused',
    gradient: 'from-yellow-500 to-yellow-600'
  },
  CANCELLED: {
    label: 'Project Cancelled',
    shortLabel: 'Cancelled',
    icon: XCircleIcon,
    color: 'bg-gray-500',
    textColor: 'text-gray-800',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'Project has been cancelled',
    gradient: 'from-gray-500 to-gray-600'
  }
}

export function StageIndicator({ 
  currentStage, 
  projectName, 
  compact = false, 
  showDescription = true 
}: StageIndicatorProps) {
  const config = stageConfig[currentStage]
  const Icon = config.icon

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`p-1.5 rounded-full ${config.color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">
              {config.shortLabel}
            </span>
            <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
          </div>
          {projectName && (
            <p className="text-xs text-gray-500 truncate">{projectName}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`
      relative overflow-hidden rounded-lg border ${config.borderColor} ${config.bgColor}
      ${showDescription ? 'p-4' : 'p-3'}
    `}>
      {/* Gradient background accent */}
      <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-5`} />
      
      <div className="relative flex items-start space-x-3">
        <div className={`flex-shrink-0 p-2 rounded-full ${config.color} shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`text-base font-semibold ${config.textColor}`}>
              {config.label}
            </h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
              <Badge variant="secondary" className={`${config.textColor} ${config.bgColor} border-current`}>
                Active
              </Badge>
            </div>
          </div>
          
          {showDescription && (
            <p className="text-sm text-gray-600 mt-1">
              {config.description}
            </p>
          )}
          
          {projectName && (
            <p className="text-xs text-gray-500 mt-2 font-medium">
              Project: {projectName}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Floating stage indicator for persistent visibility
export function FloatingStageIndicator({ 
  currentStage, 
  projectName 
}: { 
  currentStage: ProjectStatus
  projectName?: string 
}) {
  const config = stageConfig[currentStage]
  const Icon = config.icon

  return (
    <div className="fixed top-20 right-4 z-40">
      <div className={`
        ${config.bgColor} ${config.borderColor} border rounded-full px-3 py-2 shadow-lg 
        backdrop-blur-sm bg-opacity-90 flex items-center space-x-2
      `}>
        <div className={`p-1 rounded-full ${config.color}`}>
          <Icon className="w-3 h-3 text-white" />
        </div>
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.shortLabel}
        </span>
        <div className={`w-1.5 h-1.5 rounded-full ${config.color} animate-pulse`} />
      </div>
    </div>
  )
}

// Breadcrumb-style stage indicator
export function BreadcrumbStageIndicator({ currentStage }: { currentStage: ProjectStatus }) {
  const stages = ['PLANNING', 'IN_PROGRESS', 'COMPLETED'] as const
  const currentIndex = stages.indexOf(currentStage as any)

  return (
    <nav className="flex items-center space-x-2 text-sm">
      {stages.map((stage, index) => {
        const config = stageConfig[stage]
        const Icon = config.icon
        const isActive = stage === currentStage
        const isCompleted = index < currentIndex
        const isUpcoming = index > currentIndex

        return (
          <React.Fragment key={stage}>
            <div className={`
              flex items-center space-x-1.5 px-2 py-1 rounded-md
              ${isActive ? `${config.bgColor} ${config.textColor} font-medium` : 
                isCompleted ? 'bg-green-50 text-green-700' :
                'text-gray-500'}
            `}>
              <Icon className={`w-3.5 h-3.5 ${
                isActive ? config.textColor :
                isCompleted ? 'text-green-600' :
                'text-gray-400'
              }`} />
              <span className="text-xs">
                {config.shortLabel}
              </span>
              {isActive && (
                <div className={`w-1.5 h-1.5 rounded-full ${config.color} animate-pulse ml-1`} />
              )}
            </div>
            {index < stages.length - 1 && (
              <div className={`w-2 h-0.5 ${
                index < currentIndex ? 'bg-green-300' : 'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}