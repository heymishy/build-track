/**
 * App Layout Component
 * Provides consistent layout with navigation for authenticated pages
 */

'use client'

import { AppNavigation } from '@/components/navigation/AppNavigation'

interface AppLayoutProps {
  children: React.ReactNode
  className?: string
}

export function AppLayout({ children, className = '' }: AppLayoutProps) {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <AppNavigation />
      {children}
    </div>
  )
}