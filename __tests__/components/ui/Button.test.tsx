/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-blue-600') // primary variant
  })

  it('renders different variants correctly', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>)
    let button = screen.getByRole('button')
    expect(button).toHaveClass('bg-gray-200')

    rerender(<Button variant="success">Success</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('bg-green-600')

    rerender(<Button variant="error">Error</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('bg-red-600')
  })

  it('renders different sizes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    let button = screen.getByRole('button')
    expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm')

    rerender(<Button size="lg">Large</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('px-6', 'py-3', 'text-lg')
  })

  it('shows loading state correctly', () => {
    render(<Button loading>Loading</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders with icon in correct position', () => {
    const TestIcon = () => <span data-testid="test-icon">🔥</span>
    
    const { rerender } = render(
      <Button icon={<TestIcon />} iconPosition="left">
        With Icon
      </Button>
    )
    
    const icon = screen.getByTestId('test-icon')
    const button = screen.getByRole('button')
    
    expect(icon).toBeInTheDocument()
    expect(icon.parentElement).toHaveClass('mr-2')

    rerender(
      <Button icon={<TestIcon />} iconPosition="right">
        With Icon
      </Button>
    )
    
    expect(icon.parentElement).toHaveClass('ml-2')
  })

  it('handles full width correctly', () => {
    render(<Button fullWidth>Full Width</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('w-full')
  })

  it('forwards click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Clickable</Button>)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50')
  })

  it('forwards ref correctly', () => {
    const ref = jest.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Test</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('forwards other HTML attributes', () => {
    render(<Button data-testid="test-button" title="Test Title">Test</Button>)
    const button = screen.getByTestId('test-button')
    expect(button).toHaveAttribute('title', 'Test Title')
  })
})