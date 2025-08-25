/**
 * Projects State Management Context
 * Manages projects data and operations with consistent patterns
 */

'use client'

import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'
import {
  createEntityReducer,
  createInitialEntityState,
  createEntityActions,
  apiClient,
  QueryBuilder,
  type EntityActions,
  type StateAction,
} from '@/lib/state-manager'
import type {
  Project,
  ProjectFormData,
  ProjectFilters,
  EntityState,
  ApiResponse,
  ProjectStats,
  PaginationParams,
} from '@/types'

// ==================== Extended Actions ====================

type ProjectAction =
  | StateAction<Project>
  | { type: 'SET_PROJECT_STATS'; payload: { id: string; stats: ProjectStats } }

// ==================== Extended State ====================

interface ProjectState extends EntityState<Project> {
  filters: ProjectFilters
}

// ==================== Extended Reducer ====================

const projectReducer = (state: ProjectState, action: ProjectAction): ProjectState => {
  if (action.type === 'SET_PROJECT_STATS') {
    return {
      ...state,
      entities: state.entities.map(project =>
        project.id === action.payload.id ? { ...project, stats: action.payload.stats } : project
      ),
      lastUpdated: new Date(),
    }
  }

  return createEntityReducer<Project>()(state, action as StateAction<Project>)
}

// ==================== Extended Actions Interface ====================

interface ProjectActions extends EntityActions<Project> {
  // CRUD Operations
  fetchProjects: (params?: PaginationParams & ProjectFilters) => Promise<void>
  createProject: (data: ProjectFormData) => Promise<Project>
  updateProject: (id: string, data: Partial<ProjectFormData>) => Promise<Project>
  deleteProject: (id: string) => Promise<void>

  // Statistics
  fetchProjectStats: (id: string) => Promise<ProjectStats>
  refreshProjectStats: (id: string) => Promise<void>

  // Filtering
  applyFilters: (filters: ProjectFilters) => void
  clearFilters: () => void

  // Utilities
  getProjectHealth: (project: Project) => number
  getOverBudgetProjects: () => Project[]
  getActiveProjects: () => Project[]
  getProjectsByStatus: (status: Project['status']) => Project[]
}

// ==================== Context Definition ====================

interface ProjectContextType {
  state: ProjectState
  actions: ProjectActions
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

// ==================== Provider Component ====================

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, {
    ...createInitialEntityState<Project>(),
    filters: {},
  })

  // Base entity actions
  const baseActions = createEntityActions<Project>(dispatch, state)

  // Extended project actions
  const actions: ProjectActions = {
    ...baseActions,

    // CRUD Operations
    fetchProjects: async (params = {}) => {
      const query = QueryBuilder.create()
        .paginate(params.page || 1, params.limit || 20)
        .where('status', params.status)
        .where('currency', params.currency)
        .range('totalBudget', params.budgetRange?.min, params.budgetRange?.max)
        .dateRange('startDate', params.dateRange?.start, params.dateRange?.end)
        .where('userId', params.userId)
        .sort(params.sortBy || 'updatedAt', params.sortOrder || 'desc')
        .search(params.search || '')
        .build()

      return baseActions.withLoadingState(async () => {
        const response = await apiClient.get<Project[]>(
          `/projects${query}`,
          `projects${query}`,
          2 * 60 * 1000 // 2 minute cache
        )

        if (response.success && response.data) {
          dispatch({ type: 'SET_ENTITIES', payload: response.data })

          // Update pagination if available
          const paginatedResponse = response as any
          if (paginatedResponse.pagination) {
            dispatch({
              type: 'SET_PAGINATION',
              payload: paginatedResponse.pagination,
            })
          }
        } else {
          dispatch({
            type: 'SET_ERROR',
            payload: (response.error as string) || 'Failed to fetch projects',
          })
        }
      })
    },

    createProject: async (data: ProjectFormData): Promise<Project> => {
      const response = await apiClient.post<Project>('/projects', data)

      if (response.success && response.data) {
        dispatch({ type: 'ADD_ENTITY', payload: response.data })
        // Clear cache to ensure fresh data on next fetch
        apiClient.clearCache()
        return response.data
      } else {
        const error = (response.error as string) || 'Failed to create project'
        dispatch({ type: 'SET_ERROR', payload: error })
        throw new Error(error)
      }
    },

    updateProject: async (id: string, data: Partial<ProjectFormData>): Promise<Project> => {
      const response = await apiClient.put<Project>(`/projects/${id}`, data)

      if (response.success && response.data) {
        dispatch({
          type: 'UPDATE_ENTITY',
          payload: { id, updates: response.data },
        })
        // Clear cache to ensure fresh data
        apiClient.clearCache()
        return response.data
      } else {
        const error = (response.error as string) || 'Failed to update project'
        dispatch({ type: 'SET_ERROR', payload: error })
        throw new Error(error)
      }
    },

    deleteProject: async (id: string): Promise<void> => {
      const response = await apiClient.delete(`/projects/${id}`)

      if (response.success) {
        dispatch({ type: 'REMOVE_ENTITY', payload: id })
        // Clear cache to ensure fresh data
        apiClient.clearCache()
      } else {
        const error = (response.error as string) || 'Failed to delete project'
        dispatch({ type: 'SET_ERROR', payload: error })
        throw new Error(error)
      }
    },

    // Statistics
    fetchProjectStats: async (id: string): Promise<ProjectStats> => {
      const response = await apiClient.get<ProjectStats>(
        `/projects/${id}/stats`,
        `project-stats-${id}`,
        1 * 60 * 1000 // 1 minute cache for stats
      )

      if (response.success && response.data) {
        dispatch({
          type: 'SET_PROJECT_STATS',
          payload: { id, stats: response.data },
        })
        return response.data
      } else {
        const error = (response.error as string) || 'Failed to fetch project stats'
        dispatch({ type: 'SET_ERROR', payload: error })
        throw new Error(error)
      }
    },

    refreshProjectStats: async (id: string): Promise<void> => {
      // Clear cache and fetch fresh stats
      apiClient.clearCache(`project-stats-${id}`)
      await actions.fetchProjectStats(id)
    },

    // Filtering
    applyFilters: (filters: ProjectFilters) => {
      dispatch({ type: 'SET_FILTERS', payload: filters })
      // Automatically fetch with new filters
      actions.fetchProjects({ ...filters, page: 1 })
    },

    clearFilters: () => {
      dispatch({ type: 'SET_FILTERS', payload: {} })
      actions.fetchProjects({ page: 1 })
    },

    // Utilities
    getProjectHealth: (project: Project): number => {
      const { stats } = project
      let healthScore = 100

      // Handle missing or incomplete stats for newly created projects
      if (!stats) return healthScore

      // Budget health (40% weight)
      if (stats.isOverBudget) {
        healthScore -= 40
      } else if (stats.budgetUsedPercent > 85) {
        healthScore -= 20
      } else if (stats.budgetUsedPercent > 70) {
        healthScore -= 10
      }

      // Timeline health (30% weight)
      if (project.status === 'ON_HOLD') {
        healthScore -= 30
      } else if (project.status === 'CANCELLED') {
        healthScore = 0
      }

      // Milestone completion (30% weight)
      const totalMilestones = stats.totalMilestones || 0
      const completedMilestones = stats.completedMilestones || 0
      const milestoneCompletionRate =
        totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 100

      if (milestoneCompletionRate < 50) {
        healthScore -= 20
      } else if (milestoneCompletionRate < 75) {
        healthScore -= 10
      }

      return Math.max(0, healthScore)
    },

    getOverBudgetProjects: (): Project[] => {
      return state.entities.filter(project => project.stats?.isOverBudget === true)
    },

    getActiveProjects: (): Project[] => {
      return state.entities.filter(
        project => project.status === 'IN_PROGRESS' || project.status === 'PLANNING'
      )
    },

    getProjectsByStatus: (status: Project['status']): Project[] => {
      return state.entities.filter(project => project.status === status)
    },
  }

  // Auto-fetch projects on mount
  useEffect(() => {
    if (state.entities.length === 0 && !state.isLoading) {
      actions.fetchProjects()
    }
  }, [])

  const contextValue: ProjectContextType = {
    state,
    actions,
  }

  return <ProjectContext.Provider value={contextValue}>{children}</ProjectContext.Provider>
}

