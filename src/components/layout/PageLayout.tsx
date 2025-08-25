'use client'

import { ReactNode } from 'react'
import { Navigation } from './Navigation'
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb'
import { tokens } from '@/lib/design-system'

interface PageLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  className?: string
  fullWidth?: boolean
}

export function PageLayout({
  children,
  title,
  subtitle,
  breadcrumbs,
  actions,
  className = '',
  fullWidth = false
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Page Header */}
        {(title || breadcrumbs || actions) && (
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className={`px-4 sm:px-6 lg:px-8 py-4 ${fullWidth ? '' : 'max-w-7xl mx-auto'}`}>
              {/* Breadcrumbs */}
              {breadcrumbs && breadcrumbs.length > 0 && (
                <div className="mb-4">
                  <Breadcrumb items={breadcrumbs} />
                </div>
              )}
              
              {/* Title and Actions */}
              {(title || actions) && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    {title && (
                      <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate">
                        {title}
                      </h1>
                    )}
                    {subtitle && (
                      <p className="mt-1 text-sm text-gray-500">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  {actions && (
                    <div className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0 flex space-x-3">
                      {actions}
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>
        )}

        {/* Page Content */}
        <main className={`py-6 ${className}`} data-testid="page-content">
          <div className={`px-4 sm:px-6 lg:px-8 ${fullWidth ? '' : 'max-w-7xl mx-auto'}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// Specialized layout components for common page types
interface DashboardLayoutProps extends Omit<PageLayoutProps, 'breadcrumbs'> {
  tab?: string
}

export function DashboardLayout({ tab, ...props }: DashboardLayoutProps) {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' }
  ]
  
  if (tab && tab !== 'overview') {
    breadcrumbs.push({
      label: tab.charAt(0).toUpperCase() + tab.slice(1),
      current: true
    })
  }

  return (
    <PageLayout
      {...props}
      breadcrumbs={breadcrumbs}
    />
  )
}

interface ProjectLayoutProps extends Omit<PageLayoutProps, 'breadcrumbs'> {
  projectName?: string
  projectId?: string
}

export function ProjectLayout({ projectName, projectId, ...props }: ProjectLayoutProps) {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects', href: '/dashboard?tab=projects' }
  ]
  
  if (projectName || projectId) {
    breadcrumbs.push({
      label: projectName || `Project ${projectId}`,
      current: true
    })
  }

  return (
    <PageLayout
      {...props}
      breadcrumbs={breadcrumbs}
    />
  )
}

interface SettingsLayoutProps extends Omit<PageLayoutProps, 'breadcrumbs'> {
  section?: string
}

export function SettingsLayout({ section, ...props }: SettingsLayoutProps) {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/settings' }
  ]
  
  if (section) {
    breadcrumbs.push({
      label: section.charAt(0).toUpperCase() + section.slice(1),
      current: true
    })
  }

  return (
    <PageLayout
      {...props}
      breadcrumbs={breadcrumbs}
    />
  )
}