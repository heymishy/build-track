/**
 * Monitoring and Alerting System
 * Production monitoring, error tracking, and performance metrics
 */

import { NextRequest } from 'next/server'

export interface MetricData {
  name: string
  value: number
  unit?: string
  timestamp: number
  tags?: Record<string, string>
  metadata?: Record<string, any>
}

export interface AlertConfig {
  name: string
  condition: (metrics: MetricData[]) => boolean
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  cooldownMs: number
  channels: ('slack' | 'email' | 'webhook')[]
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  timestamp: number
  components: {
    database: ComponentHealth
    cache: ComponentHealth
    storage: ComponentHealth
    external: ComponentHealth
  }
  metrics: {
    responseTime: number
    errorRate: number
    throughput: number
    memoryUsage: number
    cpuUsage: number
  }
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency?: number
  errorRate?: number
  lastChecked: number
  details?: string
}

class MonitoringService {
  private metrics: MetricData[] = []
  private alerts: Map<string, number> = new Map() // Alert cooldowns
  private startTime = Date.now()

  // Record performance metrics
  recordMetric(data: Omit<MetricData, 'timestamp'>): void {
    const metric: MetricData = {
      ...data,
      timestamp: Date.now()
    }
    
    this.metrics.push(metric)
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
    
    // Check alerts
    this.checkAlerts()
  }

  // Get metrics for a specific time range
  getMetrics(
    name?: string, 
    fromTimestamp?: number, 
    toTimestamp?: number
  ): MetricData[] {
    let filtered = this.metrics

    if (name) {
      filtered = filtered.filter(m => m.name === name)
    }

    if (fromTimestamp) {
      filtered = filtered.filter(m => m.timestamp >= fromTimestamp)
    }

    if (toTimestamp) {
      filtered = filtered.filter(m => m.timestamp <= toTimestamp)
    }

    return filtered
  }

  // Calculate aggregate metrics
  getAggregateMetrics(name: string, windowMs: number = 300000): {
    avg: number
    min: number
    max: number
    count: number
    sum: number
  } {
    const cutoff = Date.now() - windowMs
    const metrics = this.metrics.filter(
      m => m.name === name && m.timestamp > cutoff
    )

    if (metrics.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0, sum: 0 }
    }

    const values = metrics.map(m => m.value)
    const sum = values.reduce((a, b) => a + b, 0)

