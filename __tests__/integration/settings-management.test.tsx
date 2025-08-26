/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SettingsPage from '@/app/settings/page'
import { AuthProvider } from '@/contexts/AuthContext'
import { SettingsManager } from '@/lib/settings'
import type { AppSettings } from '@/types'
import { Currency } from '@/types'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/settings',
    query: {},
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/settings',
}))

// Mock settings service
const mockUpdateSettings = jest.fn()
const mockGetSettings = jest.fn()

jest.mock('@/lib/settings', () => {
  const originalModule = jest.requireActual('@/lib/settings')
  return {
    ...originalModule,
    SettingsManager: jest.fn().mockImplementation(() => ({
      getSettings: mockGetSettings,
      updateUserSettings: mockUpdateSettings,
      updateProjectSettings: mockUpdateSettings,
      updateSystemSettings: mockUpdateSettings,
      resetToDefaults: jest.fn(),
    })),
    useSettings: () => ({
      settings: mockDefaultSettings,
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null,
    }),
  }
})

const mockDefaultSettings: AppSettings = {
  user: {
    theme: 'system',
    language: 'en',
    currency: Currency.USD,
    dateFormat: 'MM/DD/YYYY',
    timezone: 'America/New_York',
    notifications: {
      email: true,
      browser: true,
      invoiceApproval: true,
      milestoneDeadlines: true,
      budgetAlerts: true,
    },
    dashboard: {
      defaultView: 'projects',
      showRecentProjects: true,
      projectsPerPage: 10,
      compactMode: false,
    },
  },
  project: {
    defaultMarkupPercent: 15,
    defaultOverheadPercent: 10,
    defaultCurrency: 'USD',
    requireApprovalForInvoices: true,
    autoMatchInvoices: true,
    enableBudgetAlerts: true,
    budgetAlertThreshold: 90,
  },
  system: {
    maxFileSize: 10485760,
    supportedFileTypes: ['.pdf', '.png', '.jpg'],
    sessionTimeout: 3600,
    enableAnalytics: false,
    backupFrequency: 'daily',
  },
}

