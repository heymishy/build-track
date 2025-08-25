/**
 * Data Service Layer
 * Centralized API interactions with consistent error handling and caching
 */

import { apiClient, QueryBuilder, globalCache, type StateCache } from '@/lib/state-manager'
import type {
  Project,
  ProjectFormData,
  ProjectFilters,
  ProjectStats,
  Trade,
  TradeFormData,
  LineItem,
  LineItemFormData,
  Invoice,
  InvoiceFormData,
  InvoiceFilters,
  Milestone,
  MilestoneFormData,
  User,
  UserProfile,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  ProjectAnalytics,
  InvoiceAnalytics,
} from '@/types'

// ==================== Base Service Class ====================

abstract class BaseService {
  protected cache: StateCache = globalCache
  protected baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  protected getCacheKey(endpoint: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : ''
    return `${this.baseURL}${endpoint}${paramString}`.replace(/[^\w]/g, '_')
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheTTL?: number
  ): Promise<ApiResponse<T>> {
    return apiClient.request(`${this.baseURL}${endpoint}`, options, cacheKey, cacheTTL)
  }

  protected buildQuery(params: any = {}): string {
    const builder = QueryBuilder.create()

    // Common pagination
    if (params.page) builder.paginate(params.page, params.limit || 20)
    if (params.sortBy) builder.sort(params.sortBy, params.sortOrder || 'desc')
    if (params.search) builder.search(params.search)

    return builder.build()
  }
}

// ==================== Projects Service ====================

class ProjectsService extends BaseService {
  constructor() {
    super('/projects')
  }

  async getAll(params?: PaginationParams & ProjectFilters): Promise<PaginatedResponse<Project>> {
    const query = QueryBuilder.create()
      .paginate(params?.page || 1, params?.limit || 20)
      .whereIn('status', params?.status || [])
      .whereIn('currency', params?.currency || [])
      .range('totalBudget', params?.budgetRange?.min, params?.budgetRange?.max)
      .dateRange('startDate', params?.dateRange?.start, params?.dateRange?.end)
      .where('userId', params?.userId)
      .sort(params?.sortBy || 'updatedAt', params?.sortOrder || 'desc')
      .search(params?.search || '')
      .build()

    const cacheKey = this.getCacheKey('', params)
    return this.request<Project[]>(
      query,
      { method: 'GET' },
      cacheKey,
      2 * 60 * 1000 // 2 minutes
    ) as Promise<PaginatedResponse<Project>>
  }

  async getById(id: string): Promise<ApiResponse<Project>> {
    const cacheKey = this.getCacheKey(`/${id}`)
    return this.request<Project>(
      `/${id}`,
      { method: 'GET' },
      cacheKey,
      5 * 60 * 1000 // 5 minutes
    )
  }

  async create(data: ProjectFormData): Promise<ApiResponse<Project>> {
    const response = await this.request<Project>('', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    // Clear list cache on successful creation
    if (response.success) {
      this.cache.clear(this.getCacheKey(''))
    }

    return response
  }

  async update(id: string, data: Partial<ProjectFormData>): Promise<ApiResponse<Project>> {
    const response = await this.request<Project>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    // Clear related caches
    if (response.success) {
      this.cache.clear(this.getCacheKey(''))
      this.cache.clear(this.getCacheKey(`/${id}`))
    }

    return response
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    const response = await this.request<void>(`/${id}`, {
      method: 'DELETE',
    })

    // Clear related caches
    if (response.success) {
      this.cache.clear(this.getCacheKey(''))
      this.cache.clear(this.getCacheKey(`/${id}`))
    }

    return response
  }

  async getStats(id: string): Promise<ApiResponse<ProjectStats>> {
    const cacheKey = this.getCacheKey(`/${id}/stats`)
    return this.request<ProjectStats>(
      `/${id}/stats`,
      { method: 'GET' },
      cacheKey,
      1 * 60 * 1000 // 1 minute for stats
    )
  }

  async getAnalytics(id: string): Promise<ApiResponse<ProjectAnalytics>> {
    const cacheKey = this.getCacheKey(`/${id}/analytics`)
    return this.request<ProjectAnalytics>(
      `/${id}/analytics`,
      { method: 'GET' },
      cacheKey,
      5 * 60 * 1000
    )
  }
}

// ==================== Trades Service ====================

class TradesService extends BaseService {
  constructor() {
    super('/trades')
  }

  async getByProject(projectId: string): Promise<ApiResponse<Trade[]>> {
    const cacheKey = this.getCacheKey(`/project/${projectId}`)
    return this.request<Trade[]>(
      `/project/${projectId}`,
      { method: 'GET' },
      cacheKey,
      3 * 60 * 1000
    )
  }

