/**
 * Server-Side Settings Management
 * Type-safe settings for server-side usage (API routes)
 */

// Settings Types (re-exported for consistency)
export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'en-NZ'
  currency: 'NZD' | 'USD' | 'AUD'
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  timezone: string
  notifications: {
    email: boolean
    browser: boolean
    invoiceApproval: boolean
    milestoneDeadlines: boolean
    budgetAlerts: boolean
  }
  dashboard: {
    defaultView: 'overview' | 'projects' | 'invoices'
    showQuickStats: boolean
    projectsPerPage: number
  }
}

export interface ProjectSettings {
  defaultMarkupPercent: number
  defaultOverheadPercent: number
  defaultCurrency: string
  requireApprovalForInvoices: boolean
  autoMatchInvoices: boolean
  budgetAlertThreshold: number // percentage
  milestoneReminderDays: number
}

export interface SystemSettings {
  pdfProcessing: {
    provider: 'gemini' | 'anthropic' | 'openai'
    fallbackProvider: 'gemini' | 'anthropic' | 'openai'
    confidenceThreshold: number
    maxFileSize: number // bytes
    allowedFormats: string[]
  }
  invoiceMatching: {
    autoApproveHighConfidence: boolean
    highConfidenceThreshold: number
    requireManualReview: boolean
  }
  backup: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    retentionDays: number
  }
}

export interface AppSettings {
  user: UserSettings
  project: ProjectSettings
  system: SystemSettings
}

// Default Settings
export const defaultUserSettings: UserSettings = {
  theme: 'system',
  language: 'en-NZ',
  currency: 'NZD',
  dateFormat: 'DD/MM/YYYY',
  timezone: 'Pacific/Auckland',
  notifications: {
    email: true,
    browser: true,
    invoiceApproval: true,
    milestoneDeadlines: true,
    budgetAlerts: true,
  },
  dashboard: {
    defaultView: 'overview',
    showQuickStats: true,
    projectsPerPage: 10,
  },
}

export const defaultProjectSettings: ProjectSettings = {
  defaultMarkupPercent: 15,
  defaultOverheadPercent: 10,
  defaultCurrency: 'NZD',
  requireApprovalForInvoices: true,
  autoMatchInvoices: true,
  budgetAlertThreshold: 85,
  milestoneReminderDays: 7,
}

export const defaultSystemSettings: SystemSettings = {
  pdfProcessing: {
    provider: 'gemini',
    fallbackProvider: 'anthropic',
    confidenceThreshold: 0.7,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  invoiceMatching: {
    autoApproveHighConfidence: false,
    highConfidenceThreshold: 0.9,
    requireManualReview: true,
  },
  backup: {
    enabled: true,
    frequency: 'daily',
    retentionDays: 30,
  },
}

/**
 * Server-safe function to get settings without React hooks
 * For use in API routes and server-side code
 */
export async function getSettings(userId?: string): Promise<AppSettings> {
  // For now, return default settings
  // In the future, this could load user-specific settings from database
  return {
    user: defaultUserSettings,
    project: defaultProjectSettings,
    system: defaultSystemSettings,
  }
}