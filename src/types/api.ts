/**
 * API Types and Interfaces
 * Comprehensive type definitions for API requests and responses
 */

// Base API Response Structure
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Pagination
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Error Types
export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
}

// Project Types
export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  budget: number
  totalBudget: number
  currency: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
  ownerId: string
}

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

export interface CreateProjectRequest {
  name: string
  description?: string
  budget: number
  startDate: string
  endDate: string
}

// Task Types
export interface Task {
  id: string
  name: string
  description?: string
  startDate: string
  endDate: string
  duration: number
  progress: number
  status: TaskStatus
  priority: TaskPriority
  assignedTo?: string
  dependencies: string[]
  projectId: string
  parentId?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'OVERDUE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface CreateTaskRequest {
  name: string
  description?: string
  startDate: string
  endDate: string
  priority?: TaskPriority
  assignedTo?: string
  dependencies?: string[]
  parentId?: string
}

export interface UpdateTaskRequest {
  name?: string
  description?: string
  startDate?: string
  endDate?: string
  progress?: number
  status?: TaskStatus
  priority?: TaskPriority
  assignedTo?: string
  dependencies?: string[]
}

// Trade and Line Item Types
export interface Trade {
  id: string
  name: string
  description?: string
  sortOrder: number
  projectId: string
  lineItems?: LineItem[]
}

export interface LineItem {
  id: string
  description: string
  quantity: number
  unit: string
  materialCostEst: number
  laborCostEst: number
  equipmentCostEst: number
  markupPercent: number
  overheadPercent: number
  tradeId: string
  sortOrder: number
}

export interface CreateLineItemRequest {
  description: string
  quantity: number
  unit: string
  materialCostEst: number
  laborCostEst: number
  equipmentCostEst: number
  markupPercent?: number
  overheadPercent?: number
}

// Invoice Types
export interface Invoice {
  id: string
  invoiceNumber: string
  vendor: string
  total: number
  date: string
  status: InvoiceStatus
  projectId: string
  lineItems: InvoiceLineItem[]
  createdAt: string
  updatedAt: string
}

export type InvoiceStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'

export interface InvoiceLineItem {
  id: string
  description: string
  amount: number
  quantity?: number
  unit?: string
  invoiceId: string
}

// Milestone Types
export interface Milestone {
  id: string
  name: string
  description?: string
  targetDate: string
  actualDate?: string
  status: MilestoneStatus
  paymentAmount: number
  percentComplete: number
  projectId: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'

// User Types
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export type UserRole = 'ADMIN' | 'USER' | 'VIEWER'

export interface AuthUser extends User {
  // Additional auth-specific properties can be added here
}

// Analytics Types
export interface AnalyticsData {
  overview: {
    totalBudget: number
    totalSpent: number
    totalInvoices: number
    completedMilestones: number
    totalMilestones: number
    progressPercentage: number
    budgetUtilization: number
    remainingBudget: number
    projectedCompletion: string
  }
  trends: {
    spendingTrend: Array<{ month: string; amount: number; cumulative: number }>
    budgetBurnRate: Array<{ month: string; projected: number; actual: number }>
  }
  alerts: Array<{
    type: 'info' | 'warning' | 'error'
    message: string
    severity: 'low' | 'medium' | 'high'
    timestamp: string
  }>
  cashFlow: {
    projectedInflow: Array<{ month: string; amount: number }>
    projectedOutflow: Array<{ month: string; amount: number }>
  }
  kpis: {
    costPerformanceIndex: number
    schedulePerformanceIndex: number
    estimateAccuracy: number
    changeOrderImpact: number
    milestoneAdhesion: number
    budgetVariance: number
  }
  trades: Array<{
    name: string
    budgeted: number
    spent: number
    variance: number
  }>
}

// Report Types
export interface ReportConfig {
  type: ReportType
  format: ReportFormat
  title?: string
  dateRange?: {
    startDate: string
    endDate: string
  }
  sections: {
    executiveSummary?: boolean
    financialDetails?: boolean
    milestoneTracking?: boolean
    costAnalysis?: boolean
    tradeBreakdown?: boolean
    invoiceDetails?: boolean
  }
}

export type ReportType =
  | 'project-summary'
  | 'financial-analysis'
  | 'milestone-progress'
  | 'cost-tracking'
  | 'comprehensive'
  | 'custom'
export type ReportFormat = 'PDF' | 'Excel' | 'CSV'

// Comment Types
export interface Comment {
  id: string
  content: string
  authorId: string
  author: User
  targetType: string
  targetId: string
  parentId?: string
  createdAt: string
  updatedAt: string
  replies?: Comment[]
  attachments?: string[]
}

export interface CreateCommentRequest {
  content: string
  targetType: string
  targetId: string
  parentId?: string
  attachments?: File[]
}

// Matching Types
export interface MatchResult {
  invoiceLineId: string
  estimateId: string
  confidence: number
  method: 'llm' | 'logic' | 'manual'
  reasoning?: string
}

export interface BulkMatchingResult {
  success: boolean
  totalInvoices: number
  totalLineItems: number
  matchedItems: number
  unmatchedItems: number
  averageConfidence: number
  matches: MatchResult[]
  processingDetails: {
    processingTimeMs: number
    averageTimePerItem: number
    throughputItemsPerSecond: number
    llmAttempts: number
    llmMatches: number
    llmFailures: number
    logicMatches: number
    patternsUsed: number
    batchSize: number
  }
  error?: string
}

// PWA Types
export interface InstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Utility Types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type PartialFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Date utility types
export type DateString = string // ISO 8601 date string
export type TimestampString = string // ISO 8601 datetime string

// ID types
export type ProjectId = string
export type TaskId = string
export type UserId = string
export type TradeId = string
export type LineItemId = string
export type InvoiceId = string
export type MilestoneId = string
export type CommentId = string
