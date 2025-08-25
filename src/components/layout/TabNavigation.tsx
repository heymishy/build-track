'use client'

import { ReactNode, useState } from 'react'
import { tokens } from '@/lib/design-system'

export interface TabItem {
  id: string
  name: string
  icon?: ReactNode
  badge?: string | number
  disabled?: boolean
}

interface TabNavigationProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'pills' | 'underline'
}

export function TabNavigation({ 
  tabs, 
  activeTab, 
  onTabChange, 
  className = '',
  size = 'md',
  variant = 'underline'
}: TabNavigationProps) {
  const sizeClasses = {
    sm: 'text-sm py-2 px-3',
    md: 'text-sm py-3 px-4',
    lg: 'text-base py-4 px-6'
  }

  const baseClasses = `
    relative inline-flex items-center justify-center font-medium transition-colors
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    ${sizeClasses[size]}
  `

  const variantClasses = {
    default: {
      container: 'border-b border-gray-200',
      active: 'text-blue-600 border-b-2 border-blue-600',
      inactive: 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'
    },
    pills: {
      container: 'bg-gray-100 p-1 rounded-lg',
      active: 'bg-white text-blue-600 shadow-sm',
      inactive: 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
    },
    underline: {
      container: 'border-b border-gray-200',
      active: 'text-blue-600 border-b-2 border-blue-600',
      inactive: 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'
    }
  }

  const { container, active, inactive } = variantClasses[variant]

  return (
    <nav 
      className={`${container} ${className}`}
      aria-label="Tab navigation"
      data-testid="tab-navigation"
    >
      <div className={`flex ${variant === 'pills' ? 'space-x-1' : 'space-x-8'}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const isDisabled = tab.disabled

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              disabled={isDisabled}
              className={`
                ${baseClasses}
                ${isActive ? active : inactive}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${variant === 'pills' ? 'rounded-md' : ''}
              `}
              aria-selected={isActive}
              aria-disabled={isDisabled}
              data-testid={`tab-${tab.id}`}
            >
              {tab.icon && (
                <span className="mr-2 flex-shrink-0">
                  {tab.icon}
                </span>
              )}
              
              <span>{tab.name}</span>
              
              {tab.badge && (
                <span className={`
                  ml-2 px-2 py-0.5 text-xs rounded-full
                  ${isActive 
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// Tab Panel component for content
interface TabPanelProps {
  tabId: string
  activeTab: string
  children: ReactNode
  className?: string
  lazy?: boolean
}

export function TabPanel({ 
  tabId, 
  activeTab, 
  children, 
  className = '',
  lazy = false
}: TabPanelProps) {
  const isActive = activeTab === tabId
  
  // Lazy loading: don't render content until tab is active for the first time
  if (lazy && !isActive) {
    return null
  }

  return (
    <div
      role="tabpanel"
      aria-labelledby={`tab-${tabId}`}
      hidden={!isActive}
      className={className}
      data-testid={`tab-panel-${tabId}`}
    >
      {children}
    </div>
  )
}

// Complete tabs component with panels
interface TabsProps {
  tabs: TabItem[]
  defaultTab?: string
  onTabChange?: (tabId: string) => void
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'pills' | 'underline'
}

export function Tabs({
  tabs,
  defaultTab,
  onTabChange,
  children,
  className = '',
  ...navigationProps
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '')

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onTabChange?.(tabId)
  }

  return (
    <div className={className} data-testid="tabs-container">
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        {...navigationProps}
      />
      
      <div className="mt-6">
        {children}
      </div>
    </div>
  )
}