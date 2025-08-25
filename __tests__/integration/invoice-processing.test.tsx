/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InvoiceManagement } from '@/components/invoices/InvoiceManagement'
import { AuthProvider } from '@/contexts/AuthContext'
import type { Invoice, ParsedInvoice } from '@/types'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/dashboard',
    query: {},
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}))

// Mock PDF parser
const mockParsePDF = jest.fn()
jest.mock('@/lib/pdf-parser', () => ({
  parsePDFInvoice: mockParsePDF
}))

// Mock API service
const mockUploadInvoice = jest.fn()
const mockFetchInvoices = jest.fn()
const mockApproveInvoice = jest.fn()
const mockRejectInvoice = jest.fn()

jest.mock('@/services/data-service', () => ({
  dataService: {
    invoices: {
      getAll: mockFetchInvoices,
      uploadPDF: mockUploadInvoice,
      approve: mockApproveInvoice,
      reject: mockRejectInvoice,
      getById: jest.fn()
    }
  }
}))

const mockAuthContext = {
  user: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER' as const
  },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  error: null
}

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
)

describe('Invoice Processing Integration Flow', () => {
  const mockInvoices: Invoice[] = [
    {
      id: '1',
      invoiceNumber: 'INV-001',
      supplierName: 'ABC Supplies',
      totalAmount: 1250.00,
      currency: 'USD',
      status: 'PENDING',
      invoiceDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      projectId: 'proj-1',
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16')
    },
    {
      id: '2',
      invoiceNumber: 'INV-002',
      supplierName: 'XYZ Construction',
      totalAmount: 5000.00,
      currency: 'USD',
      status: 'APPROVED',
      invoiceDate: new Date('2024-01-20'),
      dueDate: new Date('2024-02-20'),
      projectId: 'proj-1',
      createdAt: new Date('2024-01-21'),
      updatedAt: new Date('2024-01-25')
    }
  ]

  const mockParsedInvoice: ParsedInvoice = {
    invoiceNumber: 'INV-003',
    supplierName: 'New Supplier Inc',
    totalAmount: 2500.00,
    currency: 'USD',
    invoiceDate: new Date('2024-02-01'),
    dueDate: new Date('2024-03-01'),
    lineItems: [
      {
        description: 'Construction Materials',
        quantity: 10,
        unitPrice: 150.00,
        totalPrice: 1500.00
      },
      {
        description: 'Labor',
        quantity: 20,
        unitPrice: 50.00,
        totalPrice: 1000.00
      }
    ],
    confidence: 0.95
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchInvoices.mockResolvedValue({
      success: true,
      data: mockInvoices,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        hasMore: false
      }
    })
  })

  describe('Invoice List Integration', () => {
    it('loads and displays invoices from API', async () => {
      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(mockFetchInvoices).toHaveBeenCalled()
      })

      expect(screen.getByText('INV-001')).toBeInTheDocument()
      expect(screen.getByText('ABC Supplies')).toBeInTheDocument()
      expect(screen.getByText('$1,250.00')).toBeInTheDocument()
      expect(screen.getByText('PENDING')).toBeInTheDocument()

      expect(screen.getByText('INV-002')).toBeInTheDocument()
      expect(screen.getByText('XYZ Construction')).toBeInTheDocument()
      expect(screen.getByText('$5,000.00')).toBeInTheDocument()
      expect(screen.getByText('APPROVED')).toBeInTheDocument()
    })

    it('handles empty invoice list', async () => {
      mockFetchInvoices.mockResolvedValue({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          hasMore: false
        }
      })

      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/no invoices found/i)).toBeInTheDocument()
      })
    })
  })

  describe('PDF Upload and Processing Flow', () => {
    it('uploads PDF and processes invoice data', async () => {
      // Mock file upload success
      mockUploadInvoice.mockResolvedValue({
        success: true,
        data: {
          invoices: [mockParsedInvoice],
          processed: 1
        }
      })

      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument()
      })

      // Create a mock PDF file
      const pdfFile = new File(['mock pdf content'], 'invoice.pdf', {
        type: 'application/pdf'
      })

      // Find file input and upload
      const fileInput = screen.getByLabelText(/upload invoice/i)
      fireEvent.change(fileInput, { target: { files: [pdfFile] } })

      await waitFor(() => {
        expect(mockUploadInvoice).toHaveBeenCalledWith(pdfFile, undefined)
      })

      // Verify processing success message
      expect(screen.getByText(/invoice uploaded successfully/i)).toBeInTheDocument()
    })

    it('handles PDF upload errors gracefully', async () => {
      mockUploadInvoice.mockResolvedValue({
        success: false,
        error: 'Invalid PDF format'
      })

      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument()
      })

      const pdfFile = new File(['invalid content'], 'invalid.pdf', {
        type: 'application/pdf'
      })

      const fileInput = screen.getByLabelText(/upload invoice/i)
      fireEvent.change(fileInput, { target: { files: [pdfFile] } })

      await waitFor(() => {
        expect(screen.getByText(/invalid pdf format/i)).toBeInTheDocument()
      })
    })

    it('shows processing progress during upload', async () => {
      // Mock delayed response
      mockUploadInvoice.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: { invoices: [mockParsedInvoice], processed: 1 }
          }), 100)
        )
      )

      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      const pdfFile = new File(['mock pdf'], 'test.pdf', {
        type: 'application/pdf'
      })

      const fileInput = screen.getByLabelText(/upload invoice/i)
      fireEvent.change(fileInput, { target: { files: [pdfFile] } })

      // Check for processing indicator
      expect(screen.getByText(/processing/i)).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Invoice Approval Flow', () => {
    it('approves pending invoice and updates status', async () => {
      mockApproveInvoice.mockResolvedValue({
        success: true,
        data: {
          ...mockInvoices[0],
          status: 'APPROVED'
        }
      })

      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument()
      })

      // Find and click approve button for pending invoice
      const approveButton = screen.getByText(/approve/i)
      fireEvent.click(approveButton)

      await waitFor(() => {
        expect(mockApproveInvoice).toHaveBeenCalledWith('1')
      })

      // Verify status update
      expect(screen.getByText('APPROVED')).toBeInTheDocument()
    })

    it('rejects invoice with confirmation', async () => {
      mockRejectInvoice.mockResolvedValue({
        success: true,
        data: {
          ...mockInvoices[0],
          status: 'REJECTED'
        }
      })

      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument()
      })

      const rejectButton = screen.getByText(/reject/i)
      fireEvent.click(rejectButton)

      // Add rejection reason
      const reasonInput = screen.getByPlaceholderText(/rejection reason/i)
      fireEvent.change(reasonInput, { 
        target: { value: 'Incorrect amount' } 
      })

      const confirmButton = screen.getByText(/confirm rejection/i)
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockRejectInvoice).toHaveBeenCalledWith('1', 'Incorrect amount')
      })

      expect(screen.getByText('REJECTED')).toBeInTheDocument()
    })
  })

  describe('Invoice Data Validation Flow', () => {
    it('validates parsed invoice data before approval', async () => {
      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument()
      })

      // Click on invoice to view details
      const invoiceRow = screen.getByText('INV-001')
      fireEvent.click(invoiceRow)

      // Verify detailed view shows parsed data
      expect(screen.getByText('ABC Supplies')).toBeInTheDocument()
      expect(screen.getByText('$1,250.00')).toBeInTheDocument()
      
      // Check for validation indicators
      expect(screen.getByTestId(/validation-status/i)).toBeInTheDocument()
    })

    it('allows editing of parsed data before approval', async () => {
      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument()
      })

      const editButton = screen.getByText(/edit/i)
      fireEvent.click(editButton)

      // Edit supplier name
      const supplierInput = screen.getByDisplayValue('ABC Supplies')
      fireEvent.change(supplierInput, { 
        target: { value: 'ABC Supplies Ltd' } 
      })

      // Edit amount
      const amountInput = screen.getByDisplayValue('1250.00')
      fireEvent.change(amountInput, { 
        target: { value: '1275.00' } 
      })

      const saveButton = screen.getByText(/save changes/i)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('ABC Supplies Ltd')).toBeInTheDocument()
        expect(screen.getByText('$1,275.00')).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filter Integration', () => {
    it('filters invoices by supplier name', async () => {
      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('ABC Supplies')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/search invoices/i)
      fireEvent.change(searchInput, { target: { value: 'ABC' } })

      await waitFor(() => {
        expect(mockFetchInvoices).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'ABC'
          })
        )
      })
    })

    it('filters invoices by status', async () => {
      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('PENDING')).toBeInTheDocument()
      })

      const statusFilter = screen.getByLabelText(/filter by status/i)
      fireEvent.change(statusFilter, { target: { value: 'PENDING' } })

      await waitFor(() => {
        expect(mockFetchInvoices).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ['PENDING']
          })
        )
      })
    })

    it('filters invoices by date range', async () => {
      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument()
      })

      const startDateInput = screen.getByLabelText(/start date/i)
      const endDateInput = screen.getByLabelText(/end date/i)

      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } })

      const applyFilterButton = screen.getByText(/apply filters/i)
      fireEvent.click(applyFilterButton)

      await waitFor(() => {
        expect(mockFetchInvoices).toHaveBeenCalledWith(
          expect.objectContaining({
            dateRange: {
              start: '2024-01-01',
              end: '2024-01-31'
            }
          })
        )
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('handles network errors during invoice operations', async () => {
      mockFetchInvoices.mockRejectedValue(new Error('Network error'))

      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/failed to load invoices/i)).toBeInTheDocument()
      })

      // Verify retry functionality
      const retryButton = screen.getByText(/retry/i)
      fireEvent.click(retryButton)

      expect(mockFetchInvoices).toHaveBeenCalledTimes(2)
    })

    it('handles approval failures with user feedback', async () => {
      mockApproveInvoice.mockResolvedValue({
        success: false,
        error: 'Insufficient permissions'
      })

      render(
        <TestWrapper>
          <InvoiceManagement />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument()
      })

      const approveButton = screen.getByText(/approve/i)
      fireEvent.click(approveButton)

      await waitFor(() => {
        expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument()
      })

      // Status should remain unchanged
      expect(screen.getByText('PENDING')).toBeInTheDocument()
    })
  })
})