'use client'

import { ReactNode } from 'react'
import { AppProvider } from '@/contexts/AppContext'
import { Toaster } from 'react-hot-toast'
import { PWAInstallBanner } from '@/components/mobile/PWAInstallBanner'

interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AppProvider>
      {children}
      <Toaster position="top-right" />
      <PWAInstallBanner position="bottom" />
    </AppProvider>
  )
}
