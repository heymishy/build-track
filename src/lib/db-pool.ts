/**
 * Database Connection Pooling
 * Optimized database connections with connection pooling and monitoring
 */

import { PrismaClient } from '@prisma/client'

interface PoolConfig {
  maxConnections: number
  minConnections: number
  acquireTimeoutMs: number
  createTimeoutMs: number
  destroyTimeoutMs: number
  idleTimeoutMs: number
  reapIntervalMs: number
  createRetryIntervalMs: number
  propagateCreateError: boolean
  log: string[]
}

interface PoolMetrics {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  pendingAcquires: number
  pendingCreates: number
  acquiredConnections: number
  releasedConnections: number
  createdConnections: number
  destroyedConnections: number
  failedAcquires: number
  timedOutAcquires: number
  averageAcquireTime: number
  averageCreateTime: number
}

class DatabasePool {
  private prisma: PrismaClient | null = null
  private config: PoolConfig
  private metrics: PoolMetrics
  private healthCheckInterval: NodeJS.Timeout | null = null
  private isShuttingDown: boolean = false

  constructor(config?: Partial<PoolConfig>) {
    this.config = {
      maxConnections: parseInt(process.env.DB_POOL_MAX || '10'),
      minConnections: parseInt(process.env.DB_POOL_MIN || '2'),
      acquireTimeoutMs: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '10000'),
      createTimeoutMs: parseInt(process.env.DB_CREATE_TIMEOUT || '5000'),
      destroyTimeoutMs: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000'),
      idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'), // 5 minutes
      reapIntervalMs: parseInt(process.env.DB_REAP_INTERVAL || '60000'), // 1 minute
      createRetryIntervalMs: parseInt(process.env.DB_RETRY_INTERVAL || '1000'),
      propagateCreateError: true,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      ...config,
    }

    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      pendingAcquires: 0,
      pendingCreates: 0,
      acquiredConnections: 0,
      releasedConnections: 0,
      createdConnections: 0,
      destroyedConnections: 0,
      failedAcquires: 0,
      timedOutAcquires: 0,
      averageAcquireTime: 0,
      averageCreateTime: 0,
    }

    this.initializePool()
  }

  private initializePool(): void {
    try {
      // Configure Prisma with connection pooling
      this.prisma = new PrismaClient({
        log: this.config.log as any[],
        datasources: {
          db: {
            url: this.buildConnectionUrl(),
          },
        },
      })

      // Add connection event listeners
      this.setupEventListeners()

      // Start health check interval
      this.startHealthCheck()

      console.log('[DB Pool] Database pool initialized with config:', {
        maxConnections: this.config.maxConnections,
        minConnections: this.config.minConnections,
        acquireTimeout: this.config.acquireTimeoutMs,
        idleTimeout: this.config.idleTimeoutMs,
      })
    } catch (error) {
      console.error('[DB Pool] Failed to initialize database pool:', error)
      throw error
    }
  }

  private buildConnectionUrl(): string {
    const baseUrl = process.env.DATABASE_URL || 'file:./dev.db'

    // For PostgreSQL, add connection pool parameters
    if (baseUrl.startsWith('postgresql://') || baseUrl.startsWith('postgres://')) {
      const url = new URL(baseUrl)

      // Add connection pool parameters
      url.searchParams.set('connection_limit', this.config.maxConnections.toString())
      url.searchParams.set(
        'pool_timeout',
        Math.floor(this.config.acquireTimeoutMs / 1000).toString()
      )
      url.searchParams.set(
        'connect_timeout',
        Math.floor(this.config.createTimeoutMs / 1000).toString()
      )

      // Performance optimizations
      url.searchParams.set('statement_cache_size', '100')
      url.searchParams.set('prepared_statement_cache_size', '100')

      return url.toString()
    }

    return baseUrl
  }

  private setupEventListeners(): void {
    if (!this.prisma) return

    // Monitor query performance
    this.prisma.$use(async (params, next) => {
      const startTime = Date.now()

      try {
        const result = await next(params)
        const duration = Date.now() - startTime

        // Log slow queries
        if (duration > 1000) {
          console.warn(`[DB Pool] Slow query detected (${duration}ms):`, {
            model: params.model,
            action: params.action,
            duration,
          })
        }

        // Update metrics
        this.metrics.acquiredConnections++
        this.updateAverageAcquireTime(duration)

        return result
      } catch (error) {
        this.metrics.failedAcquires++
        console.error('[DB Pool] Query failed:', {
          model: params.model,
          action: params.action,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    })
  }

  private updateAverageAcquireTime(duration: number): void {
    const totalAcquires = this.metrics.acquiredConnections
    if (totalAcquires === 1) {
      this.metrics.averageAcquireTime = duration
    } else {
      this.metrics.averageAcquireTime =
        (this.metrics.averageAcquireTime * (totalAcquires - 1) + duration) / totalAcquires
    }
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (this.isShuttingDown) return

      try {
        await this.healthCheck()
      } catch (error) {
        console.error('[DB Pool] Health check failed:', error)
      }
    }, this.config.reapIntervalMs)
  }

  async getClient(): Promise<PrismaClient> {
    if (!this.prisma) {
      throw new Error('Database pool not initialized')
    }

    if (this.isShuttingDown) {
      throw new Error('Database pool is shutting down')
    }

    return this.prisma
  }

  async healthCheck(): Promise<{
    healthy: boolean
    latency: number
    metrics: PoolMetrics
  }> {
    if (!this.prisma) {
      return {
        healthy: false,
        latency: -1,
        metrics: this.metrics,
      }
    }

    const startTime = Date.now()

    try {
      await this.prisma.$queryRaw`SELECT 1`
      const latency = Date.now() - startTime

      return {
        healthy: true,
        latency,
        metrics: this.getMetrics(),
      }
    } catch (error) {
      console.error('[DB Pool] Health check query failed:', error)
      return {
        healthy: false,
        latency: Date.now() - startTime,
        metrics: this.metrics,
      }
    }
  }

  getMetrics(): PoolMetrics {
    return { ...this.metrics }
  }

  async executeTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    const client = await this.getClient()
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await client.$transaction(fn, {
          maxWait: this.config.acquireTimeoutMs,
          timeout: this.config.createTimeoutMs,
          isolationLevel: 'ReadCommitted',
        })
      } catch (error) {
        lastError = error as Error

        // Don't retry on certain errors
        if (
          error instanceof Error &&
          (error.message.includes('Unique constraint') ||
            error.message.includes('Foreign key constraint') ||
            error.message.includes('Check constraint'))
        ) {
          throw error
        }

        if (attempt === maxRetries) {
          break
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))

        console.warn(`[DB Pool] Transaction attempt ${attempt} failed, retrying in ${delay}ms:`, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    throw lastError || new Error('Transaction failed after maximum retries')
  }

  async executeQuery<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
    maxRetries: number = 2
  ): Promise<T> {
    const client = await this.getClient()
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(client)
      } catch (error) {
        lastError = error as Error

        // Don't retry on validation errors
        if (
          error instanceof Error &&
          (error.message.includes('Invalid') ||
            error.message.includes('validation') ||
            error.message.includes('required'))
        ) {
          throw error
        }

        if (attempt === maxRetries) {
          break
        }

        // Linear backoff for queries
        const delay = 500 * attempt
        await new Promise(resolve => setTimeout(resolve, delay))

        console.warn(`[DB Pool] Query attempt ${attempt} failed, retrying in ${delay}ms:`, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    throw lastError || new Error('Query failed after maximum retries')
  }

  async warmUp(): Promise<void> {
    console.log('[DB Pool] Warming up connection pool...')

    try {
      const client = await this.getClient()

      // Execute a few simple queries to establish connections
      const warmupQueries = [
        () => client.$queryRaw`SELECT 1`,
        () => client.user.findMany({ take: 1 }),
        () => client.project.findMany({ take: 1 }),
      ]

      await Promise.all(
        warmupQueries.map(query =>
          query().catch(error => {
            console.warn('[DB Pool] Warmup query failed:', error)
          })
        )
      )

      console.log('[DB Pool] Connection pool warmed up successfully')
    } catch (error) {
      console.error('[DB Pool] Failed to warm up connection pool:', error)
    }
  }

  async gracefulShutdown(): Promise<void> {
    console.log('[DB Pool] Starting graceful shutdown...')
    this.isShuttingDown = true

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    // Wait for active connections to complete
    const shutdownTimeout = setTimeout(() => {
      console.warn('[DB Pool] Shutdown timeout reached, forcing close')
    }, 30000) // 30 second timeout

    try {
      if (this.prisma) {
        await this.prisma.$disconnect()
        this.prisma = null
      }

      clearTimeout(shutdownTimeout)
      console.log('[DB Pool] Graceful shutdown completed')
    } catch (error) {
      console.error('[DB Pool] Error during shutdown:', error)
      clearTimeout(shutdownTimeout)
    }
  }

  isHealthy(): boolean {
    return this.prisma !== null && !this.isShuttingDown
  }

  getConnectionInfo(): {
    maxConnections: number
    currentConnections: number
    healthy: boolean
  } {
    return {
      maxConnections: this.config.maxConnections,
      currentConnections: this.metrics.totalConnections,
      healthy: this.isHealthy(),
    }
  }
}

// Singleton instance
let poolInstance: DatabasePool | null = null

export function getDatabasePool(): DatabasePool {
  if (!poolInstance) {
    poolInstance = new DatabasePool()
  }
  return poolInstance
}

export async function getDatabase(): Promise<PrismaClient> {
  const pool = getDatabasePool()
  return pool.getClient()
}

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  const gracefulShutdown = async (signal: string) => {
    console.log(`[DB Pool] Received ${signal}, initiating graceful shutdown...`)

    if (poolInstance) {
      await poolInstance.gracefulShutdown()
    }

    process.exit(0)
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[DB Pool] Unhandled promise rejection:', reason)
    if (poolInstance) {
      poolInstance.gracefulShutdown().finally(() => {
        process.exit(1)
      })
    } else {
      process.exit(1)
    }
  })
}

export { DatabasePool }
export type { PoolConfig, PoolMetrics }
export default getDatabasePool
