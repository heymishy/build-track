/**
 * Tests for Enhanced Supplier Upload Component
 * Comprehensive test coverage for AI-enhanced upload functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-hot-toast'
import { EnhancedSupplierUpload } from '@/components/suppliers/EnhancedSupplierUpload'

// Mock dependencies
jest.mock('react-hot-toast')
const mockToast = toast as jest.Mocked<typeof toast>

// Mock fetch
global.fetch = jest.fn()

// Mock file for testing
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['mock content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const mockProjects = [
  { id: '1', name: 'Project Alpha', description: 'Test project 1' },
  { id: '2', name: 'Project Beta', description: 'Test project 2' },
  { id: '3', name: 'Project Gamma', description: 'Test project 3' },
]

const mockAIPreviewResponse = {
  success: true,
  preview: {
    parsedInvoice: {
      invoiceNumber: 'INV-001',
      invoiceDate: '2024-01-15',
      supplierName: 'Test Supplier Co',
      totalAmount: 5000,
      lineItems: [
        {
          description: 'Steel beams',
          quantity: 10,
          unitPrice: 100,
          totalPrice: 1000,
          category: 'MATERIAL',
        },
        {
          description: 'Construction labor',
          quantity: 40,
          unitPrice: 50,
          totalPrice: 2000,
          category: 'LABOR',
        },
      ],
    },
    confidence: 0.89,
    projectSuggestions: [
      {
        projectId: '1',
        projectName: 'Project Alpha',
        confidence: 0.92,
        reasoning: 'Invoice contains steel beams matching project requirements',
        estimatedMatches: 8,
      },
      {
        projectId: '2',
        projectName: 'Project Beta',
        confidence: 0.67,
        reasoning: 'Some construction materials match project scope',
        estimatedMatches: 3,
      },
    ],
    extractedLineItems: 2,
    totalAmount: 5000,
    processingTime: 2300,
  },
}

describe('EnhancedSupplierUpload', () => {
  const defaultProps = {
    supplierEmail: 'test@supplier.com',
    supplierName: 'Test Supplier Co',
    projects: mockProjects,
    onUploadComplete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockReset()
  })

  describe('Initial Render', () => {
    it('renders the upload component correctly', () => {
      render(<EnhancedSupplierUpload {...defaultProps} />)

      expect(screen.getByTestId('enhanced-supplier-upload')).toBeInTheDocument()
      expect(screen.getByText('AI-Enhanced Upload')).toBeInTheDocument()
      expect(screen.getByText('Drop your invoice here or click to browse')).toBeInTheDocument()
      expect(
        screen.getByText(
          'AI will instantly analyze your invoice and suggest the best project match'
        )
      ).toBeInTheDocument()
    })

    it('displays the drag and drop zone', () => {
      render(<EnhancedSupplierUpload {...defaultProps} />)

      const dropZone = screen.getByTestId('file-drop-zone')
      expect(dropZone).toBeInTheDocument()
      expect(dropZone).toHaveClass('border-gray-300')
    })

    it('shows file input and project selector', () => {
      render(<EnhancedSupplierUpload {...defaultProps} />)

      expect(screen.getByTestId('file-input')).toBeInTheDocument()
      expect(screen.getByTestId('project-selector')).toBeInTheDocument()
      expect(screen.getByTestId('notes-textarea')).toBeInTheDocument()
    })

    it('displays all available projects in selector', () => {
      render(<EnhancedSupplierUpload {...defaultProps} />)

      const selector = screen.getByTestId('project-selector')
      expect(selector).toBeInTheDocument()

      mockProjects.forEach(project => {
        expect(screen.getByRole('option', { name: project.name })).toBeInTheDocument()
      })
    })
  })

  describe('File Selection', () => {
    it('accepts valid PDF file selection', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('invoice.pdf', 5000000, 'application/pdf') // 5MB

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIPreviewResponse),
      })

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        expect(screen.getByText('invoice.pdf')).toBeInTheDocument()
        expect(screen.getByText('4.77 MB • PDF')).toBeInTheDocument()
      })
    })

    it('rejects non-PDF files', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('document.txt', 1000, 'text/plain')

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      expect(mockToast.error).toHaveBeenCalledWith('Please select a PDF file')
    })

    it('rejects files over 10MB limit', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('large-invoice.pdf', 15000000, 'application/pdf') // 15MB

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      expect(mockToast.error).toHaveBeenCalledWith('File size must be less than 10MB')
    })
  })

  describe('Drag and Drop', () => {
    it('handles drag enter and changes styling', () => {
      render(<EnhancedSupplierUpload {...defaultProps} />)

      const dropZone = screen.getByTestId('file-drop-zone')

      fireEvent.dragEnter(dropZone)
      expect(dropZone).toHaveClass('border-blue-400', 'bg-blue-50')
    })

    it('handles drag leave and resets styling', () => {
      render(<EnhancedSupplierUpload {...defaultProps} />)

      const dropZone = screen.getByTestId('file-drop-zone')

      fireEvent.dragEnter(dropZone)
      fireEvent.dragLeave(dropZone)
      expect(dropZone).toHaveClass('border-gray-300')
      expect(dropZone).not.toHaveClass('border-blue-400')
    })

    it('handles file drop successfully', async () => {
      const mockFile = createMockFile('dropped-invoice.pdf', 3000000, 'application/pdf')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIPreviewResponse),
      })

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const dropZone = screen.getByTestId('file-drop-zone')

      const dropEvent = new Event('drop', { bubbles: true }) as any
      dropEvent.dataTransfer = {
        files: [mockFile],
      }

      await act(async () => {
        fireEvent(dropZone, dropEvent)
      })

      await waitFor(() => {
        expect(screen.getByText('dropped-invoice.pdf')).toBeInTheDocument()
      })
    })
  })

  describe('AI Processing', () => {
    it('shows AI processing indicator', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('invoice.pdf', 3000000, 'application/pdf')

      // Mock delayed response to see loading state
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve(mockAIPreviewResponse),
                }),
              100
            )
          )
      )

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      // Should show processing indicator
      expect(screen.getByText('AI Processing Your Invoice')).toBeInTheDocument()
      expect(
        screen.getByText('Extracting data, analyzing content, and finding project matches...')
      ).toBeInTheDocument()
    })

    it('displays AI preview results correctly', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('invoice.pdf', 3000000, 'application/pdf')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIPreviewResponse),
      })

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        // Check AI preview panel appears
        expect(screen.getByText('AI Analysis Results')).toBeInTheDocument()
        expect(screen.getByText('Processed in 2.3s')).toBeInTheDocument()

        // Check extracted data
        expect(screen.getByText('Line Items:')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('Total Amount:')).toBeInTheDocument()
        expect(screen.getByText('$5000.00')).toBeInTheDocument()

        // Check confidence score
        expect(screen.getByText('89%')).toBeInTheDocument()

        // Check project suggestions
        expect(screen.getByText('AI Project Recommendations')).toBeInTheDocument()
        expect(screen.getByText('Project Alpha')).toBeInTheDocument()
        expect(screen.getByText('92%')).toBeInTheDocument()
        expect(screen.getByText('🏆 AI Recommended')).toBeInTheDocument()
      })
    })

    it('auto-selects high-confidence project suggestions', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('invoice.pdf', 3000000, 'application/pdf')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIPreviewResponse),
      })

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        const projectSelector = screen.getByTestId('project-selector') as HTMLSelectElement
        expect(projectSelector.value).toBe('1') // Should auto-select Project Alpha
        expect(mockToast.success).toHaveBeenCalledWith(
          expect.stringContaining('AI suggests "Project Alpha" with 92% confidence')
        )
      })
    })

    it('handles AI processing errors gracefully', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('invoice.pdf', 3000000, 'application/pdf')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'AI service temporarily unavailable',
          }),
      })

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('AI service temporarily unavailable')
      })
    })

    it('shows fallback message when AI is unavailable', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('invoice.pdf', 3000000, 'application/pdf')

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'AI processing unavailable - you can still upload manually'
        )
      })
    })
  })

  describe('Project Selection', () => {
    it('allows manual project selection', async () => {
      const user = userEvent.setup()
      render(<EnhancedSupplierUpload {...defaultProps} />)

      const projectSelector = screen.getByTestId('project-selector')
      await user.selectOptions(projectSelector, '2')

      expect((projectSelector as HTMLSelectElement).value).toBe('2')
    })

    it('allows clicking on AI project suggestions', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('invoice.pdf', 3000000, 'application/pdf')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIPreviewResponse),
      })

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        const suggestion = screen.getByTestId('project-suggestion-1')
        expect(suggestion).toBeInTheDocument()
      })

      // Click on second suggestion
      const secondSuggestion = screen.getByTestId('project-suggestion-1')
      await user.click(secondSuggestion)

      const projectSelector = screen.getByTestId('project-selector') as HTMLSelectElement
      expect(projectSelector.value).toBe('2')
    })
  })

  describe('Form Submission', () => {
    it('uploads file successfully with AI data', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('invoice.pdf', 3000000, 'application/pdf')

      // Mock AI preview response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIPreviewResponse),
      })

      // Mock upload response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            uploadId: 'upload-123',
          }),
      })

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        expect(screen.getByText('AI Analysis Results')).toBeInTheDocument()
      })

      // Add notes
      const notesTextarea = screen.getByTestId('notes-textarea')
      await user.type(notesTextarea, 'Test upload with AI enhancement')

      // Submit upload
      const uploadButton = screen.getByTestId('upload-button')
      await user.click(uploadButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/portal/upload',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        )
        expect(mockToast.success).toHaveBeenCalledWith(
          'Invoice uploaded successfully with AI processing!'
        )
        expect(defaultProps.onUploadComplete).toHaveBeenCalledWith(
          expect.objectContaining({ uploadId: 'upload-123' })
        )
      })
    })

    it('prevents submission without file', async () => {
      const user = userEvent.setup()
      render(<EnhancedSupplierUpload {...defaultProps} />)

      const uploadButton = screen.getByTestId('upload-button')
      expect(uploadButton).toBeDisabled()

      await user.click(uploadButton)

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('shows loading state during upload', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('invoice.pdf', 3000000, 'application/pdf')

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAIPreviewResponse),
        })
        .mockImplementationOnce(
          () =>
            new Promise(resolve =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true }),
                  }),
                100
              )
            )
        )

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        expect(screen.getByText('AI Analysis Results')).toBeInTheDocument()
      })

      const uploadButton = screen.getByTestId('upload-button')
      await user.click(uploadButton)

      expect(screen.getByText('Uploading with AI Processing...')).toBeInTheDocument()
      expect(uploadButton).toBeDisabled()
    })

    it('handles upload errors gracefully', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('invoice.pdf', 3000000, 'application/pdf')

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAIPreviewResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: false,
              error: 'Upload failed',
            }),
        })

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        expect(screen.getByText('AI Analysis Results')).toBeInTheDocument()
      })

      const uploadButton = screen.getByTestId('upload-button')
      await user.click(uploadButton)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Upload failed')
      })
    })
  })

  describe('Form Reset', () => {
    it('resets form after successful upload', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('invoice.pdf', 3000000, 'application/pdf')

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAIPreviewResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        expect(screen.getByText('AI Analysis Results')).toBeInTheDocument()
      })

      // Fill form
      const notesTextarea = screen.getByTestId('notes-textarea')
      await user.type(notesTextarea, 'Test notes')

      const uploadButton = screen.getByTestId('upload-button')
      await user.click(uploadButton)

      await waitFor(() => {
        // Form should be reset
        expect(screen.queryByText('AI Analysis Results')).not.toBeInTheDocument()
        expect((notesTextarea as HTMLTextAreaElement).value).toBe('')
        expect((screen.getByTestId('project-selector') as HTMLSelectElement).value).toBe('')
        expect(screen.getByText('Drop your invoice here or click to browse')).toBeInTheDocument()
      })
    })

    it('allows changing file after selection', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('invoice.pdf', 3000000, 'application/pdf')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIPreviewResponse),
      })

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        expect(screen.getByText('invoice.pdf')).toBeInTheDocument()
      })

      // Click change file button
      const changeButton = screen.getByText('Change File')
      await user.click(changeButton)

      // Should reset to initial state
      expect(screen.queryByText('invoice.pdf')).not.toBeInTheDocument()
      expect(screen.queryByText('AI Analysis Results')).not.toBeInTheDocument()
      expect(screen.getByText('Drop your invoice here or click to browse')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper labels and ARIA attributes', () => {
      render(<EnhancedSupplierUpload {...defaultProps} />)

      // Check form labels
      expect(screen.getByLabelText(/project assignment/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/additional notes/i)).toBeInTheDocument()

      // Check file input accessibility
      const fileInput = screen.getByTestId('file-input')
      expect(fileInput).toHaveAttribute('accept', '.pdf')
    })

    it('provides proper feedback for screen readers', async () => {
      const user = userEvent.setup()
      const mockFile = createMockFile('invoice.pdf', 3000000, 'application/pdf')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAIPreviewResponse),
      })

      render(<EnhancedSupplierUpload {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        // Success state should be announced
        expect(screen.getByText('invoice.pdf')).toBeInTheDocument()
        expect(screen.getByText('4.77 MB • PDF')).toBeInTheDocument()
      })
    })
  })
})
