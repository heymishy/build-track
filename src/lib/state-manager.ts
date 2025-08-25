/**
 * Centralized State Management System
 * Provides consistent state patterns across the application
 */

import { createContext, useContext, useReducer, Dispatch, ReactNode } from 'react'
import type {
  EntityState,
  LoadingState,
  CacheState,
  BaseEntity,
  ApiResponse,
  PaginationParams,
} from '@/types'

// ==================== Generic State Actions ====================

export type StateAction<T = any> =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ENTITIES'; payload: T[] }
  | { type: 'ADD_ENTITY'; payload: T }
  | { type: 'UPDATE_ENTITY'; payload: { id: string; updates: Partial<T> } }
  | { type: 'REMOVE_ENTITY'; payload: string }
  | { type: 'SET_SELECTED'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: any }
  | { type: 'SET_PAGINATION'; payload: Partial<EntityState<T>['pagination']> }
  | { type: 'RESET_STATE' }
  | { type: 'SET_CACHE'; payload: { key: string; data: any; ttl?: number } }
  | { type: 'CLEAR_CACHE'; payload?: string }

// ==================== Generic State Reducer ====================

export function createEntityReducer<T extends BaseEntity>() {
  return function entityReducer(state: EntityState<T>, action: StateAction<T>): EntityState<T> {
    switch (action.type) {
      case 'SET_LOADING':
        return {
          ...state,
          isLoading: action.payload,
          error: action.payload ? state.error : null,
        }

      case 'SET_ERROR':
        return {
          ...state,
          isLoading: false,
          error: action.payload,
        }

      case 'SET_ENTITIES':
        return {
          ...state,
          entities: action.payload,
          isLoading: false,
          error: null,
          lastUpdated: new Date(),
        }

      case 'ADD_ENTITY':
        return {
          ...state,
          entities: [...state.entities, action.payload],
          lastUpdated: new Date(),
        }

      case 'UPDATE_ENTITY':
        return {
          ...state,
          entities: state.entities.map(entity =>
            entity.id === action.payload.id ? { ...entity, ...action.payload.updates } : entity
          ),
          lastUpdated: new Date(),
        }

      case 'REMOVE_ENTITY':
        return {
          ...state,
          entities: state.entities.filter(entity => entity.id !== action.payload),
          selectedId: state.selectedId === action.payload ? null : state.selectedId,
          lastUpdated: new Date(),
        }

      case 'SET_SELECTED':
        return {
          ...state,
          selectedId: action.payload,
        }

      case 'SET_FILTERS':
        return {
          ...state,
          filters: action.payload,
        }

      case 'SET_PAGINATION':
        return {
          ...state,
          pagination: state.pagination
            ? { ...state.pagination, ...action.payload }
            : (action.payload as EntityState<T>['pagination']),
        }

      case 'RESET_STATE':
        return createInitialEntityState<T>()

      default:
        return state
    }
  }
}

// ==================== Initial State Factory ====================

export function createInitialEntityState<T extends BaseEntity>(): EntityState<T> {
  return {
    entities: [],
    selectedId: null,
    isLoading: false,
    error: null,
    filters: {},
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      hasMore: false,
    },
  }
}

// ==================== Generic Context Factory ====================

export function createEntityContext<T extends BaseEntity>(name: string) {
  const Context = createContext<
    | {
        state: EntityState<T>
        dispatch: Dispatch<StateAction<T>>
        actions: EntityActions<T>
      }
    | undefined
  >(undefined)

  const useContext = () => {
    const context = useContext(Context)
    if (!context) {
      throw new Error(`use${name} must be used within a ${name}Provider`)
    }
    return context
  }

  return { Context, useContext }
}

// ==================== Entity Actions Factory ====================

export interface EntityActions<T extends BaseEntity> {
  // Basic CRUD
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setEntities: (entities: T[]) => void
  addEntity: (entity: T) => void
  updateEntity: (id: string, updates: Partial<T>) => void
  removeEntity: (id: string) => void

  // Selection
  selectEntity: (id: string | null) => void
  getSelected: () => T | null

  // Filtering & Pagination
  setFilters: (filters: any) => void
  setPagination: (pagination: Partial<EntityState<T>['pagination']>) => void

  // Utilities
  resetState: () => void
  findById: (id: string) => T | undefined
  findMany: (predicate: (entity: T) => boolean) => T[]

  // API Helpers
  handleApiResponse: (response: ApiResponse<T | T[]>) => void
  withLoadingState: <R>(operation: () => Promise<R>) => Promise<R>
}

