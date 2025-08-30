/**
 * Client-Only PDF Preview Wrapper
 * Prevents server-side rendering issues with PDF.js
 */

'use client'

import { useState, useEffect } from 'react'
import { PDFPreview } from './PDFPreview'

interface ClientOnlyPDFPreviewProps {
  pdfFile?: File
  pdfUrl?: string
  highlightPageNumber?: number
  className?: string
  height?: number
}

export const ClientOnlyPDFPreview: React.FC<ClientOnlyPDFPreviewProps> = props => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div
        className={`flex items-center justify-center ${props.className || ''}`}
        style={{ height: props.height || 600 }}
      >
        <div className="text-center">
          <div className="animate-pulse rounded-lg bg-gray-200 h-64 w-full mb-4"></div>
          <p className="text-gray-600">Loading PDF preview...</p>
        </div>
      </div>
    )
  }

  return <PDFPreview {...props} />
}
