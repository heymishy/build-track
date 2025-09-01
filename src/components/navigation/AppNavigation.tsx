/**
 * App Navigation Component
 * Provides consistent navigation across the application
 */

'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import {
  HomeIcon,
  FolderIcon,
  DocumentTextIcon,
  DocumentIcon,
  CalculatorIcon,
  CogIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  CpuChipIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  current?: boolean
  adminOnly?: boolean
}

export function AppNavigation() {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const [llmProcessing, setLlmProcessing] = useState(false)
  const [processingDetails, setProcessingDetails] = useState<string>('')

  // Listen for global LLM processing events
  useEffect(() => {
    const handleLlmStart = (event: CustomEvent) => {
      console.log('LLM Processing Started:', event.detail)
      setLlmProcessing(true)
      setProcessingDetails(event.detail?.operation || 'Processing...')
    }

    const handleLlmEnd = () => {
      console.log('LLM Processing Ended')
      setLlmProcessing(false)
      setProcessingDetails('')
    }

    // Listen for custom events that can be dispatched from anywhere in the app
    window.addEventListener('llm-processing-start', handleLlmStart as EventListener)
    window.addEventListener('llm-processing-end', handleLlmEnd as EventListener)

    // For debugging - you can test the indicator by running this in console:
    // window.dispatchEvent(new CustomEvent('llm-processing-start', { detail: { operation: 'Test processing...' } }))
    console.log('LLM status event listeners attached')

    return () => {
      window.removeEventListener('llm-processing-start', handleLlmStart as EventListener)
      window.removeEventListener('llm-processing-end', handleLlmEnd as EventListener)
    }
  }, [])

  // Don't render navigation until auth is loaded to prevent inconsistent states
  if (isLoading) {
    return (
      <nav className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">BuildTrack</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <div className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
                <div className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
                <div className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      current: pathname === '/dashboard',
    },
    {
      name: 'Projects',
      href: '/projects',
      icon: FolderIcon,
      current: pathname?.startsWith('/projects'),
    },
    {
      name: 'Invoices',
      href: '/invoices',
      icon: DocumentTextIcon,
      current: pathname?.startsWith('/invoices'),
    },
    {
      name: 'Documents',
      href: '/documents',
      icon: DocumentIcon,
      current: pathname?.startsWith('/documents'),
    },
    {
      name: 'Estimates',
      href: '/estimates',
      icon: CalculatorIcon,
      current: pathname?.startsWith('/estimates'),
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: ChartBarIcon,
      current: pathname?.startsWith('/analytics'),
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: DocumentArrowDownIcon,
      current: pathname?.startsWith('/reports'),
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: CogIcon,
      current: pathname === '/settings',
    },
  ]

  // Add admin-only items
  if (user?.role === 'ADMIN') {
    navigation.push({
      name: 'Users',
      href: '/settings?tab=users',
      icon: UsersIcon,
      current:
        pathname === '/settings' &&
        typeof window !== 'undefined' &&
        window.location.search.includes('tab=users'),
      adminOnly: true,
    })
  }

  return (
    <nav className="bg-white shadow border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">BuildTrack</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map(item => {
                if (item.adminOnly && user?.role !== 'ADMIN') {
                  return null
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      item.current
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2 lg:space-x-4">
            {/* LLM Processing Indicator */}
            {llmProcessing && (
              <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                <CpuChipIcon className="h-4 w-4 text-blue-600 animate-pulse" />
                <span className="text-xs text-blue-700 hidden sm:inline">{processingDetails}</span>
                <ClockIcon className="h-3 w-3 text-blue-500 animate-spin sm:hidden" />
              </div>
            )}

            {user && (
              <div className="flex items-center space-x-2 lg:space-x-3">
                <div className="hidden sm:flex items-center space-x-2 lg:space-x-3">
                  <span
                    className="text-sm text-gray-700 truncate max-w-32 lg:max-w-48"
                    title={user.name}
                  >
                    {user.name}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-red-100 text-red-800'
                        : user.role === 'USER'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                {/* Mobile user display */}
                <div className="sm:hidden">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-red-100 text-red-800'
                        : user.role === 'USER'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                    title={`${user.name} (${user.role})`}
                  >
                    {user.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')}
                  </span>
                </div>

                <button
                  onClick={() => {
                    // Handle logout by redirecting to home with logout param
                    window.location.href = '/?logout=true'
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navigation.map(item => {
            if (item.adminOnly && user?.role !== 'ADMIN') {
              return null
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  item.current
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                <div className="flex items-center">
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
