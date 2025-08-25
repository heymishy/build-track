'use client'

import Link from 'next/link'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { tokens } from '@/lib/design-system'

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  if (items.length === 0) return null

  return (
    <nav 
      className={`flex ${className}`} 
      aria-label="Breadcrumb"
      data-testid="breadcrumb"
    >
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isCurrent = item.current || isLast

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon 
                  className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" 
                  aria-hidden="true" 
                />
              )}
              
              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  data-testid={`breadcrumb-link-${index}`}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`text-sm font-medium ${
                    isCurrent 
                      ? 'text-gray-900' 
                      : 'text-blue-600'
                  }`}
                  aria-current={isCurrent ? 'page' : undefined}
                  data-testid={`breadcrumb-current-${index}`}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Utility function to generate breadcrumbs based on pathname
export function generateBreadcrumbs(pathname: string, customSegments?: Record<string, string>): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Always include Home/Dashboard
  breadcrumbs.push({
    label: 'Dashboard',
    href: '/dashboard'
  })

  // Process path segments
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    
    // Skip root dashboard segment as it's already added
    if (segment === 'dashboard') return
    
    // Use custom segment names if provided
    const label = customSegments?.[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    
    // Last segment is current page
    const isLast = index === segments.length - 1
    
    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
      current: isLast
    })
  })

  return breadcrumbs
}