'use client'

import dynamic from 'next/dynamic'
import { ComponentProps } from 'react'

// Dynamically import the PDF viewer to prevent SSR issues
const InvoicePdfViewer = dynamic(
  () => import('./InvoicePdfViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF viewer...</p>
        </div>
      </div>
    ),
  }
)

export type InvoicePdfViewerProps = ComponentProps<typeof InvoicePdfViewer>

export default function ClientOnlyPdfViewer(props: InvoicePdfViewerProps) {
  return <InvoicePdfViewer {...props} />
}