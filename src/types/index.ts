/**
 * Unified Type Definitions for BuildTrack
 * Centralizes all data models with consistent patterns
 */

// ==================== Base Types ====================

export interface BaseEntity {
  id: string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface BaseError {
  code: string
  message: string
  field?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string | BaseError
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ==================== Enums ====================

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

export enum ProjectRole {
  OWNER = 'OWNER',
  CONTRACTOR = 'CONTRACTOR',
  VIEWER = 'VIEWER',
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  DISPUTED = 'DISPUTED',
  REJECTED = 'REJECTED',
}

export enum Currency {
  NZD = 'NZD',
  USD = 'USD',
  AUD = 'AUD',
  GBP = 'GBP',
  EUR = 'EUR',
}

// ==================== User Models ====================

export interface User extends BaseEntity {
  email: string
  name: string
  role: UserRole
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export interface UserProfile extends User {
  preferences?: UserPreferences
  stats?: UserStats
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'en-NZ'
  currency: Currency
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  timezone: string
  notifications: {
    email: boolean
    browser: boolean
    invoiceApproval: boolean
    milestoneDeadlines: boolean
    budgetAlerts: boolean
  }
}

export interface UserStats {
  totalProjects: number
  activeProjects: number
  totalInvoices: number
  totalValue: number
}

// ==================== Project Models ====================

export interface Project extends BaseEntity {
  name: string
  description?: string
  totalBudget: number
  currency: Currency
  startDate?: Date | string
  estimatedEndDate?: Date | string
  actualEndDate?: Date | string
  status: ProjectStatus
  stats?: ProjectStats
  permissions?: ProjectPermissions
}

export interface ProjectStats {
  totalInvoices: number
  totalTrades: number
  totalMilestones: number
  completedMilestones: number
  totalInvoiceAmount: number
  paidInvoiceAmount: number
  pendingInvoiceAmount: number
  totalMilestoneAmount: number
  budgetUsed: number
  budgetRemaining: number
  budgetUsedPercent: number
  isOverBudget: boolean
  healthScore?: number
}

export interface ProjectPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canManageUsers: boolean
  canApproveInvoices: boolean
  role: ProjectRole
}

export interface ProjectUser extends BaseEntity {
  userId: string
  projectId: string
  role: ProjectRole
  user?: User
  project?: Project
}

// ==================== Trade Models ====================

export interface Trade extends BaseEntity {
  projectId: string
  name: string
  description?: string
  sortOrder: number
  lineItems?: LineItem[]
  stats?: TradeStats
}

export interface TradeStats {
  totalItems: number
  totalEstimate: number
  totalActual: number
  variance: number
  variancePercent: number
}

export interface LineItem extends BaseEntity {
  tradeId: string
  itemCode?: string
  description: string
  quantity: number
  unit: string

  // Estimates
  materialCostEst: number
  laborCostEst: number
  equipmentCostEst: number
  markupPercent: number
  overheadPercent: number

  sortOrder: number

  // Calculated fields
  totalEstimate?: number
  totalActual?: number
  variance?: number

  // Relations
  trade?: Trade
  invoiceItems?: InvoiceLineItem[]
}

// ==================== Milestone Models ====================

export interface Milestone extends BaseEntity {
  projectId: string
  name: string
  description?: string
  targetDate: Date | string
  actualDate?: Date | string
  paymentAmount: number
  percentComplete: number
  status: MilestoneStatus
  sortOrder: number

  // Relations
  project?: Project
}

// ==================== Invoice Models ====================

export interface Invoice extends BaseEntity {
  projectId: string
  userId?: string
  invoiceNumber: string
  supplierName: string
  supplierABN?: string
  invoiceDate: Date | string
  dueDate?: Date | string
  totalAmount: number
  gstAmount: number
  status: InvoiceStatus
  pdfUrl?: string
  notes?: string

  // Relations
  project?: Project
  user?: User
  lineItems?: InvoiceLineItem[]
}

export interface InvoiceLineItem extends BaseEntity {
  invoiceId: string
  lineItemId?: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category: 'MATERIAL' | 'LABOR' | 'EQUIPMENT' | 'OTHER'

  // Relations
  invoice?: Invoice
  lineItem?: LineItem
}

// ==================== Settings Models ====================

export interface AppSettings {
  user: UserPreferences
  project: ProjectSettings
  system: SystemSettings
}

export interface ProjectSettings {
  defaultMarkupPercent: number
  defaultOverheadPercent: number
  defaultCurrency: Currency
  requireApprovalForInvoices: boolean
  budgetWarningThreshold: number
  budgetCriticalThreshold: number
  autoMatchInvoiceItems: boolean
}

export interface SystemSettings {
  appName: string
  version: string
  supportEmail: string
  maintenanceMode: boolean
  features: {
    invoiceProcessing: boolean
    milestoneTracking: boolean
    costAnalytics: boolean
    reporting: boolean
  }
}

// ==================== Form Models ====================

export interface ProjectFormData {
  name: string
  description?: string
  totalBudget: number
  currency: Currency
  startDate?: string
  estimatedEndDate?: string
  status: ProjectStatus
}

export interface TradeFormData {
  name: string
  description?: string
  sortOrder?: number
}

export interface LineItemFormData {
  itemCode?: string
  description: string
  quantity: number
  unit: string
  materialCostEst: number
  laborCostEst: number
  equipmentCostEst: number
  markupPercent: number
  overheadPercent: number
}

export interface MilestoneFormData {
  name: string
  description?: string
  targetDate: string
  paymentAmount: number
  percentComplete: number
  status: MilestoneStatus
}

export interface InvoiceFormData {
  invoiceNumber: string
  supplierName: string
  supplierABN?: string
  invoiceDate: string
  dueDate?: string
  totalAmount: number
  gstAmount: number
  status: InvoiceStatus
  notes?: string
}

// ==================== Filter & Search Models ====================

export interface ProjectFilters {
  status?: ProjectStatus[]
  currency?: Currency[]
  budgetRange?: { min?: number; max?: number }
  dateRange?: { start?: string; end?: string }
  userId?: string
}

export interface InvoiceFilters {
  status?: InvoiceStatus[]
  projectId?: string
  supplierName?: string
  dateRange?: { start?: string; end?: string }
  amountRange?: { min?: number; max?: number }
}

export interface MilestoneFilters {
  status?: MilestoneStatus[]
  projectId?: string
  dateRange?: { start?: string; end?: string }
  overdueOnly?: boolean
}

// ==================== Analytics Models ====================

export interface ProjectAnalytics {
  summary: {
    totalProjects: number
    activeProjects: number
    completedProjects: number
    totalValue: number
    averageBudget: number
  }

  budgetAnalysis: {
    totalBudget: number
    totalSpent: number
    totalRemaining: number
    overBudgetProjects: number
    avgBudgetUsage: number
  }

  timelineAnalysis: {
    onTimeProjects: number
    delayedProjects: number
    avgProjectDuration: number
    upcomingDeadlines: number
  }

  trends: {
    monthlySpending: Array<{ month: string; amount: number }>
    projectCompletions: Array<{ month: string; count: number }>
    budgetUtilization: Array<{ month: string; percentage: number }>
  }
}

export interface InvoiceAnalytics {
  summary: {
    totalInvoices: number
    totalValue: number
    avgInvoiceValue: number
    pendingApprovals: number
  }

  statusBreakdown: Array<{
    status: InvoiceStatus
    count: number
    value: number
  }>

  supplierAnalysis: Array<{
    supplier: string
    invoiceCount: number
    totalValue: number
    avgValue: number
  }>

  trends: {
    monthlyInvoices: Array<{ month: string; count: number; value: number }>
    paymentTimeline: Array<{ month: string; paid: number; pending: number }>
  }
}

// ==================== State Management Models ====================

export interface LoadingState {
  isLoading: boolean
  error?: string | null
  lastUpdated?: Date
}

export interface EntityState<T> extends LoadingState {
  entities: T[]
  selectedId?: string | null
  filters?: any
  pagination?: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

export interface CacheState<T> {
  data: T
  timestamp: number
  expiresAt: number
}

// ==================== Utility Types ====================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// ==================== API Endpoint Types ====================

export interface ApiEndpoints {
  auth: {
    login: string
    register: string
    logout: string
    profile: string
  }
  projects: {
    list: string
    create: string
    get: (id: string) => string
    update: (id: string) => string
    delete: (id: string) => string
    stats: (id: string) => string
  }
  trades: {
    list: (projectId: string) => string
    create: (projectId: string) => string
    get: (projectId: string, id: string) => string
    update: (projectId: string, id: string) => string
    delete: (projectId: string, id: string) => string
  }
  invoices: {
    list: string
    create: string
    get: (id: string) => string
    update: (id: string) => string
    delete: (id: string) => string
    upload: string
    process: string
  }
  milestones: {
    list: (projectId: string) => string
    create: (projectId: string) => string
    get: (projectId: string, id: string) => string
    update: (projectId: string, id: string) => string
    delete: (projectId: string, id: string) => string
  }
}

// ==================== Export Groups ====================

// Core entities
export type CoreEntity = User | Project | Trade | LineItem | Milestone | Invoice

// Form data types
export type FormData =
  | ProjectFormData
  | TradeFormData
  | LineItemFormData
  | MilestoneFormData
  | InvoiceFormData

// Filter types
export type FilterType = ProjectFilters | InvoiceFilters | MilestoneFilters

// Analytics types
export type AnalyticsType = ProjectAnalytics | InvoiceAnalytics
