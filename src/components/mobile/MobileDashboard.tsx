'use client'

import { useState } from 'react'
import {
  Bars3Icon,
  XMarkIcon,
  CameraIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { ProjectDashboard } from '@/components/dashboard/ProjectDashboard'
import { ProjectAnalytics } from '@/components/analytics/ProjectAnalytics'

interface MobileDashboardProps {
  user: any
  onLogout: () => void
  children: React.ReactNode
}

type MobileTab = 'overview' | 'projects' | 'analytics' | 'upload'

export function MobileDashboard({ user, onLogout, children }: MobileDashboardProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'projects', label: 'Projects', icon: DocumentTextIcon },
    { id: 'analytics', label: 'Reports', icon: ChartBarIcon },
    { id: 'upload', label: 'Upload', icon: CameraIcon },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview className="px-2" />
      case 'projects':
        return <ProjectDashboard className="px-2" />
      case 'analytics':
        return <ProjectAnalytics className="px-2" />
      case 'upload':
        return <div className="px-2">{children}</div>
      default:
        return <DashboardOverview className="px-2" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">BuildTrack</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-700 truncate max-w-24">{user?.name}</div>
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 text-gray-600 hover:text-gray-900"
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black bg-opacity-25"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 -mr-2 text-gray-600 hover:text-gray-900"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-6">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{user?.role}</p>
                  </div>
                </div>
              </div>

              <nav className="space-y-2">
                {tabs.map(tab => {
                  const IconComponent = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as MobileTab)
                        setSidebarOpen(false)
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    onLogout()
                    setSidebarOpen(false)
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left text-red-700 hover:bg-red-50 transition-colors"
                >
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="py-4 sm:py-6">{renderTabContent()}</div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <div className="bg-white border-t border-gray-200 lg:hidden">
        <div className="grid grid-cols-4">
          {tabs.map(tab => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MobileTab)}
                className={`flex flex-col items-center justify-center py-3 px-1 transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <IconComponent className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
