/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '@/components/ui/Input'

describe('Input Component', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass('border-gray-300')
  })

  it('renders label when provided', () => {
    render(<Input label="Test Label" />)
    const label = screen.getByText('Test Label')
    const input = screen.getByLabelText('Test Label')
    expect(label).toBeInTheDocument()
    expect(input).toBeInTheDocument()
  })

  it('shows error state correctly', () => {
    render(<Input label="Test" error="This field is required" />)
    const input = screen.getByLabelText('Test')
    const errorMessage = screen.getByText('This field is required')

    expect(input).toHaveClass('border-red-300')
    expect(errorMessage).toBeInTheDocument()
    expect(errorMessage).toHaveClass('text-red-600')
  })

  it('shows success state correctly', () => {
    render(<Input state="success" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-green-300')
  })

  it('shows helper text when provided', () => {
    render(<Input helperText="This is a helpful hint" />)
    const helperText = screen.getByText('This is a helpful hint')
    expect(helperText).toBeInTheDocument()
    expect(helperText).toHaveClass('text-gray-500')
  })

  it('renders left icon correctly', () => {
    const LeftIcon = () => <span data-testid="left-icon">📧</span>
    render(<Input leftIcon={<LeftIcon />} />)

    const icon = screen.getByTestId('left-icon')
    const input = screen.getByRole('textbox')

    expect(icon).toBeInTheDocument()
    expect(input).toHaveClass('pl-10')
  })

  it('renders right icon correctly', () => {
    const RightIcon = () => <span data-testid="right-icon">🔍</span>
    render(<Input rightIcon={<RightIcon />} />)

    const icon = screen.getByTestId('right-icon')
    const input = screen.getByRole('textbox')

    expect(icon).toBeInTheDocument()
    expect(input).toHaveClass('pr-10')
  })

  it('handles fullWidth correctly', () => {
    const { container } = render(<Input fullWidth />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('w-full')
  })

  it('handles input events correctly', () => {
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test input' } })

    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('forwards ref correctly', () => {
    const ref = jest.createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('generates unique IDs when not provided', () => {
    render(
      <div>
        <Input label="First Input" />
        <Input label="Second Input" />
      </div>
    )

    const firstInput = screen.getByLabelText('First Input')
    const secondInput = screen.getByLabelText('Second Input')

    expect(firstInput.id).not.toBe(secondInput.id)
    expect(firstInput.id).toMatch(/^input-/)
    expect(secondInput.id).toMatch(/^input-/)
  })

  it('uses provided ID when given', () => {
    render(<Input id="custom-id" label="Custom ID Input" />)
    const input = screen.getByLabelText('Custom ID Input')
    expect(input).toHaveAttribute('id', 'custom-id')
  })

  it('prioritizes error over helper text', () => {
    render(<Input helperText="Helper text" error="Error message" />)

    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Input className="custom-input" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-input')
  })
})