const mockAuthContext = {
  user: {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER' as const,
  },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  error: null,
}

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext,
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('Settings Management Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSettings.mockResolvedValue(mockDefaultSettings)
    mockUpdateSettings.mockResolvedValue({ success: true })
  })

  describe('Settings Loading and Display', () => {
    it('loads and displays user settings', async () => {
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/user preferences/i)).toBeInTheDocument()
      })

      // Check theme setting
      expect(screen.getByDisplayValue('system')).toBeInTheDocument()

      // Check language setting
      expect(screen.getByDisplayValue('en')).toBeInTheDocument()

      // Check currency setting
      expect(screen.getByDisplayValue('USD')).toBeInTheDocument()

      // Check notification settings
      expect(screen.getByLabelText(/email notifications/i)).toBeChecked()
      expect(screen.getByLabelText(/browser notifications/i)).toBeChecked()
    })

    it('loads and displays project settings', async () => {
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      // Navigate to project settings tab
      const projectTab = screen.getByText(/project settings/i)
      fireEvent.click(projectTab)

      await waitFor(() => {
        expect(screen.getByDisplayValue('15')).toBeInTheDocument() // markup
        expect(screen.getByDisplayValue('10')).toBeInTheDocument() // overhead
        expect(screen.getByLabelText(/require approval for invoices/i)).toBeChecked()
        expect(screen.getByLabelText(/auto-match invoices/i)).toBeChecked()
      })
    })

    it('loads and displays system settings for admin users', async () => {
      // Mock admin user
      const adminAuthContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'ADMIN' as const },
      }

      jest.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue(adminAuthContext)

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      const systemTab = screen.getByText(/system settings/i)
      fireEvent.click(systemTab)

      await waitFor(() => {
        expect(screen.getByDisplayValue('10485760')).toBeInTheDocument() // max file size
        expect(screen.getByDisplayValue('3600')).toBeInTheDocument() // session timeout
        expect(screen.getByLabelText(/enable analytics/i)).not.toBeChecked()
      })
    })
  })

  describe('User Settings Updates', () => {
    it('updates theme setting and persists change', async () => {
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('system')).toBeInTheDocument()
      })

      // Change theme to dark
      const themeSelect = screen.getByLabelText(/theme/i)
      fireEvent.change(themeSelect, { target: { value: 'dark' } })

      // Save changes
      const saveButton = screen.getByText(/save changes/i)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              theme: 'dark',
            }),
          })
        )
      })

      expect(screen.getByText(/settings updated successfully/i)).toBeInTheDocument()
    })

    it('updates notification preferences', async () => {
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument()
      })

      // Toggle email notifications
      const emailToggle = screen.getByLabelText(/email notifications/i)
      fireEvent.click(emailToggle)

      // Toggle budget alerts
      const budgetToggle = screen.getByLabelText(/budget alerts/i)
      fireEvent.click(budgetToggle)

      const saveButton = screen.getByText(/save changes/i)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              notifications: expect.objectContaining({
                email: false,
                budgetAlerts: false,
              }),
            }),
          })
        )
      })
    })

    it('updates dashboard preferences', async () => {
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('projects')).toBeInTheDocument()
      })

      // Change default view
      const defaultViewSelect = screen.getByLabelText(/default view/i)
      fireEvent.change(defaultViewSelect, { target: { value: 'analytics' } })

      // Change projects per page
      const projectsPerPageInput = screen.getByLabelText(/projects per page/i)
      fireEvent.change(projectsPerPageInput, { target: { value: '20' } })

      // Toggle compact mode
      const compactModeToggle = screen.getByLabelText(/compact mode/i)
      fireEvent.click(compactModeToggle)

      const saveButton = screen.getByText(/save changes/i)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              dashboard: expect.objectContaining({
                defaultView: 'analytics',
                projectsPerPage: 20,
                compactMode: true,
              }),
            }),
          })
        )
      })
    })
  })

  describe('Project Settings Updates', () => {
    it('updates default markup and overhead percentages', async () => {
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      const projectTab = screen.getByText(/project settings/i)
      fireEvent.click(projectTab)

      await waitFor(() => {
        expect(screen.getByDisplayValue('15')).toBeInTheDocument()
      })

      // Update markup percentage
      const markupInput = screen.getByLabelText(/markup percentage/i)
      fireEvent.change(markupInput, { target: { value: '18' } })

      // Update overhead percentage
      const overheadInput = screen.getByLabelText(/overhead percentage/i)
      fireEvent.change(overheadInput, { target: { value: '12' } })

      const saveButton = screen.getByText(/save changes/i)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            project: expect.objectContaining({
              defaultMarkupPercent: 18,
              defaultOverheadPercent: 12,
            }),
          })
        )
      })
    })

    it('updates invoice processing settings', async () => {
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      const projectTab = screen.getByText(/project settings/i)
      fireEvent.click(projectTab)

      await waitFor(() => {
        expect(screen.getByLabelText(/require approval for invoices/i)).toBeInTheDocument()
      })

      // Toggle approval requirement
      const approvalToggle = screen.getByLabelText(/require approval for invoices/i)
      fireEvent.click(approvalToggle)

      // Toggle auto-matching
      const autoMatchToggle = screen.getByLabelText(/auto-match invoices/i)
      fireEvent.click(autoMatchToggle)

      // Update budget alert threshold
      const thresholdInput = screen.getByLabelText(/budget alert threshold/i)
      fireEvent.change(thresholdInput, { target: { value: '85' } })

      const saveButton = screen.getByText(/save changes/i)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            project: expect.objectContaining({
              requireApprovalForInvoices: false,
              autoMatchInvoices: false,
              budgetAlertThreshold: 85,
            }),
          })
        )
      })
    })
  })

  describe('Settings Validation', () => {
    it('validates markup percentage range', async () => {
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      const projectTab = screen.getByText(/project settings/i)
      fireEvent.click(projectTab)

      await waitFor(() => {
        expect(screen.getByDisplayValue('15')).toBeInTheDocument()
      })

      // Try to set invalid markup percentage
      const markupInput = screen.getByLabelText(/markup percentage/i)
      fireEvent.change(markupInput, { target: { value: '150' } })

      const saveButton = screen.getByText(/save changes/i)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/markup percentage must be between 0 and 100/i)).toBeInTheDocument()
      })

      expect(mockUpdateSettings).not.toHaveBeenCalled()
    })

    it('validates session timeout range', async () => {
      // Mock admin user for system settings access
      const adminAuthContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'ADMIN' as const },
      }

      jest.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue(adminAuthContext)

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      const systemTab = screen.getByText(/system settings/i)
      fireEvent.click(systemTab)

      await waitFor(() => {
        expect(screen.getByDisplayValue('3600')).toBeInTheDocument()
      })

      // Try to set invalid session timeout
      const timeoutInput = screen.getByLabelText(/session timeout/i)
      fireEvent.change(timeoutInput, { target: { value: '100' } })

      const saveButton = screen.getByText(/save changes/i)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(
          screen.getByText(/session timeout must be at least 300 seconds/i)
        ).toBeInTheDocument()
      })

      expect(mockUpdateSettings).not.toHaveBeenCalled()
    })
  })

  describe('Settings Reset Functionality', () => {
    it('resets user settings to defaults with confirmation', async () => {
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/user preferences/i)).toBeInTheDocument()
      })

      // Click reset button
      const resetButton = screen.getByText(/reset to defaults/i)
      fireEvent.click(resetButton)

      // Confirm reset
      const confirmButton = screen.getByText(/confirm reset/i)
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText(/settings reset successfully/i)).toBeInTheDocument()
      })
    })

    it('cancels reset when user cancels confirmation', async () => {
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      const resetButton = screen.getByText(/reset to defaults/i)
      fireEvent.click(resetButton)

      const cancelButton = screen.getByText(/cancel/i)
      fireEvent.click(cancelButton)

      // Ensure no reset occurred
      expect(screen.queryByText(/settings reset successfully/i)).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles settings update errors gracefully', async () => {
      mockUpdateSettings.mockResolvedValue({
        success: false,
        error: 'Network connection failed',
      })

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('system')).toBeInTheDocument()
      })

      const themeSelect = screen.getByLabelText(/theme/i)
      fireEvent.change(themeSelect, { target: { value: 'dark' } })

      const saveButton = screen.getByText(/save changes/i)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/network connection failed/i)).toBeInTheDocument()
      })
    })

    it('handles settings loading errors', async () => {
      mockGetSettings.mockRejectedValue(new Error('Failed to load settings'))

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/failed to load settings/i)).toBeInTheDocument()
      })

      // Verify retry functionality
      const retryButton = screen.getByText(/retry/i)
      fireEvent.click(retryButton)

      expect(mockGetSettings).toHaveBeenCalledTimes(2)
    })
  })

  describe('Permission-Based Access', () => {
    it('hides system settings for non-admin users', () => {
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      expect(screen.queryByText(/system settings/i)).not.toBeInTheDocument()
    })

    it('shows all settings tabs for admin users', () => {
      const adminAuthContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'ADMIN' as const },
      }

      jest.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue(adminAuthContext)

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      expect(screen.getByText(/user preferences/i)).toBeInTheDocument()
      expect(screen.getByText(/project settings/i)).toBeInTheDocument()
      expect(screen.getByText(/system settings/i)).toBeInTheDocument()
    })
  })

  describe('Settings Persistence', () => {
    it('persists settings changes across page reloads', async () => {
      const updatedSettings = {
        ...mockDefaultSettings,
        user: {
          ...mockDefaultSettings.user,
          theme: 'dark' as const,
        },
      }

      mockGetSettings.mockResolvedValue(updatedSettings)

      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('dark')).toBeInTheDocument()
      })
    })

    it('syncs settings changes across browser tabs', async () => {
      render(
        <TestWrapper>
          <SettingsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('system')).toBeInTheDocument()
      })

      // Simulate settings change from another tab
      const storageEvent = new StorageEvent('storage', {
        key: 'buildtrack_settings',
        newValue: JSON.stringify({
          ...mockDefaultSettings,
          user: { ...mockDefaultSettings.user, theme: 'light' },
        }),
      })

      window.dispatchEvent(storageEvent)

      await waitFor(() => {
        expect(screen.getByDisplayValue('light')).toBeInTheDocument()
      })
    })
  })
})
