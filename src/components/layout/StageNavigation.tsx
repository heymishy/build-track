'use client'

import React from 'react'
import { CheckCircleIcon, ClockIcon, DocumentCheckIcon } from '@heroicons/react/24/solid'
import { Badge } from '@/components/ui/Badge'

type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'

interface Stage {
  key: ProjectStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  color: string
  bgColor: string
}

interface StageNavigationProps {
  currentStage: ProjectStatus
  onStageChange?: (stage: ProjectStatus) => void
  showTransitionControls?: boolean
  userCanTransition?: boolean
}

const stages: Stage[] = [
  {
    key: 'PLANNING',
    label: 'Planning & Estimation',
    icon: DocumentCheckIcon,
    description: 'Create estimates, manage documents, prepare contracts',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    key: 'IN_PROGRESS',
    label: 'Construction',
    icon: ClockIcon,
    description: 'Track progress, manage invoices, log work hours',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    key: 'COMPLETED',
    label: 'Completion',
    icon: CheckCircleIcon,
    description: 'Final reconciliation, reports, document archival',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
]

export function StageNavigation({
  currentStage,
  onStageChange,
  showTransitionControls = false,
  userCanTransition = false,
}: StageNavigationProps) {
  const currentStageIndex = stages.findIndex(stage => stage.key === currentStage)

  const getStageStatus = (stage: Stage, index: number) => {
    if (index < currentStageIndex) return 'completed'
    if (index === currentStageIndex) return 'current'
    return 'upcoming'
  }

  const getStageStyles = (stage: Stage, status: string) => {
    switch (status) {
      case 'completed':
        return {
          container: 'bg-green-50 border-green-200',
          icon: 'text-green-600 bg-green-100',
          text: 'text-green-900',
          badge: 'bg-green-100 text-green-800',
        }
      case 'current':
        return {
          container: `${stage.bgColor} border-l-4 border-l-blue-500`,
          icon: `${stage.color} bg-white shadow-sm`,
          text: 'text-gray-900 font-medium',
          badge: 'bg-blue-100 text-blue-800',
        }
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-400 bg-gray-100',
          text: 'text-gray-500',
          badge: 'bg-gray-100 text-gray-600',
        }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Project Stage</h2>
        {showTransitionControls && userCanTransition && (
          <div className="flex space-x-2">
            {currentStage === 'PLANNING' && (
              <button
                onClick={() => onStageChange?.('IN_PROGRESS')}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Start Construction
              </button>
            )}
            {currentStage === 'IN_PROGRESS' && (
              <button
                onClick={() => onStageChange?.('COMPLETED')}
                className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
              >
                Mark Complete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stage Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage, index)
            const isLast = index === stages.length - 1

            return (
              <React.Fragment key={stage.key}>
                <div className="flex items-center">
                  <div
                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 
                    ${
                      status === 'completed'
                        ? 'bg-green-100 border-green-500'
                        : status === 'current'
                          ? 'bg-blue-100 border-blue-500'
                          : 'bg-gray-100 border-gray-300'
                    }
                  `}
                  >
                    <stage.icon
                      className={`w-5 h-5 ${
                        status === 'completed'
                          ? 'text-green-600'
                          : status === 'current'
                            ? 'text-blue-600'
                            : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        status === 'current' ? 'text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {stage.label}
                    </p>
                    <p className="text-xs text-gray-500">{stage.description}</p>
                  </div>
                </div>
                {!isLast && (
                  <div
                    className={`
                    flex-shrink-0 w-12 h-px mx-4
                    ${status === 'completed' ? 'bg-green-300' : 'bg-gray-300'}
                  `}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Current Stage Details */}
      <div className="space-y-4">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage, index)
          const styles = getStageStyles(stage, status)

          if (status !== 'current') return null

          return (
            <div key={stage.key} className={`rounded-lg border p-4 ${styles.container}`}>
              <div className="flex items-start">
                <div className={`rounded-lg p-2 ${styles.icon}`}>
                  <stage.icon className="w-5 h-5" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-medium ${styles.text}`}>{stage.label}</h3>
                    <Badge variant="secondary" className={styles.badge}>
                      Current Stage
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{stage.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
