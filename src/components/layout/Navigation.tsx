'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  HomeIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { tokens } from '@/lib/design-system'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

interface NavigationItem {
  id: string
  name: string
  href: string
  icon: typeof HomeIcon
  badge?: string
  description?: string
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    description: 'Project overview and analytics',
  },
  {
    id: 'projects',
    name: 'Projects',
    href: '/dashboard?tab=projects',
    icon: BuildingStorefrontIcon,
    description: 'Manage construction projects',
  },
  {
    id: 'invoices',
    name: 'Invoices',
    href: '/dashboard?tab=invoices',
    icon: DocumentTextIcon,
    description: 'Process and track invoices',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    href: '/dashboard?tab=analytics',
    icon: ChartBarIcon,
    description: 'Reports and insights',
  },
]

const secondaryItems: NavigationItem[] = [
  {
    id: 'settings',
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
    description: 'Application preferences',
  },
]

interface NavigationProps {
  className?: string
}

export function Navigation({ className = '' }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.includes(href.split('?')[0])
  }

  const NavigationList = ({ items }: { items: NavigationItem[] }) => (
    <ul className="space-y-1">
      {items.map(item => {
        const active = isActive(item.href)
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`
                group flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  active
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
              data-testid={`nav-${item.id}`}
            >
              <item.icon
                className={`
                  mr-3 h-5 w-5 flex-shrink-0 transition-colors
                  ${active ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                `}
                aria-hidden="true"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.description && !active && (
                  <p className="text-xs text-gray-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.description}
                  </p>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      {/* Desktop Navigation */}
      <nav
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:bg-white lg:border-r lg:border-gray-200 ${className}`}
        aria-label="Desktop navigation"
        data-testid="desktop-navigation"
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-blue-700">BuildTrack</h1>
          </div>

          {/* Primary Navigation */}
          <div className="flex-1 flex flex-col pt-6 pb-4">
            <div className="px-3">
              <NavigationList items={navigationItems} />
            </div>

            {/* Secondary Navigation */}
            <div className="mt-8 px-3">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                System
              </h3>
              <div className="mt-2">
                <NavigationList items={secondaryItems} />
              </div>
            </div>
          </div>

          {/* User Section */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{user?.name || user?.email}</p>
                <p className="text-xs text-gray-500">{user?.role || 'User'}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="ml-2"
                data-testid="logout-button"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-white">
          <h1 className="text-xl font-bold text-blue-700">BuildTrack</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(true)}
            data-testid="mobile-menu-button"
          >
            <Bars3Icon className="h-6 w-6" />
          </Button>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-300 hover:text-white"
                  data-testid="mobile-menu-close"
                >
                  <XMarkIcon className="h-6 w-6" />
                </Button>
              </div>

              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <div className="flex-shrink-0 flex items-center px-4 mb-6">
                  <h1 className={`text-xl font-bold text-${tokens.colors.primary[700]}`}>
                    BuildTrack
                  </h1>
                </div>
                <div className="px-2">
                  <NavigationList items={navigationItems} />
                  <div className="mt-6">
                    <NavigationList items={secondaryItems} />
                  </div>
                </div>
              </div>

              {/* Mobile User Section */}
              <div className="flex-shrink-0 border-t border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{user?.name || user?.email}</p>
                    <p className="text-xs text-gray-500">{user?.role || 'User'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="ml-2"
                    data-testid="mobile-logout-button"
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
