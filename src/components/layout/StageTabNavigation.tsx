'use client'

import React from 'react'
import {
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  PhotoIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'

interface TabItem {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  disabled?: boolean
}

interface StageTabNavigationProps {
  currentStage: ProjectStatus
  activeTab: string
  onTabChange: (tabKey: string) => void
  counts?: Record<string, number>
}

const stageTabsConfig: Record<ProjectStatus, TabItem[]> = {
  PLANNING: [
    { key: 'overview', label: 'Overview', icon: ChartBarIcon },
    { key: 'estimates', label: 'Estimates', icon: ClipboardDocumentListIcon },
    { key: 'documents', label: 'Documents', icon: DocumentTextIcon },
    { key: 'client', label: 'Client', icon: UserGroupIcon },
  ],
  IN_PROGRESS: [
    { key: 'overview', label: 'Overview', icon: ChartBarIcon },
    { key: 'progress', label: 'Progress Logs', icon: PhotoIcon },
    { key: 'milestones', label: 'Milestones', icon: CheckCircleIcon },
    { key: 'labor', label: 'Labor Tracking', icon: ClockIcon },
    { key: 'invoices', label: 'Invoices', icon: CurrencyDollarIcon },
    { key: 'subcontractors', label: 'Sub-contractors', icon: WrenchScrewdriverIcon },
    { key: 'documents', label: 'Documents', icon: DocumentTextIcon },
  ],
  COMPLETED: [
    { key: 'overview', label: 'Overview', icon: ChartBarIcon },
    { key: 'reports', label: 'Final Reports', icon: ClipboardDocumentListIcon },
    { key: 'reconciliation', label: 'Reconciliation', icon: CurrencyDollarIcon },
    { key: 'documents', label: 'Archive', icon: DocumentTextIcon },
  ],
  ON_HOLD: [
    { key: 'overview', label: 'Overview', icon: ChartBarIcon },
    { key: 'estimates', label: 'Estimates', icon: ClipboardDocumentListIcon },
    { key: 'documents', label: 'Documents', icon: DocumentTextIcon },
  ],
  CANCELLED: [
    { key: 'overview', label: 'Overview', icon: ChartBarIcon },
    { key: 'documents', label: 'Archive', icon: DocumentTextIcon },
  ],
}

const stageColors: Record<ProjectStatus, string> = {
  PLANNING: 'border-blue-500 text-blue-600',
  IN_PROGRESS: 'border-orange-500 text-orange-600',
  COMPLETED: 'border-green-500 text-green-600',
  ON_HOLD: 'border-yellow-500 text-yellow-600',
  CANCELLED: 'border-gray-500 text-gray-600',
}

export function StageTabNavigation({
  currentStage,
  activeTab,
  onTabChange,
  counts = {},
}: StageTabNavigationProps) {
  const tabs = stageTabsConfig[currentStage] || stageTabsConfig.PLANNING
  const stageColor = stageColors[currentStage]

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto">
        <nav className="flex space-x-8 px-4 sm:px-6 lg:px-8" aria-label="Tabs">
          {tabs.map(tab => {
            const isActive = tab.key === activeTab
            const count = counts[tab.key]
            const TabIcon = tab.icon

            return (
              <button
                key={tab.key}
                onClick={() => !tab.disabled && onTabChange(tab.key)}
                disabled={tab.disabled}
                className={`
                  ${
                    isActive
                      ? `border-b-2 ${stageColor} font-medium`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                  ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  group inline-flex items-center py-4 px-1 border-b-2 text-sm font-medium transition-colors duration-200
                `}
                type="button"
              >
                <TabIcon
                  className={`
                    ${
                      isActive
                        ? currentStage === 'PLANNING'
                          ? 'text-blue-500'
                          : currentStage === 'IN_PROGRESS'
                            ? 'text-orange-500'
                            : currentStage === 'COMPLETED'
                              ? 'text-green-500'
                              : currentStage === 'ON_HOLD'
                                ? 'text-yellow-500'
                                : 'text-gray-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }
                    -ml-0.5 mr-2 h-5 w-5
                  `}
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`
                    ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${
                      isActive
                        ? currentStage === 'PLANNING'
                          ? 'bg-blue-100 text-blue-800'
                          : currentStage === 'IN_PROGRESS'
                            ? 'bg-orange-100 text-orange-800'
                            : currentStage === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : currentStage === 'ON_HOLD'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                        : 'bg-gray-100 text-gray-600'
                    }
                  `}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
