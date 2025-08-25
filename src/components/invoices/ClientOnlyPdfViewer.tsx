'use client'

import dynamic from 'next/dynamic'

// Define the props interface directly
interface InvoiceImageViewerProps {
  pdfFile: File | string
  className?: string
  pageNumber?: number
  onPageChange?: (pageNumber: number) => void
  highlightRegions?: Array<{
    page: number
    x: number
    y: number
    width: number
    height: number
    label: string
    confidence?: number
  }>
}

// Dynamically import the image viewer to prevent SSR issues
const InvoiceImageViewer = dynamic(
  () => import('./InvoiceImageViewer').then(mod => ({ default: mod.InvoiceImageViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice viewer...</p>
        </div>
      </div>
    ),
  }
)

export type InvoicePdfViewerProps = InvoiceImageViewerProps

export default function ClientOnlyPdfViewer(props: InvoiceImageViewerProps) {
  return <InvoiceImageViewer {...props} />
}