    return {
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
      sum
    }
  }

  // Health check for all system components
  async checkSystemHealth(): Promise<SystemHealth> {
    const [database, cache, storage, external] = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkCacheHealth(),
      this.checkStorageHealth(),
      this.checkExternalHealth()
    ])

    const getComponentStatus = (result: PromiseSettledResult<ComponentHealth>): ComponentHealth => {
      if (result.status === 'fulfilled') {
        return result.value
      }
      return {
        status: 'unhealthy',
        lastChecked: Date.now(),
        details: result.reason?.message || 'Health check failed'
      }
    }

    const components = {
      database: getComponentStatus(database),
      cache: getComponentStatus(cache),
      storage: getComponentStatus(storage),
      external: getComponentStatus(external)
    }

    // Calculate overall system status
    const componentStatuses = Object.values(components).map(c => c.status)
    const systemStatus = componentStatuses.includes('unhealthy') 
      ? 'unhealthy'
      : componentStatuses.includes('degraded')
      ? 'degraded'
      : 'healthy'

    // Get recent metrics
    const recentMetrics = this.getAggregateMetrics('response_time', 60000)
    const errorMetrics = this.getAggregateMetrics('error_rate', 60000)
    const throughputMetrics = this.getAggregateMetrics('throughput', 60000)

    return {
      status: systemStatus,
      uptime: Date.now() - this.startTime,
      timestamp: Date.now(),
      components,
      metrics: {
        responseTime: recentMetrics.avg,
        errorRate: errorMetrics.avg,
        throughput: throughputMetrics.avg,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        cpuUsage: process.cpuUsage().user / 1000000 // seconds
      }
    }
  }

  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    try {
      const startTime = Date.now()
      
      // Import and check database connection
      const { getDatabase } = await import('./db-pool')
      const db = await getDatabase()
      
      // Simple query to test connection
      await db.$queryRaw`SELECT 1`
      
      const latency = Date.now() - startTime
      
      return {
        status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
        latency,
        errorRate: 0,
        lastChecked: Date.now()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastChecked: Date.now(),
        details: error instanceof Error ? error.message : 'Database connection failed'
      }
    }
  }

  private async checkCacheHealth(): Promise<ComponentHealth> {
    try {
      const startTime = Date.now()
      
      // Import and check cache connection
      const { getCache } = await import('./cache')
      const cache = getCache()
      
      // Test cache operations
      const testKey = { prefix: 'health', identifier: 'test', version: 'v1' }
      await cache.set(testKey, 'test', 10)
      const result = await cache.get(testKey)
      await cache.delete(testKey)
      
      const latency = Date.now() - startTime
      const isWorking = result === 'test'
      
      return {
        status: isWorking && latency < 50 ? 'healthy' : 
                isWorking && latency < 200 ? 'degraded' : 'unhealthy',
        latency,
        errorRate: isWorking ? 0 : 100,
        lastChecked: Date.now()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastChecked: Date.now(),
        details: error instanceof Error ? error.message : 'Cache connection failed'
      }
    }
  }

  private async checkStorageHealth(): Promise<ComponentHealth> {
    try {
      const startTime = Date.now()
      
      // For now, just check if the storage environment variables are set
      const hasStorageConfig = Boolean(process.env.BLOB_READ_WRITE_TOKEN)
      
      const latency = Date.now() - startTime
      
      return {
        status: hasStorageConfig ? 'healthy' : 'degraded',
        latency,
        lastChecked: Date.now(),
        details: hasStorageConfig ? 'Storage configured' : 'Storage configuration missing'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastChecked: Date.now(),
        details: error instanceof Error ? error.message : 'Storage check failed'
      }
    }
  }

  private async checkExternalHealth(): Promise<ComponentHealth> {
    try {
      // Check if external APIs are configured
      const hasLLMConfig = Boolean(
        process.env.ANTHROPIC_API_KEY || 
        process.env.OPENAI_API_KEY || 
        process.env.GEMINI_API_KEY
      )
      
      return {
        status: hasLLMConfig ? 'healthy' : 'degraded',
        lastChecked: Date.now(),
        details: hasLLMConfig ? 'External APIs configured' : 'External API configuration incomplete'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastChecked: Date.now(),
        details: error instanceof Error ? error.message : 'External service check failed'
      }
    }
  }

  private checkAlerts(): void {
    const alertConfigs: AlertConfig[] = [
      {
        name: 'high_response_time',
        condition: (metrics) => {
          const recent = metrics.filter(m => 
            m.name === 'response_time' && 
            m.timestamp > Date.now() - 60000
          )
          const avg = recent.length > 0 ? 
            recent.reduce((sum, m) => sum + m.value, 0) / recent.length : 0
          return avg > 1000 // Alert if avg response time > 1s
        },
        threshold: 1000,
        severity: 'medium',
        cooldownMs: 300000, // 5 minutes
        channels: ['slack', 'email']
      },
      {
        name: 'high_error_rate',
        condition: (metrics) => {
          const recent = metrics.filter(m => 
            m.name === 'error_rate' && 
            m.timestamp > Date.now() - 60000
          )
          const avg = recent.length > 0 ? 
            recent.reduce((sum, m) => sum + m.value, 0) / recent.length : 0
          return avg > 5 // Alert if error rate > 5%
        },
        threshold: 5,
        severity: 'high',
        cooldownMs: 180000, // 3 minutes
        channels: ['slack', 'email', 'webhook']
      },
      {
        name: 'low_memory',
        condition: (metrics) => {
          const recent = metrics.filter(m => 
            m.name === 'memory_usage' && 
            m.timestamp > Date.now() - 60000
          )
          const latest = recent[recent.length - 1]
          return latest && latest.value > 90 // Alert if memory > 90%
        },
        threshold: 90,
        severity: 'critical',
        cooldownMs: 120000, // 2 minutes
        channels: ['slack', 'email', 'webhook']
      }
    ]

    alertConfigs.forEach(config => {
      const lastAlert = this.alerts.get(config.name) || 0
      const now = Date.now()
      
      // Check if alert is in cooldown
      if (now - lastAlert < config.cooldownMs) {
        return
      }
      
      // Check alert condition
      if (config.condition(this.metrics)) {
        this.triggerAlert(config)
        this.alerts.set(config.name, now)
      }
    })
  }

  private async triggerAlert(config: AlertConfig): Promise<void> {
    const alert = {
      name: config.name,
      severity: config.severity,
      threshold: config.threshold,
      timestamp: Date.now(),
      details: `Alert triggered: ${config.name}`
    }

    console.warn(`[Alert] ${config.severity.toUpperCase()}: ${config.name}`, alert)

    // Send to configured channels
    const promises = config.channels.map(async channel => {
      try {
        switch (channel) {
          case 'slack':
            await this.sendSlackAlert(alert)
            break
          case 'email':
            await this.sendEmailAlert(alert)
            break
          case 'webhook':
            await this.sendWebhookAlert(alert)
            break
        }
      } catch (error) {
        console.error(`[Alert] Failed to send ${channel} alert:`, error)
      }
    })

    await Promise.allSettled(promises)
  }

  private async sendSlackAlert(alert: any): Promise<void> {
    if (!process.env.ERROR_WEBHOOK_URL) return

    const color = {
      low: '#36a64f',
      medium: '#ff9900',
      high: '#ff0000',
      critical: '#8b0000'
    }[alert.severity] || '#666666'

    const payload = {
      attachments: [
        {
          color,
          title: `🚨 BuildTrack Alert: ${alert.name}`,
          text: alert.details,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Time',
              value: new Date(alert.timestamp).toISOString(),
              short: true
            }
          ],
          timestamp: Math.floor(alert.timestamp / 1000)
        }
      ]
    }

    await fetch(process.env.ERROR_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  }

  private async sendEmailAlert(alert: any): Promise<void> {
    if (!process.env.ADMIN_EMAIL || !process.env.SMTP_HOST) return

    // Email implementation would go here
    // For now, just log
    console.log(`[Alert] Would send email to ${process.env.ADMIN_EMAIL}:`, alert)
  }

  private async sendWebhookAlert(alert: any): Promise<void> {
    if (!process.env.ERROR_WEBHOOK_URL) return

    await fetch(process.env.ERROR_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'alert',
        data: alert
      }),
    })
  }

  // Performance monitoring middleware
  performanceMiddleware() {
    return async (req: NextRequest, handler: () => Promise<Response>): Promise<Response> => {
      const startTime = Date.now()
      const startMemory = process.memoryUsage().heapUsed
      
      let response: Response
      let error: Error | null = null
      
      try {
        response = await handler()
      } catch (e) {
        error = e as Error
        response = new Response('Internal Server Error', { status: 500 })
      }
      
      const endTime = Date.now()
      const responseTime = endTime - startTime
      const endMemory = process.memoryUsage().heapUsed
      const memoryDelta = endMemory - startMemory
      
      // Record metrics
      this.recordMetric({
        name: 'response_time',
        value: responseTime,
        unit: 'ms',
        tags: {
          method: req.method,
          path: new URL(req.url).pathname,
          status: response.status.toString()
        }
      })
      
      this.recordMetric({
        name: 'memory_delta',
        value: memoryDelta / 1024 / 1024, // Convert to MB
        unit: 'mb',
        tags: {
          method: req.method,
          path: new URL(req.url).pathname
        }
      })
      
      if (error) {
        this.recordMetric({
          name: 'error_rate',
          value: 100,
          unit: 'percent',
          tags: {
            method: req.method,
            path: new URL(req.url).pathname,
            error: error.name
          }
        })
      }
      
      this.recordMetric({
        name: 'throughput',
        value: 1,
        unit: 'requests',
        tags: {
          method: req.method,
          status: response.status.toString()
        }
      })
      
      return response
    }
  }

  // Export metrics for external systems
  exportMetrics(): {
    metrics: MetricData[]
    health: SystemHealth
    summary: Record<string, any>
  } {
    const health = this.checkSystemHealth()
    
    const summary = {
      total_requests: this.getAggregateMetrics('throughput').count,
      avg_response_time: this.getAggregateMetrics('response_time').avg,
      error_rate: this.getAggregateMetrics('error_rate').avg,
      uptime: Date.now() - this.startTime,
      memory_usage: process.memoryUsage().heapUsed / 1024 / 1024
    }
    
    return {
      metrics: this.metrics,
      health: health as SystemHealth,
      summary
    }
  }
}

// Singleton instance
let monitoringInstance: MonitoringService | null = null

export function getMonitoring(): MonitoringService {
  if (!monitoringInstance) {
    monitoringInstance = new MonitoringService()
  }
  return monitoringInstance
}

// Helper function to record metrics from anywhere
export function recordMetric(name: string, value: number, options?: {
  unit?: string
  tags?: Record<string, string>
  metadata?: Record<string, any>
}): void {
  const monitoring = getMonitoring()
  monitoring.recordMetric({
    name,
    value,
    ...options
  })
}

// Helper for timing operations
export function timeOperation<T>(
  name: string,
  operation: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const start = Date.now()
  
  return operation().finally(() => {
    const duration = Date.now() - start
    recordMetric(name, duration, {
      unit: 'ms',
      tags
    })
  })
}

export { MonitoringService }
export default getMonitoring