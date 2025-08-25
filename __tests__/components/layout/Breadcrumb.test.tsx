/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { Breadcrumb, generateBreadcrumbs, BreadcrumbItem } from '@/components/layout/Breadcrumb'

describe('Breadcrumb', () => {
  const sampleItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects', href: '/dashboard?tab=projects' },
    { label: 'Project Alpha', current: true }
  ]

  describe('Rendering', () => {
    it('renders breadcrumb navigation correctly', () => {
      render(<Breadcrumb items={sampleItems} />)
      
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument()
      expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument()
    })

    it('renders all breadcrumb items', () => {
      render(<Breadcrumb items={sampleItems} />)
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
    })

    it('renders nothing when items array is empty', () => {
      render(<Breadcrumb items={[]} />)
      
      expect(screen.queryByTestId('breadcrumb')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<Breadcrumb items={sampleItems} className="custom-class" />)
      
      const breadcrumb = screen.getByTestId('breadcrumb')
      expect(breadcrumb).toHaveClass('custom-class')
    })
  })

  describe('Item Types', () => {
    it('renders linked items as links', () => {
      render(<Breadcrumb items={sampleItems} />)
      
      const dashboardLink = screen.getByTestId('breadcrumb-link-0')
      expect(dashboardLink).toHaveAttribute('href', '/dashboard')
      expect(dashboardLink).toHaveClass('text-blue-600')
    })

    it('renders current item as span with aria-current', () => {
      render(<Breadcrumb items={sampleItems} />)
      
      const currentItem = screen.getByTestId('breadcrumb-current-2')
      expect(currentItem).toHaveAttribute('aria-current', 'page')
      expect(currentItem).toHaveClass('text-gray-900')
    })

    it('treats last item as current by default', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Settings' }
      ]
      
      render(<Breadcrumb items={items} />)
      
      const lastItem = screen.getByTestId('breadcrumb-current-1')
      expect(lastItem).toHaveAttribute('aria-current', 'page')
    })
  })

  describe('Separators', () => {
    it('renders chevron separators between items', () => {
      render(<Breadcrumb items={sampleItems} />)
      
      // Check for chevron presence in DOM structure by finding SVG elements
      const svgElements = document.querySelectorAll('svg')
      // Should have 2 separators for 3 items
      expect(svgElements).toHaveLength(2)
      
      // Check for breadcrumb list structure
      const breadcrumbList = screen.getByRole('list')
      expect(breadcrumbList).toBeInTheDocument()
    })

    it('does not render separator before first item', () => {
      const singleItem: BreadcrumbItem[] = [
        { label: 'Dashboard', current: true }
      ]
      
      render(<Breadcrumb items={singleItem} />)
      
      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(1)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA structure', () => {
      render(<Breadcrumb items={sampleItems} />)
      
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByRole('list')).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')).toHaveLength(3)
    })

    it('marks current page with aria-current', () => {
      render(<Breadcrumb items={sampleItems} />)
      
      const currentPage = screen.getByText('Project Alpha')
      expect(currentPage).toHaveAttribute('aria-current', 'page')
    })

    it('provides proper link accessibility', () => {
      render(<Breadcrumb items={sampleItems} />)
      
      const dashboardLink = screen.getByRole('link', { name: 'Dashboard' })
      expect(dashboardLink).toBeInTheDocument()
      expect(dashboardLink).toHaveAttribute('href', '/dashboard')
    })
  })
})

describe('generateBreadcrumbs', () => {
  it('generates breadcrumbs for dashboard path', () => {
    const breadcrumbs = generateBreadcrumbs('/dashboard')
    
    expect(breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/dashboard' }
    ])
  })

  it('generates breadcrumbs for nested paths', () => {
    const breadcrumbs = generateBreadcrumbs('/dashboard/projects/123')
    
    expect(breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Projects', href: '/dashboard/projects', current: false },
      { label: '123', current: true, href: undefined }
    ])
  })

  it('uses custom segment names', () => {
    const customSegments = {
      'projects': 'My Projects',
      '123': 'Project Alpha'
    }
    
    const breadcrumbs = generateBreadcrumbs('/dashboard/projects/123', customSegments)
    
    expect(breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'My Projects', href: '/dashboard/projects', current: false },
      { label: 'Project Alpha', current: true, href: undefined }
    ])
  })

  it('handles root dashboard path correctly', () => {
    const breadcrumbs = generateBreadcrumbs('/dashboard')
    
    expect(breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/dashboard' }
    ])
  })

  it('capitalizes segment names automatically', () => {
    const breadcrumbs = generateBreadcrumbs('/dashboard/settings/profile')
    
    expect(breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Settings', href: '/dashboard/settings', current: false },
      { label: 'Profile', current: true, href: undefined }
    ])
  })

  it('handles empty paths', () => {
    const breadcrumbs = generateBreadcrumbs('/')
    
    expect(breadcrumbs).toEqual([
      { label: 'Dashboard', href: '/dashboard' }
    ])
  })
})