  async create(projectId: string, data: TradeFormData): Promise<ApiResponse<Trade>> {
    const response = await this.request<Trade>('', {
      method: 'POST',
      body: JSON.stringify({ ...data, projectId }),
    })

    if (response.success) {
      this.cache.clear(this.getCacheKey(`/project/${projectId}`))
    }

    return response
  }

  async update(id: string, data: Partial<TradeFormData>): Promise<ApiResponse<Trade>> {
    const response = await this.request<Trade>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    if (response.success) {
      // Clear project trades cache - would need projectId
      this.cache.clear() // Clear all for simplicity
    }

    return response
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    const response = await this.request<void>(`/${id}`, {
      method: 'DELETE',
    })

    if (response.success) {
      this.cache.clear() // Clear all caches
    }

    return response
  }
}

// ==================== Line Items Service ====================

class LineItemsService extends BaseService {
  constructor() {
    super('/line-items')
  }

  async getByTrade(tradeId: string): Promise<ApiResponse<LineItem[]>> {
    const cacheKey = this.getCacheKey(`/trade/${tradeId}`)
    return this.request<LineItem[]>(`/trade/${tradeId}`, { method: 'GET' }, cacheKey, 3 * 60 * 1000)
  }

  async create(tradeId: string, data: LineItemFormData): Promise<ApiResponse<LineItem>> {
    const response = await this.request<LineItem>('', {
      method: 'POST',
      body: JSON.stringify({ ...data, tradeId }),
    })

    if (response.success) {
      this.cache.clear(this.getCacheKey(`/trade/${tradeId}`))
    }

    return response
  }

  async update(id: string, data: Partial<LineItemFormData>): Promise<ApiResponse<LineItem>> {
    const response = await this.request<LineItem>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    if (response.success) {
      this.cache.clear() // Simplify cache clearing
    }

    return response
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    const response = await this.request<void>(`/${id}`, {
      method: 'DELETE',
    })

    if (response.success) {
      this.cache.clear()
    }

    return response
  }

  async bulkUpdate(
    updates: Array<{ id: string; data: Partial<LineItemFormData> }>
  ): Promise<ApiResponse<LineItem[]>> {
    const response = await this.request<LineItem[]>('/bulk-update', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    })

    if (response.success) {
      this.cache.clear()
    }

    return response
  }
}

// ==================== Invoices Service ====================

class InvoicesService extends BaseService {
  constructor() {
    super('/invoices')
  }

  async getAll(params?: PaginationParams & InvoiceFilters): Promise<PaginatedResponse<Invoice>> {
    const query = QueryBuilder.create()
      .paginate(params?.page || 1, params?.limit || 20)
      .whereIn('status', params?.status || [])
      .where('projectId', params?.projectId)
      .where('supplierName', params?.supplierName)
      .dateRange('invoiceDate', params?.dateRange?.start, params?.dateRange?.end)
      .range('totalAmount', params?.amountRange?.min, params?.amountRange?.max)
      .sort(params?.sortBy || 'invoiceDate', params?.sortOrder || 'desc')
      .search(params?.search || '')
      .build()

    const cacheKey = this.getCacheKey('', params)
    return this.request<Invoice[]>(query, { method: 'GET' }, cacheKey, 1 * 60 * 1000) as Promise<
      PaginatedResponse<Invoice>
    >
  }

  async getById(id: string): Promise<ApiResponse<Invoice>> {
    const cacheKey = this.getCacheKey(`/${id}`)
    return this.request<Invoice>(`/${id}`, { method: 'GET' }, cacheKey, 3 * 60 * 1000)
  }

  async create(data: InvoiceFormData): Promise<ApiResponse<Invoice>> {
    const response = await this.request<Invoice>('', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (response.success) {
      this.cache.clear(this.getCacheKey(''))
    }

    return response
  }

  async update(id: string, data: Partial<InvoiceFormData>): Promise<ApiResponse<Invoice>> {
    const response = await this.request<Invoice>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    if (response.success) {
      this.cache.clear(this.getCacheKey(''))
      this.cache.clear(this.getCacheKey(`/${id}`))
    }

    return response
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    const response = await this.request<void>(`/${id}`, {
      method: 'DELETE',
    })

    if (response.success) {
      this.cache.clear(this.getCacheKey(''))
      this.cache.clear(this.getCacheKey(`/${id}`))
    }

    return response
  }

  async uploadPDF(
    file: File,
    projectId?: string
  ): Promise<ApiResponse<{ invoices: Invoice[]; processed: number }>> {
    const formData = new FormData()
    formData.append('file', file)
    if (projectId) {
      formData.append('projectId', projectId)
    }

    const response = await fetch('/api/invoices/upload', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      this.cache.clear(this.getCacheKey(''))
    }

    return result
  }

  async approve(id: string): Promise<ApiResponse<Invoice>> {
    return this.update(id, { status: 'APPROVED' })
  }

  async reject(id: string, notes?: string): Promise<ApiResponse<Invoice>> {
    return this.update(id, { status: 'REJECTED', notes })
  }

  async getAnalytics(params?: InvoiceFilters): Promise<ApiResponse<InvoiceAnalytics>> {
    const query = this.buildQuery(params)
    const cacheKey = this.getCacheKey('/analytics', params)
    return this.request<InvoiceAnalytics>(
      `/analytics${query}`,
      { method: 'GET' },
      cacheKey,
      5 * 60 * 1000
    )
  }
}

// ==================== Milestones Service ====================

class MilestonesService extends BaseService {
  constructor() {
    super('/milestones')
  }

