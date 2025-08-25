/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabNavigation, TabPanel, Tabs, TabItem } from '@/components/layout/TabNavigation'
import { HomeIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline'

describe('TabNavigation', () => {
  const sampleTabs: TabItem[] = [
    { id: 'overview', name: 'Overview', icon: <HomeIcon className="h-4 w-4" /> },
    { id: 'projects', name: 'Projects', icon: <BuildingStorefrontIcon className="h-4 w-4" /> },
    { id: 'invoices', name: 'Invoices', badge: '5' },
    { id: 'disabled', name: 'Disabled', disabled: true },
  ]

  const mockOnTabChange = jest.fn()

  beforeEach(() => {
    mockOnTabChange.mockClear()
  })

  describe('Rendering', () => {
    it('renders tab navigation correctly', () => {
      render(<TabNavigation tabs={sampleTabs} activeTab="overview" onTabChange={mockOnTabChange} />)

      expect(screen.getByTestId('tab-navigation')).toBeInTheDocument()
      expect(screen.getByLabelText('Tab navigation')).toBeInTheDocument()
    })

    it('renders all tab buttons', () => {
      render(<TabNavigation tabs={sampleTabs} activeTab="overview" onTabChange={mockOnTabChange} />)

      expect(screen.getByTestId('tab-overview')).toBeInTheDocument()
      expect(screen.getByTestId('tab-projects')).toBeInTheDocument()
      expect(screen.getByTestId('tab-invoices')).toBeInTheDocument()
      expect(screen.getByTestId('tab-disabled')).toBeInTheDocument()
    })

    it('displays tab icons when provided', () => {
      render(<TabNavigation tabs={sampleTabs} activeTab="overview" onTabChange={mockOnTabChange} />)

      // Icons should be present (can't easily test SVG content)
      const overviewTab = screen.getByTestId('tab-overview')
      expect(overviewTab).toContainHTML('svg')
    })

    it('displays badges when provided', () => {
      render(<TabNavigation tabs={sampleTabs} activeTab="overview" onTabChange={mockOnTabChange} />)

      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  describe('Active State', () => {
    it('highlights active tab', () => {
      render(<TabNavigation tabs={sampleTabs} activeTab="projects" onTabChange={mockOnTabChange} />)

      const activeTab = screen.getByTestId('tab-projects')
      expect(activeTab).toHaveAttribute('aria-selected', 'true')
      expect(activeTab).toHaveClass('text-blue-600')
    })

    it('does not highlight inactive tabs', () => {
      render(<TabNavigation tabs={sampleTabs} activeTab="projects" onTabChange={mockOnTabChange} />)

      const inactiveTab = screen.getByTestId('tab-overview')
      expect(inactiveTab).toHaveAttribute('aria-selected', 'false')
      expect(inactiveTab).not.toHaveClass('text-blue-600')
    })
  })

  describe('Interaction', () => {
    it('calls onTabChange when tab is clicked', () => {
      render(<TabNavigation tabs={sampleTabs} activeTab="overview" onTabChange={mockOnTabChange} />)

      const projectsTab = screen.getByTestId('tab-projects')
      fireEvent.click(projectsTab)

      expect(mockOnTabChange).toHaveBeenCalledWith('projects')
    })

    it('does not call onTabChange for disabled tabs', () => {
      render(<TabNavigation tabs={sampleTabs} activeTab="overview" onTabChange={mockOnTabChange} />)

      const disabledTab = screen.getByTestId('tab-disabled')
      fireEvent.click(disabledTab)

      expect(mockOnTabChange).not.toHaveBeenCalled()
    })

    it('handles keyboard navigation', () => {
      render(<TabNavigation tabs={sampleTabs} activeTab="overview" onTabChange={mockOnTabChange} />)

      const overviewTab = screen.getByTestId('tab-overview')
      overviewTab.focus()

      expect(overviewTab).toHaveFocus()
    })
  })

  describe('Disabled State', () => {
    it('marks disabled tabs correctly', () => {
      render(<TabNavigation tabs={sampleTabs} activeTab="overview" onTabChange={mockOnTabChange} />)

      const disabledTab = screen.getByTestId('tab-disabled')
      expect(disabledTab).toBeDisabled()
      expect(disabledTab).toHaveAttribute('aria-disabled', 'true')
      expect(disabledTab).toHaveClass('opacity-50')
      expect(disabledTab).toHaveClass('cursor-not-allowed')
    })
  })

  describe('Variants', () => {
    it('applies underline variant styles', () => {
      render(
        <TabNavigation
          tabs={sampleTabs}
          activeTab="overview"
          onTabChange={mockOnTabChange}
          variant="underline"
        />
      )

      const container = screen.getByTestId('tab-navigation')
      expect(container).toHaveClass('border-b')
    })

    it('applies pills variant styles', () => {
      render(
        <TabNavigation
          tabs={sampleTabs}
          activeTab="overview"
          onTabChange={mockOnTabChange}
          variant="pills"
        />
      )

      const container = screen.getByTestId('tab-navigation')
      expect(container).toHaveClass('bg-gray-100')
      expect(container).toHaveClass('rounded-lg')
    })
  })

  describe('Sizes', () => {
    it('applies small size styles', () => {
      render(
        <TabNavigation
          tabs={sampleTabs}
          activeTab="overview"
          onTabChange={mockOnTabChange}
          size="sm"
        />
      )

      const tab = screen.getByTestId('tab-overview')
      expect(tab).toHaveClass('text-sm')
      expect(tab).toHaveClass('py-2')
    })

    it('applies large size styles', () => {
      render(
        <TabNavigation
          tabs={sampleTabs}
          activeTab="overview"
          onTabChange={mockOnTabChange}
          size="lg"
        />
      )

      const tab = screen.getByTestId('tab-overview')
      expect(tab).toHaveClass('text-base')
      expect(tab).toHaveClass('py-4')
    })
  })
})

describe('TabPanel', () => {
  it('renders panel content when active', () => {
    render(
      <TabPanel tabId="overview" activeTab="overview">
        <div>Panel Content</div>
      </TabPanel>
    )

    const panel = screen.getByTestId('tab-panel-overview')
    expect(panel).not.toHaveAttribute('hidden')
    expect(screen.getByText('Panel Content')).toBeInTheDocument()
  })

  it('hides panel content when inactive', () => {
    render(
      <TabPanel tabId="overview" activeTab="projects">
        <div>Panel Content</div>
      </TabPanel>
    )

    const panel = screen.getByTestId('tab-panel-overview')
    expect(panel).toHaveAttribute('hidden')
  })

  it('supports lazy loading', () => {
    render(
      <TabPanel tabId="overview" activeTab="projects" lazy>
        <div>Panel Content</div>
      </TabPanel>
    )

    // Panel should not be rendered at all when lazy and inactive
    expect(screen.queryByTestId('tab-panel-overview')).not.toBeInTheDocument()
  })

  it('has proper ARIA attributes', () => {
    render(
      <TabPanel tabId="overview" activeTab="overview">
        <div>Panel Content</div>
      </TabPanel>
    )

    const panel = screen.getByTestId('tab-panel-overview')
    expect(panel).toHaveAttribute('role', 'tabpanel')
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-overview')
  })
})

describe('Tabs (Complete Component)', () => {
  const tabsForComplete: TabItem[] = [
    { id: 'overview', name: 'Overview' },
    { id: 'projects', name: 'Projects' },
  ]

  it('renders tabs with panels', () => {
    render(
      <Tabs tabs={tabsForComplete} defaultTab="overview">
        <TabPanel tabId="overview" activeTab="overview">
          <div>Overview Content</div>
        </TabPanel>
        <TabPanel tabId="projects" activeTab="overview">
          <div>Projects Content</div>
        </TabPanel>
      </Tabs>
    )

    expect(screen.getByTestId('tabs-container')).toBeInTheDocument()
    expect(screen.getByTestId('tab-navigation')).toBeInTheDocument()
    expect(screen.getByText('Overview Content')).toBeInTheDocument()
  })

  it('calls external onTabChange handler', () => {
    const mockExternalHandler = jest.fn()

    render(
      <Tabs tabs={tabsForComplete} defaultTab="overview" onTabChange={mockExternalHandler}>
        <div>Content</div>
      </Tabs>
    )

    const projectsTab = screen.getByTestId('tab-projects')
    fireEvent.click(projectsTab)

    expect(mockExternalHandler).toHaveBeenCalledWith('projects')
  })
})
