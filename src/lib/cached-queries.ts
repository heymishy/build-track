/**
 * Cached Database Queries
 * High-performance queries with intelligent caching strategies
 */

import { PrismaClient } from '@prisma/client'
import { getCache, getCacheHelpers, CacheKey } from './cache'

const cache = getCache()
const helpers = getCacheHelpers()

// Cache TTL constants (in seconds)
const CACHE_TIMES = {
  USER_SESSION: 900,      // 15 minutes
  PROJECT_LIST: 300,      // 5 minutes
  PROJECT_DETAIL: 600,    // 10 minutes
  TRADES_LIST: 1800,      // 30 minutes
  LINE_ITEMS: 1800,       // 30 minutes
  INVOICES: 300,          // 5 minutes
  MILESTONES: 900,        // 15 minutes
  ANALYTICS: 1800,        // 30 minutes
  DOCUMENTS: 3600,        // 1 hour
  SETTINGS: 3600,         // 1 hour
  STATIC_DATA: 7200       // 2 hours
} as const

export interface CachedQueryOptions {
  forceRefresh?: boolean
  ttl?: number
  tags?: string[]
}

export class CachedQueries {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  // User queries
  async getUserById(userId: string, options: CachedQueryOptions = {}) {
    const key: CacheKey = {
      prefix: 'user',
      identifier: userId,
      version: 'v1'
    }

    if (options.forceRefresh) {
      await cache.delete(key)
    }

    return helpers.wrap(key, async () => {
      return this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          settings: true,
          projects: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              }
            }
          }
        }
      })
    }, options.ttl || CACHE_TIMES.USER_SESSION)
  }

  async getUserByEmail(email: string, options: CachedQueryOptions = {}) {
    const key: CacheKey = {
      prefix: 'user_email',
      identifier: email,
      version: 'v1'
    }

    if (options.forceRefresh) {
      await cache.delete(key)
    }

    return helpers.wrap(key, async () => {
      return this.prisma.user.findUnique({
        where: { email },
        include: {
          settings: true
        }
      })
    }, options.ttl || CACHE_TIMES.USER_SESSION)
  }

  // Project queries
  async getProjectsByUserId(userId: string, options: CachedQueryOptions = {}) {
    const key: CacheKey = {
      prefix: 'projects_user',
      identifier: userId,
      version: 'v1'
    }

    if (options.forceRefresh) {
      await cache.delete(key)
    }

    return helpers.wrap(key, async () => {
      return this.prisma.project.findMany({
        where: {
          users: {
            some: {
              userId: userId
            }
          }
        },
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          _count: {
            select: {
              trades: true,
              milestones: true,
              invoices: true,
              documents: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })
    }, options.ttl || CACHE_TIMES.PROJECT_LIST)
  }

  async getProjectById(projectId: string, options: CachedQueryOptions = {}) {
    const key: CacheKey = {
      prefix: 'project',
      identifier: projectId,
      version: 'v1'
    }

    if (options.forceRefresh) {
      await cache.delete(key)
    }

    return helpers.wrap(key, async () => {
      return this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          },
          trades: {
            include: {
              lineItems: true,
              _count: {
                select: {
                  lineItems: true
                }
              }
            },
            orderBy: {
              sortOrder: 'asc'
            }
          },
          milestones: {
            orderBy: {
              sortOrder: 'asc'
            }
          },
          invoices: {
            include: {
              lineItems: {
                include: {
                  lineItem: true
                }
              }
            },
            orderBy: {
              invoiceDate: 'desc'
            }
          },
          _count: {
            select: {
              trades: true,
              milestones: true,
              invoices: true,
              documents: true
            }
          }
        }
      })
    }, options.ttl || CACHE_TIMES.PROJECT_DETAIL)
  }

  // Trade and LineItem queries
  async getTradesByProjectId(projectId: string, options: CachedQueryOptions = {}) {
    const key: CacheKey = {
      prefix: 'trades_project',
      identifier: projectId,
      version: 'v1'
    }

    if (options.forceRefresh) {
      await cache.delete(key)
    }

    return helpers.wrap(key, async () => {
      return this.prisma.trade.findMany({
        where: { projectId },
        include: {
          lineItems: {
            orderBy: {
              sortOrder: 'asc'
            }
          }
        },
        orderBy: {
          sortOrder: 'asc'
        }
      })
    }, options.ttl || CACHE_TIMES.TRADES_LIST)
  }

  async getLineItemsByTradeId(tradeId: string, options: CachedQueryOptions = {}) {
    const key: CacheKey = {
      prefix: 'line_items_trade',
      identifier: tradeId,
      version: 'v1'
    }

    if (options.forceRefresh) {
      await cache.delete(key)
    }

    return helpers.wrap(key, async () => {
      return this.prisma.lineItem.findMany({
        where: { tradeId },
        include: {
          trade: {
            select: {
              id: true,
              name: true,
              projectId: true
            }
          },
          invoiceItems: {
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  supplierName: true,
                  invoiceDate: true
                }
              }
            }
          }
        },
        orderBy: {
          sortOrder: 'asc'
        }
      })
    }, options.ttl || CACHE_TIMES.LINE_ITEMS)
  }

  // Invoice queries
  async getInvoicesByProjectId(projectId: string, options: CachedQueryOptions = {}) {
    const key: CacheKey = {
      prefix: 'invoices_project',
      identifier: projectId,
      version: 'v1'
    }

    if (options.forceRefresh) {
      await cache.delete(key)
    }

    return helpers.wrap(key, async () => {
      return this.prisma.invoice.findMany({
        where: { projectId },
        include: {
          lineItems: {
            include: {
              lineItem: {
                select: {
                  id: true,
                  description: true,
                  trade: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          invoiceDate: 'desc'
        }
      })
    }, options.ttl || CACHE_TIMES.INVOICES)
  }

  // Milestone queries
  async getMilestonesByProjectId(projectId: string, options: CachedQueryOptions = {}) {
    const key: CacheKey = {
      prefix: 'milestones_project',
      identifier: projectId,
      version: 'v1'
    }

    if (options.forceRefresh) {
      await cache.delete(key)
    }

    return helpers.wrap(key, async () => {
      return this.prisma.milestone.findMany({
        where: { projectId },
        orderBy: {
          sortOrder: 'asc'
        }
      })
    }, options.ttl || CACHE_TIMES.MILESTONES)
  }

  // Analytics queries (expensive computations)
  async getProjectAnalytics(projectId: string, options: CachedQueryOptions = {}) {
    const key: CacheKey = {
      prefix: 'analytics_project',
      identifier: projectId,
      version: 'v1'
    }

    if (options.forceRefresh) {
      await cache.delete(key)
    }

    return helpers.wrap(key, async () => {
      // Get all related data for analytics
      const [project, trades, invoices, milestones] = await Promise.all([
        this.prisma.project.findUnique({
          where: { id: projectId }
        }),
        this.prisma.trade.findMany({
          where: { projectId },
          include: {
            lineItems: true
          }
        }),
        this.prisma.invoice.findMany({
          where: { projectId },
          include: {
            lineItems: true
          }
        }),
        this.prisma.milestone.findMany({
          where: { projectId }
        })
      ])

      // Calculate analytics
      const totalBudget = project?.totalBudget || 0
      const totalSpent = invoices.reduce((sum, invoice) => 
        sum + Number(invoice.totalAmount), 0)
      
      const totalEstimate = trades.reduce((sum, trade) =>
        sum + trade.lineItems.reduce((tradeSum, item) =>
          tradeSum + Number(item.materialCostEst) + 
          Number(item.laborCostEst) + 
          Number(item.equipmentCostEst), 0), 0)
      
      const completedMilestones = milestones.filter(m => 
        m.status === 'COMPLETED').length
      
      const progressPercentage = milestones.length > 0 
        ? (completedMilestones / milestones.length) * 100 
        : 0

      return {
        projectId,
        totalBudget,
        totalSpent,
        totalEstimate,
        remainingBudget: totalBudget - totalSpent,
        budgetUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
        totalInvoices: invoices.length,
        completedMilestones,
        totalMilestones: milestones.length,
        progressPercentage,
        lastUpdated: new Date().toISOString()
      }
    }, options.ttl || CACHE_TIMES.ANALYTICS)
  }

  // Document queries
  async getDocumentsByProjectId(projectId: string, options: CachedQueryOptions = {}) {
    const key: CacheKey = {
      prefix: 'documents_project',
      identifier: projectId,
      version: 'v1'
    }

    if (options.forceRefresh) {
      await cache.delete(key)
    }

    return helpers.wrap(key, async () => {
      return this.prisma.projectDocument.findMany({
        where: { projectId },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    }, options.ttl || CACHE_TIMES.DOCUMENTS)
  }

  // Settings queries
  async getUserSettings(userId: string, options: CachedQueryOptions = {}) {
    const key: CacheKey = {
      prefix: 'settings_user',
      identifier: userId,
      version: 'v1'
    }

    if (options.forceRefresh) {
      await cache.delete(key)
    }

    return helpers.wrap(key, async () => {
      return this.prisma.userSettings.findMany({
        where: { userId }
      })
    }, options.ttl || CACHE_TIMES.SETTINGS)
  }

  // Cache invalidation methods
  async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      cache.delete({ prefix: 'user', identifier: userId, version: 'v1' }),
      cache.delete({ prefix: 'projects_user', identifier: userId, version: 'v1' }),
      cache.delete({ prefix: 'settings_user', identifier: userId, version: 'v1' })
    ])
  }

  async invalidateProjectCache(projectId: string): Promise<void> {
    await Promise.all([
      cache.delete({ prefix: 'project', identifier: projectId, version: 'v1' }),
      cache.delete({ prefix: 'trades_project', identifier: projectId, version: 'v1' }),
      cache.delete({ prefix: 'invoices_project', identifier: projectId, version: 'v1' }),
      cache.delete({ prefix: 'milestones_project', identifier: projectId, version: 'v1' }),
      cache.delete({ prefix: 'analytics_project', identifier: projectId, version: 'v1' }),
      cache.delete({ prefix: 'documents_project', identifier: projectId, version: 'v1' })
    ])
  }

  async invalidateTradeCache(tradeId: string): Promise<void> {
    await cache.delete({ prefix: 'line_items_trade', identifier: tradeId, version: 'v1' })
  }

  // Bulk invalidation by patterns
  async invalidateAllUserCaches(): Promise<number> {
    return cache.deleteByPattern('buildtrack:user*')
  }

  async invalidateAllProjectCaches(): Promise<number> {
    return cache.deleteByPattern('buildtrack:project*') + 
           cache.deleteByPattern('buildtrack:trades_project*') +
           cache.deleteByPattern('buildtrack:invoices_project*') +
           cache.deleteByPattern('buildtrack:milestones_project*') +
           cache.deleteByPattern('buildtrack:analytics_project*') +
           cache.deleteByPattern('buildtrack:documents_project*')
  }

  // Cache warming (preload frequently accessed data)
  async warmCache(userId: string, projectIds: string[] = []): Promise<void> {
    console.log('[Cache] Warming cache for user:', userId)
    
    // Warm user data
    await Promise.all([
      this.getUserById(userId),
      this.getProjectsByUserId(userId),
      this.getUserSettings(userId)
    ])

    // Warm project data if specific projects provided
    if (projectIds.length > 0) {
      await Promise.all(
        projectIds.map(async (projectId) => {
          await Promise.all([
            this.getProjectById(projectId),
            this.getTradesByProjectId(projectId),
            this.getInvoicesByProjectId(projectId),
            this.getMilestonesByProjectId(projectId),
            this.getProjectAnalytics(projectId),
            this.getDocumentsByProjectId(projectId)
          ])
        })
      )
    }

    console.log('[Cache] Cache warming completed')
  }

  // Health check
  async healthCheck(): Promise<{
    connected: boolean
    metrics: any
    latency: number
  }> {
    const startTime = Date.now()
    const connected = cache.isConnected()
    const metrics = cache.getMetrics()
    const latency = Date.now() - startTime

    return {
      connected,
      metrics,
      latency
    }
  }
}

// Singleton instance
let cachedQueriesInstance: CachedQueries | null = null

export function getCachedQueries(prisma: PrismaClient): CachedQueries {
  if (!cachedQueriesInstance) {
    cachedQueriesInstance = new CachedQueries(prisma)
  }
  return cachedQueriesInstance
}

export default getCachedQueries