export function createEntityActions<T extends BaseEntity>(
  dispatch: Dispatch<StateAction<T>>,
  state: EntityState<T>
): EntityActions<T> {
  return {
    setLoading: (loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading })
    },

    setError: (error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error })
    },

    setEntities: (entities: T[]) => {
      dispatch({ type: 'SET_ENTITIES', payload: entities })
    },

    addEntity: (entity: T) => {
      dispatch({ type: 'ADD_ENTITY', payload: entity })
    },

    updateEntity: (id: string, updates: Partial<T>) => {
      dispatch({ type: 'UPDATE_ENTITY', payload: { id, updates } })
    },

    removeEntity: (id: string) => {
      dispatch({ type: 'REMOVE_ENTITY', payload: id })
    },

    selectEntity: (id: string | null) => {
      dispatch({ type: 'SET_SELECTED', payload: id })
    },

    getSelected: () => {
      if (!state.selectedId) return null
      return state.entities.find(e => e.id === state.selectedId) || null
    },

    setFilters: (filters: any) => {
      dispatch({ type: 'SET_FILTERS', payload: filters })
    },

    setPagination: (pagination: Partial<EntityState<T>['pagination']>) => {
      dispatch({ type: 'SET_PAGINATION', payload: pagination })
    },

    resetState: () => {
      dispatch({ type: 'RESET_STATE' })
    },

    findById: (id: string) => {
      return state.entities.find(entity => entity.id === id)
    },

    findMany: (predicate: (entity: T) => boolean) => {
      return state.entities.filter(predicate)
    },

    handleApiResponse: (response: ApiResponse<T | T[]>) => {
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          dispatch({ type: 'SET_ENTITIES', payload: response.data })
        } else {
          dispatch({ type: 'ADD_ENTITY', payload: response.data })
        }
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error as string })
      }
    },

    withLoadingState: async <R>(operation: () => Promise<R>): Promise<R> => {
      dispatch({ type: 'SET_LOADING', payload: true })
      try {
        const result = await operation()
        dispatch({ type: 'SET_LOADING', payload: false })
        return result
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Operation failed',
        })
        throw error
      }
    },
  }
}

// ==================== Cache Management ====================

export class StateCache {
  private cache: Map<string, CacheState<any>> = new Map()
  private defaultTTL: number = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const expiresAt = now + (ttl || this.defaultTTL)

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    })
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key)

    if (!cached) return null

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return cached.data as T
  }

  has(key: string): boolean {
    const cached = this.cache.get(key)
    return cached ? Date.now() <= cached.expiresAt : false
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memory: JSON.stringify(Array.from(this.cache.values())).length,
    }
  }
}

// Global cache instance
export const globalCache = new StateCache()

// ==================== API Helper Functions ====================

export interface ApiClientOptions {
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
  cache?: StateCache
}

export class ApiClient {
  private baseURL: string
  private timeout: number
  private headers: Record<string, string>
  private cache: StateCache

  constructor(options: ApiClientOptions = {}) {
    this.baseURL = options.baseURL || '/api'
    this.timeout = options.timeout || 10000
    this.headers = options.headers || {}
    this.cache = options.cache || globalCache
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheTTL?: number
  ): Promise<ApiResponse<T>> {
    // Check cache first
    if (cacheKey && options.method === 'GET') {
      const cached = this.cache.get<ApiResponse<T>>(cacheKey)
      if (cached) return cached
    }

    const url = `${this.baseURL}${endpoint}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
          ...options.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const data = await response.json()

      const result: ApiResponse<T> = {
        success: response.ok,
        data: response.ok ? data.data || data : undefined,
        error: response.ok ? undefined : data.error || 'Request failed',
      }

      // Cache successful GET requests
      if (cacheKey && options.method === 'GET' && result.success) {
        this.cache.set(cacheKey, result, cacheTTL)
      }

      return result
    } catch (error) {
      clearTimeout(timeoutId)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  async get<T>(endpoint: string, cacheKey?: string, cacheTTL?: number): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, cacheKey, cacheTTL)
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  clearCache(key?: string): void {
    this.cache.clear(key)
  }
}

// Global API client
export const apiClient = new ApiClient()

// ==================== Query Builder ====================

export class QueryBuilder {
  private params: URLSearchParams = new URLSearchParams()

  static create(): QueryBuilder {
    return new QueryBuilder()
  }

  where(field: string, value: any): QueryBuilder {
    if (value !== undefined && value !== null && value !== '') {
      this.params.set(field, String(value))
    }
    return this
  }

  whereIn(field: string, values: any[]): QueryBuilder {
    if (values.length > 0) {
      this.params.set(field, values.join(','))
    }
    return this
  }

  paginate(page: number, limit: number): QueryBuilder {
    this.params.set('page', String(page))
    this.params.set('limit', String(limit))
    return this
  }

  sort(field: string, order: 'asc' | 'desc' = 'asc'): QueryBuilder {
    this.params.set('sortBy', field)
    this.params.set('sortOrder', order)
    return this
  }

  search(query: string): QueryBuilder {
    if (query.trim()) {
      this.params.set('search', query.trim())
    }
    return this
  }

  range(field: string, min?: number, max?: number): QueryBuilder {
    if (min !== undefined) {
      this.params.set(`${field}Min`, String(min))
    }
    if (max !== undefined) {
      this.params.set(`${field}Max`, String(max))
    }
    return this
  }

  dateRange(field: string, start?: string, end?: string): QueryBuilder {
    if (start) {
      this.params.set(`${field}Start`, start)
    }
    if (end) {
      this.params.set(`${field}End`, end)
    }
    return this
  }

  build(): string {
    const query = this.params.toString()
    return query ? `?${query}` : ''
  }

  buildParams(): URLSearchParams {
    return this.params
  }
}

// ==================== Error Handling ====================

export class StateError extends Error {
  public code: string
  public field?: string

  constructor(message: string, code: string, field?: string) {
    super(message)
    this.name = 'StateError'
    this.code = code
    this.field = field
  }
}

export function handleStateError(error: unknown): StateError {
  if (error instanceof StateError) {
    return error
  }

  if (error instanceof Error) {
    return new StateError(error.message, 'UNKNOWN_ERROR')
  }

  return new StateError('An unknown error occurred', 'UNKNOWN_ERROR')
}
