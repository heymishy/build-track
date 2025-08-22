/**
 * Page Header Component with Navigation and Breadcrumbs
 */

'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  HomeIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  showBackButton?: boolean
  backTo?: string
  icon?: React.ComponentType<{ className?: string }>
  children?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  showBackButton = true,
  backTo = '/dashboard',
  icon: Icon,
  children
}: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backTo) {
      router.push(backTo)
    } else {
      router.back()
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <div>
                  <a href="/dashboard" className="text-gray-400 hover:text-gray-500">
                    <HomeIcon className="flex-shrink-0 h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Dashboard</span>
                  </a>
                </div>
              </li>
              {breadcrumbs.map((item, index) => (
                <li key={index}>
                  <div className="flex items-center">
                    <ChevronRightIcon className="flex-shrink-0 h-4 w-4 text-gray-400" aria-hidden="true" />
                    {item.href ? (
                      <a
                        href={item.href}
                        className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {item.label}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Header Content */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            {showBackButton && (
              <button
                onClick={handleBack}
                className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </button>
            )}

            {/* Title Section */}
            <div>
              <div className="flex items-center space-x-3">
                {Icon && <Icon className="h-8 w-8 text-gray-600" />}
                <h1 className="text-3xl font-bold text-gray-900">
                  {title}
                </h1>
              </div>
              {description && (
                <p className="mt-2 text-gray-600">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {children && (
            <div className="flex items-center space-x-3">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}