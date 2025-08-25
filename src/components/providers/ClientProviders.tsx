'use client'

import { ReactNode } from 'react'
import { AppProvider } from '@/contexts/AppContext'
import { Toaster } from 'react-hot-toast'

interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AppProvider>
      {children}
      <Toaster position="top-right" />
    </AppProvider>
  )
}