// ==================== Hook ====================

export function useProjects() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjects must be used within a ProjectsProvider')
  }
  return context
}

// ==================== Selectors ====================

export const projectSelectors = {
  // Get all projects
  getAll: (state: ProjectState) => state.entities,

  // Get projects by status
  getByStatus: (state: ProjectState, status: Project['status']) =>
    state.entities.filter(p => p.status === status),

  // Get project by ID
  getById: (state: ProjectState, id: string) => state.entities.find(p => p.id === id),

  // Get selected project
  getSelected: (state: ProjectState) =>
    state.selectedId ? state.entities.find(p => p.id === state.selectedId) : null,

  // Get loading state
  getLoadingState: (state: ProjectState) => ({
    isLoading: state.isLoading,
    error: state.error,
  }),

  // Get filtered projects
  getFiltered: (state: ProjectState) => {
    let projects = state.entities
    const { filters } = state

    if (filters.status?.length) {
      projects = projects.filter(p => filters.status!.includes(p.status))
    }

    if (filters.currency?.length) {
      projects = projects.filter(p => filters.currency!.includes(p.currency as any))
    }

    if (filters.budgetRange) {
      const { min, max } = filters.budgetRange
      projects = projects.filter(p => {
        const budget = Number(p.totalBudget)
        return (!min || budget >= min) && (!max || budget <= max)
      })
    }

    if (filters.userId) {
      // Would need to check project users - simplified for now
      projects = projects.filter(p => true) // TODO: Implement user filtering
    }

    return projects
  },

  // Get summary statistics
  getSummary: (state: ProjectState) => {
    const projects = state.entities
    const total = projects.length
    const active = projects.filter(
      p => p.status === 'IN_PROGRESS' || p.status === 'PLANNING'
    ).length
    const completed = projects.filter(p => p.status === 'COMPLETED').length
    const overBudget = projects.filter(p => p.stats?.isOverBudget).length

    const totalValue = projects.reduce((sum, p) => sum + Number(p.totalBudget), 0)
    const avgBudget = total > 0 ? totalValue / total : 0

    return {
      total,
      active,
      completed,
      overBudget,
      totalValue,
      avgBudget,
      onTime: total - overBudget, // Simplified
    }
  },
}

// ==================== Export Default ====================

export default ProjectsProvider