  async getByProject(projectId: string): Promise<ApiResponse<Milestone[]>> {
    const cacheKey = this.getCacheKey(`/project/${projectId}`)
    return this.request<Milestone[]>(
      `/project/${projectId}`,
      { method: 'GET' },
      cacheKey,
      3 * 60 * 1000
    )
  }

  async create(projectId: string, data: MilestoneFormData): Promise<ApiResponse<Milestone>> {
    const response = await this.request<Milestone>('', {
      method: 'POST',
      body: JSON.stringify({ ...data, projectId }),
    })

    if (response.success) {
      this.cache.clear(this.getCacheKey(`/project/${projectId}`))
    }

    return response
  }

  async update(id: string, data: Partial<MilestoneFormData>): Promise<ApiResponse<Milestone>> {
    const response = await this.request<Milestone>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    if (response.success) {
      this.cache.clear()
    }

    return response
  }

  async updateProgress(id: string, percentComplete: number): Promise<ApiResponse<Milestone>> {
    return this.update(id, { percentComplete })
  }

  async complete(id: string): Promise<ApiResponse<Milestone>> {
    return this.update(id, {
      status: 'COMPLETED',
      percentComplete: 100,
      // actualDate would be set server-side
    })
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    const response = await this.request<void>(`/${id}`, {
      method: 'DELETE',
    })

    if (response.success) {
      this.cache.clear()
    }

    return response
  }
}

// ==================== Users Service ====================

class UsersService extends BaseService {
  constructor() {
    super('/users')
  }

  async getProfile(): Promise<ApiResponse<UserProfile>> {
    const cacheKey = this.getCacheKey('/profile')
    return this.request<UserProfile>('/profile', { method: 'GET' }, cacheKey, 5 * 60 * 1000)
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.request<User>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    if (response.success) {
      this.cache.clear(this.getCacheKey('/profile'))
    }

    return response
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.request<void>('/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }

  async getByProject(projectId: string): Promise<ApiResponse<User[]>> {
    const cacheKey = this.getCacheKey(`/project/${projectId}`)
    return this.request<User[]>(`/project/${projectId}`, { method: 'GET' }, cacheKey, 3 * 60 * 1000)
  }
}

// ==================== Service Factory ====================

export class DataService {
  public readonly projects = new ProjectsService()
  public readonly trades = new TradesService()
  public readonly lineItems = new LineItemsService()
  public readonly invoices = new InvoicesService()
  public readonly milestones = new MilestonesService()
  public readonly users = new UsersService()

  // Global cache management
  clearAllCaches(): void {
    globalCache.clear()
  }

  getCacheStats() {
    return globalCache.getStats()
  }

  // Batch operations
  async batchUpdate<T>(
    service: keyof DataService,
    updates: Array<{ id: string; data: any }>
  ): Promise<ApiResponse<T[]>> {
    // Implementation would depend on specific service
    // For now, we'll do sequential updates
    const results: T[] = []
    const errors: string[] = []

    for (const update of updates) {
      try {
        const serviceInstance = this[service] as any
        const response = await serviceInstance.update(update.id, update.data)

        if (response.success && response.data) {
          results.push(response.data)
        } else {
          errors.push(`Failed to update ${update.id}: ${response.error}`)
        }
      } catch (error) {
        errors.push(`Failed to update ${update.id}: ${error}`)
      }
    }

    return {
      success: errors.length === 0,
      data: results,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: Date }>> {
    return apiClient.get('/health')
  }
}

// ==================== Global Instance ====================

export const dataService = new DataService()

// ==================== Export Types ====================

export type {
  ProjectsService,
  TradesService,
  LineItemsService,
  InvoicesService,
  MilestonesService,
  UsersService,
}
