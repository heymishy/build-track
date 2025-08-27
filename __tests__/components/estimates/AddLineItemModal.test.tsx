/**
 * Test Suite for AddLineItemModal Component
 * Testing line item creation, trade selection, and cost calculations
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddLineItemModal } from '@/components/estimates/AddLineItemModal'
import '@testing-library/jest-dom'

// Mock fetch for API calls
global.fetch = jest.fn()

const mockTrades = [
  {
    id: 'trade-1',
    name: 'Foundation',
    description: 'Foundation work',
    sortOrder: 1
  },
  {
    id: 'trade-2',
    name: 'Framing',
    description: 'Structural framing',
    sortOrder: 2
  }
]

const mockOnComplete = jest.fn()
const mockOnClose = jest.fn()

describe('AddLineItemModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
  })

  describe('Component Rendering', () => {
    it('should render modal when open', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getAllByText('Add Line Item')[0]).toBeInTheDocument()
      expect(screen.getByLabelText(/trade category/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(
        <AddLineItemModal
          isOpen={false}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should display all form fields', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/unit/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/material cost/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/labor cost/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/equipment cost/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/markup percentage/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/overhead percentage/i)).toBeInTheDocument()
    })
  })

  describe('Trade Selection', () => {
    it('should populate trade dropdown with available trades', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      const tradeSelect = screen.getByLabelText(/trade category/i)
      expect(screen.getByText('Foundation')).toBeInTheDocument()
      expect(screen.getByText('Framing')).toBeInTheDocument()
    })

    it('should show new trade creation option', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      const newTradeButton = screen.getByRole('button', { name: /new trade/i })
      fireEvent.click(newTradeButton)

      expect(screen.getByPlaceholderText(/enter new trade name/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should create new trade when submitted', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, trade: { id: 'trade-3', name: 'Electrical' } }),
      })

      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      const newTradeButton = screen.getByRole('button', { name: /new trade/i })
      fireEvent.click(newTradeButton)

      const tradeNameInput = screen.getByPlaceholderText(/enter new trade name/i)
      fireEvent.change(tradeNameInput, { target: { value: 'Electrical' } })

      const createButton = screen.getByRole('button', { name: /create/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/project-1/trades',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Electrical'),
          })
        )
      })
    })
  })

  describe('Form Validation', () => {
    it('should validate required fields', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      const submitButton = screen.getByRole('button', { name: /add line item/i })
      fireEvent.click(submitButton)

      expect(screen.getByText(/please enter a description/i)).toBeInTheDocument()
    })

    it('should validate quantity is greater than 0', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      const quantityInput = screen.getByLabelText(/quantity/i)
      fireEvent.change(quantityInput, { target: { value: '0' } })

      const submitButton = screen.getByRole('button', { name: /add line item/i })
      fireEvent.click(submitButton)

      expect(screen.getByText(/quantity must be greater than 0/i)).toBeInTheDocument()
    })

    it('should validate at least one cost field has value', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      const descriptionInput = screen.getByLabelText(/description/i)
      fireEvent.change(descriptionInput, { target: { value: 'Test item' } })

      const submitButton = screen.getByRole('button', { name: /add line item/i })
      fireEvent.click(submitButton)

      expect(
        screen.getByText(/at least one cost field.*must be greater than 0/i)
      ).toBeInTheDocument()
    })

    it('should require trade selection', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={[]} // No trades available
        />
      )

      const descriptionInput = screen.getByLabelText(/description/i)
      fireEvent.change(descriptionInput, { target: { value: 'Test item' } })

      const materialCostInput = screen.getByLabelText(/material cost/i)
      fireEvent.change(materialCostInput, { target: { value: '100' } })

      const submitButton = screen.getByRole('button', { name: /add line item/i })
      fireEvent.click(submitButton)

      expect(screen.getByText(/please select or create a trade/i)).toBeInTheDocument()
    })
  })

  describe('Cost Calculations', () => {
    it('should calculate total cost correctly', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      // Set base costs: 100 + 200 + 50 = 350
      fireEvent.change(screen.getByLabelText(/material cost/i), { target: { value: '100' } })
      fireEvent.change(screen.getByLabelText(/labor cost/i), { target: { value: '200' } })
      fireEvent.change(screen.getByLabelText(/equipment cost/i), { target: { value: '50' } })

      // Set markup: 15% of 350 = 52.5
      fireEvent.change(screen.getByLabelText(/markup percentage/i), { target: { value: '15' } })

      // Set overhead: 10% of 350 = 35
      fireEvent.change(screen.getByLabelText(/overhead percentage/i), { target: { value: '10' } })

      // Set quantity: 2
      fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '2' } })

      // Total should be: (350 + 52.5 + 35) * 2 = 875
      expect(screen.getByText('$875.00')).toBeInTheDocument()
    })

    it('should show unit cost when quantity > 1', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      fireEvent.change(screen.getByLabelText(/material cost/i), { target: { value: '100' } })
      fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '3' } })

      // Should show unit cost calculation
      expect(screen.getByText(/unit cost:/i)).toBeInTheDocument()
    })

    it('should update total when costs change', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      const materialCostInput = screen.getByLabelText(/material cost/i)
      
      fireEvent.change(materialCostInput, { target: { value: '100' } })
      expect(screen.getByText('$115.00')).toBeInTheDocument() // 100 + 15% markup + 10% overhead

      fireEvent.change(materialCostInput, { target: { value: '200' } })
      expect(screen.getByText('$250.00')).toBeInTheDocument() // 200 + 15% markup + 10% overhead
    })
  })

  describe('Form Submission', () => {
    it('should submit line item data successfully', async () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      // Fill in form data
      fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test Line Item' } })
      fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '2' } })
      fireEvent.change(screen.getByLabelText(/material cost/i), { target: { value: '150' } })
      fireEvent.change(screen.getByLabelText(/labor cost/i), { target: { value: '100' } })

      const submitButton = screen.getByRole('button', { name: /add line item/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/projects/project-1/trades/${mockTrades[0].id}/line-items`,
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('Test Line Item'),
          })
        )
      })

      expect(mockOnComplete).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should handle submission errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Submission failed'))

      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test Item' } })
      fireEvent.change(screen.getByLabelText(/material cost/i), { target: { value: '100' } })

      const submitButton = screen.getByRole('button', { name: /add line item/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to add line item/i)).toBeInTheDocument()
      })
    })

    it('should show loading state during submission', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      )

      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test Item' } })
      fireEvent.change(screen.getByLabelText(/material cost/i), { target: { value: '100' } })

      const submitButton = screen.getByRole('button', { name: /add line item/i })
      fireEvent.click(submitButton)

      expect(screen.getByText(/adding/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Unit Selection', () => {
    it('should provide unit options', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      const unitSelect = screen.getByLabelText(/unit/i)
      
      expect(screen.getByText('Each')).toBeInTheDocument()
      expect(screen.getByText('Meter')).toBeInTheDocument()
      expect(screen.getByText('Square Meter')).toBeInTheDocument()
      expect(screen.getByText('Cubic Meter')).toBeInTheDocument()
      expect(screen.getByText('Hour')).toBeInTheDocument()
    })

    it('should default to "Each" unit', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      const unitSelect = screen.getByLabelText(/unit/i)
      expect(unitSelect).toHaveValue('ea')
    })
  })

  describe('Modal Interaction', () => {
    it('should close modal when cancel is clicked', () => {
      render(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should reset form when modal opens', () => {
      const { rerender } = render(
        <AddLineItemModal
          isOpen={false}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      rerender(
        <AddLineItemModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
          projectId="project-1"
          trades={mockTrades}
        />
      )

      expect(screen.getByLabelText(/description/i)).toHaveValue('')
      expect(screen.getByLabelText(/quantity/i)).toHaveValue(1)
      expect(screen.getByLabelText(/material cost/i)).toHaveValue(0)
    })
  })
})